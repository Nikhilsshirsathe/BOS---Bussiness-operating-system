import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

// Groq does not provide an embeddings API.
// Embeddings always use OpenAI; completions use Groq if GROQ_API_KEY is set.
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

// Embeddings always use OpenAI (Groq has no embeddings API).
function createEmbeddingClient(): OpenAI {
  return new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { business_id, query, top_k = 5, threshold = 0.7, chat_id, conversation_history = [] } = await req.json();

    if (!business_id || !query) {
      return new Response(JSON.stringify({ error: "Missing business_id or query" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const embeddingClient = createEmbeddingClient();
    const { client: llmClient, model: llmModel } = createLLMClient();

    // 1. Generate embedding for the query (always uses OpenAI)
    const embeddingResponse = await embeddingClient.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Semantic search via pgvector
    const { data: chunks, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: top_k,
      p_business_id: business_id,
    });

    if (error) throw new Error(`Vector search failed: ${error.message}`);

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({ answer: null, sources: [], context: "", confidence: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch document titles for citations
    const docIds = [...new Set(chunks.map((c: { document_id: string }) => c.document_id))];
    const { data: documents } = await supabase
      .from("knowledge_documents")
      .select("id, title, document_type")
      .in("id", docIds);

    const docMap = Object.fromEntries(
      (documents || []).map((d: { id: string; title: string; document_type: string }) => [d.id, d])
    );

    // 4. Build context string
    const context = chunks
      .map((c: { content: string; document_id: string; similarity: number }) =>
        `[Source: ${docMap[c.document_id]?.title || "Document"}]\n${c.content}`
      )
      .join("\n\n---\n\n");

    // 5. Generate answer using context
    const historyMessages = conversation_history.slice(-6).map(
      (m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })
    );

    const completion = await llmClient.chat.completions.create({
      model: llmModel,
      messages: [
        {
          role: "system",
          content: `You are a helpful business assistant. Answer questions using ONLY the provided business information.
If the answer is not in the context, say "I don't have specific information about that, but I'd be happy to connect you with our team."
Always cite the source document when answering. Be concise and professional.`,
        },
        ...historyMessages,
        {
          role: "user",
          content: `Business Information:\n${context}\n\nQuestion: ${query}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const answer = completion.choices[0]?.message?.content || "";

    const sources = chunks.map((c: { document_id: string; content: string; similarity: number }) => ({
      document_title: docMap[c.document_id]?.title || "Document",
      content: c.content.slice(0, 200),
      confidence: Math.round(c.similarity * 100) / 100,
    }));

    const avgConfidence = chunks.reduce((sum: number, c: { similarity: number }) => sum + c.similarity, 0) / chunks.length;

    return new Response(
      JSON.stringify({ answer, sources, context, confidence: Math.round(avgConfidence * 100) / 100 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("rag-retrieval error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
