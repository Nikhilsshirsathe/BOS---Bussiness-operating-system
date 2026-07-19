import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function extractTextFromHTML(html: string): Promise<string> {
  // Remove scripts, styles, navigation
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, 50000); // limit
}

function chunkText(text: string, size = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { business_id, url, max_pages = 5 } = await req.json();

    if (!business_id || !url) {
      return new Response(JSON.stringify({ error: "Missing business_id or url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

    // Fetch and parse the main page
    const response = await fetch(url, {
      headers: { "User-Agent": "SalesOS-Bot/1.0 (AI Sales Assistant Crawler)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch ${url}`);
    }

    const html = await response.text();
    const pageText = await extractTextFromHTML(html);

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        business_id,
        title: `Website: ${parsedUrl.hostname}`,
        document_url: url,
        document_type: "website",
        status: "processing",
      })
      .select()
      .single();

    if (docError) throw new Error(`Document creation failed: ${docError.message}`);

    // Chunk and embed
    const chunks = chunkText(pageText);
    let chunkCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i].trim();
      if (chunk.length < 50) continue;

      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
      });

      await supabase.from("knowledge_chunks").insert({
        business_id,
        document_id: doc.id,
        content: chunk,
        embedding: embeddingRes.data[0].embedding,
        chunk_index: i,
        metadata: { source_url: url, page_title: parsedUrl.hostname },
      });

      chunkCount++;
    }

    // Update document status
    await supabase
      .from("knowledge_documents")
      .update({ status: "indexed", chunk_count: chunkCount })
      .eq("id", doc.id);

    return new Response(
      JSON.stringify({ success: true, document_id: doc.id, chunks_created: chunkCount, url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("crawl-website error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
