import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { business_id, chat_id, customer_name, customer_email, issue_description, priority = "medium", conversation_history = [] } = await req.json();

    if (!business_id || !customer_name || !customer_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    // Get escalation rules
    const { data: rules } = await supabase
      .from("escalation_rules")
      .select("*")
      .eq("business_id", business_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    const primaryRule = rules?.[0];

    // Generate AI summary of the conversation for the ticket
    const conversationText = conversation_history
      .filter((m: { role: string }) => m.role !== "system")
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "Customer" : "AI"}: ${m.content}`)
      .join("\n");

    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Create a concise support ticket summary. Return plain text, 2-3 sentences max.",
        },
        {
          role: "user",
          content: `Issue: ${issue_description}\n\nConversation:\n${conversationText || "(No prior conversation)"}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const summary = summaryResponse.choices[0]?.message?.content || issue_description;

    // Create support ticket
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        business_id,
        chat_id: chat_id || null,
        customer_name,
        customer_email,
        department: primaryRule?.department || "Support",
        priority,
        status: "open",
        summary,
        conversation_snapshot: conversation_history,
      })
      .select()
      .single();

    if (error) throw new Error(`Ticket creation failed: ${error.message}`);

    // Update chat status
    if (chat_id) {
      await supabase
        .from("chats")
        .update({ status: "escalated", is_active: false })
        .eq("id", chat_id);
    }

    // Track analytics
    await supabase.from("analytics_events").insert({
      business_id,
      event_type: "escalation_triggered",
      agent_type: "escalation",
      chat_id: chat_id || null,
      metadata: { ticket_id: ticket.id, priority },
    });

    return new Response(
      JSON.stringify({
        success: true,
        ticket,
        contact_email: primaryRule?.contact_email || null,
        message: `Your request has been escalated. Ticket #${ticket.id.slice(0, 8).toUpperCase()} created. Our team will contact you at ${customer_email} shortly.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("human-escalation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
