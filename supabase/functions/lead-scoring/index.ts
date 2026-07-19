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
    const { business_id, chat_id, conversation_history, customer_info = {} } = await req.json();

    if (!business_id || !conversation_history) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { client: openai, model: llmModel } = createLLMClient();

    // Fetch custom scoring rules
    const { data: rules } = await supabase
      .from("lead_score_rules")
      .select("*")
      .eq("business_id", business_id)
      .eq("is_active", true);

    const conversationText = conversation_history
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    // Use LLM to extract lead data and score
    const response = await openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: "system",
          content: `Analyze this sales conversation and extract lead qualification data.
Return a JSON object with these exact fields:
{
  "score": <integer 0-100>,
  "status": <"hot"|"warm"|"cold">,
  "customer_name": <string or null>,
  "customer_email": <string or null>,
  "customer_phone": <string or null>,
  "budget_range": <string or null>,
  "industry": <string or null>,
  "requirements": <string summary or null>,
  "reasoning": <brief string explanation>
}

Scoring guide:
- 80-100 (hot): clear buying intent, specific requirements, defined budget, urgency
- 50-79 (warm): interested but exploring, no firm budget or timeline
- 0-49 (cold): just browsing, no clear need, price-sensitive without commitment

${rules && rules.length > 0 ? `Custom rules:\n${JSON.stringify(rules)}` : ""}`,
        },
        { role: "user", content: `Conversation:\n${conversationText}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const leadData = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Upsert lead record
    const leadPayload = {
      business_id,
      chat_id: chat_id || null,
      customer_name: leadData.customer_name || customer_info.name || "Unknown",
      customer_email: leadData.customer_email || customer_info.email || "unknown@unknown.com",
      customer_phone: leadData.customer_phone || customer_info.phone || null,
      score: leadData.score || 50,
      status: leadData.status || "warm",
      budget_range: leadData.budget_range || null,
      industry: leadData.industry || null,
      requirements: leadData.requirements || null,
      source: "chat",
      notes: leadData.reasoning || null,
    };

    const { data: lead, error } = await supabase
      .from("leads")
      .insert(leadPayload)
      .select()
      .single();

    if (error) throw new Error(`Lead creation failed: ${error.message}`);

    // Track analytics
    await supabase.from("analytics_events").insert({
      business_id,
      event_type: "lead_created",
      agent_type: "qualification",
      chat_id,
      metadata: { score: leadData.score, status: leadData.status },
    });

    return new Response(
      JSON.stringify({ lead, score: leadData.score, status: leadData.status, reasoning: leadData.reasoning }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("lead-scoring error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
