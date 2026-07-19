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
    const { business_id, customer_name, requirements, conversation_history = [], discount_code } = await req.json();

    if (!business_id) {
      return new Response(JSON.stringify({ error: "Missing business_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { client: openai, model: llmModel } = createLLMClient();

    // Fetch products and pricing
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", business_id)
      .eq("is_active", true);

    const { data: plans } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("business_id", business_id)
      .eq("is_active", true);

    // Check discount
    let discountAmount = 0;
    let discountInfo = null;
    if (discount_code) {
      const { data: discount } = await supabase
        .from("discounts")
        .select("*")
        .eq("business_id", business_id)
        .eq("code", discount_code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (discount) {
        const now = new Date();
        if (!discount.valid_until || new Date(discount.valid_until) > now) {
          if (discount.current_uses < discount.max_uses) {
            discountInfo = discount;
          }
        }
      }
    }

    const conversationText = conversation_history
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    const productList = [...(products || []), ...(plans || [])]
      .map((p: { name: string; pricing?: number; price?: number; description?: string }) =>
        `- ${p.name}: $${p.pricing || p.price || 0} - ${p.description || ""}`
      ).join("\n");

    const response = await openai.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: "system",
          content: `You are a pricing expert. Based on the customer's requirements and available products, generate a tailored quote.
Return a JSON object:
{
  "recommended_items": [{"name": string, "price": number, "reason": string}],
  "subtotal": number,
  "total": number,
  "message": string,
  "validity_days": 30
}`,
        },
        {
          role: "user",
          content: `Customer: ${customer_name || "Unknown"}
Requirements: ${requirements || "General inquiry"}
Conversation: ${conversationText}

Available products:\n${productList || "No products configured yet."}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const quoteData = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Apply discount
    if (discountInfo) {
      if (discountInfo.type === "percentage") {
        discountAmount = (quoteData.subtotal || 0) * (discountInfo.value / 100);
      } else {
        discountAmount = discountInfo.value;
      }
      quoteData.total = Math.max(0, (quoteData.subtotal || 0) - discountAmount);
      quoteData.discount_applied = discountInfo.value;
      quoteData.discount_type = discountInfo.type;

      // Increment discount usage
      await supabase
        .from("discounts")
        .update({ current_uses: (discountInfo.current_uses || 0) + 1 })
        .eq("id", discountInfo.id);
    }

    const quoteId = `Q-${Date.now().toString(36).toUpperCase()}`;

    return new Response(
      JSON.stringify({ quote_id: quoteId, ...quoteData, generated_at: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("quote-generation error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
