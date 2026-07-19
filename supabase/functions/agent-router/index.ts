import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

// Supports Groq (OpenAI-compatible) or OpenAI depending on env vars.
// Set GROQ_API_KEY to use Groq; fallback to OPENAI_API_KEY for OpenAI.
function createLLMClient(): { client: OpenAI; model: string } {
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    return {
      client: new OpenAI({
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: Deno.env.get("AI_MODEL") || "llama-3.3-70b-versatile",
    };
  }
  return {
    client: new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") }),
    model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { business_id, message, conversation_id, visitor_id, conversation_history = [] } = await req.json();

    if (!business_id || !message || !visitor_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch business + brand settings
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", business_id)
      .single();

    const { data: brand } = await supabase
      .from("brand_settings")
      .select("*")
      .eq("business_id", business_id)
      .single();

    const { data: agentConfigs } = await supabase
      .from("agent_configs")
      .select("*")
      .eq("business_id", business_id)
      .eq("enabled", true);

    const enabledAgents = agentConfigs?.map((a: { agent_type: string }) => a.agent_type) || [
      "knowledge", "appointment", "qualification", "pricing", "escalation",
    ];

    // Detect intent via LLM
    const { client: openai, model: llmModel } = createLLMClient();

    const intentResponse = await openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: "system",
          content: `You are an intent classifier for an AI sales assistant.
Available agents: ${enabledAgents.join(", ")}.
Classify the user message into exactly one agent type.
Respond with ONLY the agent name, nothing else.

Rules:
- knowledge: questions about business, products, FAQs, general info
- appointment: booking, scheduling, rescheduling, canceling meetings
- qualification: budget, requirements, lead info gathering
- pricing: costs, quotes, discounts, pricing plans
- escalation: complaints, anger, explicit human request, complex issues`,
        },
        { role: "user", content: message },
      ],
      temperature: 0,
      max_tokens: 20,
    });

    const detectedAgent = intentResponse.choices[0]?.message?.content?.trim().toLowerCase() || "knowledge";
    const agent = enabledAgents.includes(detectedAgent) ? detectedAgent : "knowledge";

    // Upsert chat session
    let chatId = conversation_id;
    if (!chatId) {
      const { data: newChat } = await supabase
        .from("chats")
        .insert({
          business_id,
          visitor_id,
          current_agent: agent,
          status: "active",
        })
        .select()
        .single();
      chatId = newChat?.id;
    } else {
      await supabase
        .from("chats")
        .update({ current_agent: agent, updated_at: new Date().toISOString() })
        .eq("id", chatId);
    }

    // Store user message
    await supabase.from("chat_messages").insert({
      chat_id: chatId,
      business_id,
      role: "user",
      content: message,
      agent_type: agent,
    });

    // Track analytics
    await supabase.from("analytics_events").insert({
      business_id,
      event_type: "message_received",
      agent_type: agent,
      chat_id: chatId,
      visitor_id,
    });

    return new Response(
      JSON.stringify({
        agent,
        chat_id: chatId,
        business_name: business?.business_name || "Business",
        personality: brand?.personality || "professional",
        bot_name: brand?.bot_name || "Sales Assistant",
        primary_color: brand?.primary_color || "#6366f1",
        greeting: brand?.greeting_message || "Hello! How can I help you today?",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("agent-router error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
