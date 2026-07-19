import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

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
    const { chat_id, business_id } = await req.json();

    if (!chat_id || !business_id) {
      return new Response(JSON.stringify({ error: "Missing chat_id or business_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { client: openai, model: llmModel } = createLLMClient();

    // Fetch all messages for this chat
    const { data: messages, error } = await supabase
      .from("chat_messages")
      .select("role, content, agent_type, created_at")
      .eq("chat_id", chat_id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ summary: "No messages found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversationText = messages
      .filter((m: { role: string }) => m.role !== "system")
      .map((m: { role: string; content: string; agent_type?: string }) =>
        `[${m.role === "user" ? "Customer" : `AI (${m.agent_type || "assistant"})`}]: ${m.content}`
      )
      .join("\n");

    const response = await openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: "system",
          content: `Summarize this customer conversation for a sales team handoff.
Return a JSON object:
{
  "summary": string (2-3 sentences),
  "customer_intent": string,
  "key_points": string[],
  "action_items": string[],
  "sentiment": "positive"|"neutral"|"negative",
  "next_steps": string,
  "agents_used": string[]
}`,
        },
        { role: "user", content: conversationText },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const summary = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Update chat with summary
    await supabase
      .from("chats")
      .update({ summary: summary.summary, status: "resolved" })
      .eq("id", chat_id);

    return new Response(
      JSON.stringify({ success: true, chat_id, ...summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("conversation-summarization error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
