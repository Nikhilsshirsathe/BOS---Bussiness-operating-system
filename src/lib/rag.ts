import { aiProvider } from "./ai-provider";
import { getServiceSupabase } from "./supabase";
import { SourceCitation } from "@/types";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }
  return chunks;
}

export async function indexDocument(
  businessId: string,
  documentId: string,
  content: string,
  metadata?: Record<string, unknown>
): Promise<number> {
  const supabase = getServiceSupabase();
  const chunks = chunkText(content);
  const chunkRecords: Record<string, unknown>[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    if (chunk.length < 20) continue; // skip tiny chunks
    const embedding = await aiProvider.generateEmbedding(chunk);
    chunkRecords.push({
      business_id: businessId,
      document_id: documentId,
      content: chunk,
      embedding,
      chunk_index: i,
      metadata: metadata || {},
    });
  }

  const batchSize = 20;
  for (let i = 0; i < chunkRecords.length; i += batchSize) {
    const batch = chunkRecords.slice(i, i + batchSize);
    const { error } = await supabase.from("knowledge_chunks").insert(batch);
    if (error) throw new Error(`Failed to insert chunks: ${error.message}`);
  }

  return chunkRecords.length;
}

export async function semanticSearch(
  businessId: string,
  query: string,
  topK = 5,
  confidenceThreshold = 0.3   // lower default so we always get results if docs exist
): Promise<{
  chunks: { id: string; document_id: string; business_id: string; content: string; embedding: number[]; metadata: Record<string, unknown>; created_at: string }[];
  combinedContext: string;
  sources: SourceCitation[];
  confidence: number;
}> {
  const supabase = getServiceSupabase();

  let queryEmbedding: number[];
  try {
    queryEmbedding = await aiProvider.generateEmbedding(query);
  } catch (e) {
    console.error("Embedding generation failed:", e);
    return { chunks: [], combinedContext: "", sources: [], confidence: 0 };
  }

  const { data: chunks, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: confidenceThreshold,
    match_count: topK,
    p_business_id: businessId,
  });

  if (error) {
    console.error("Semantic search error:", error);
    return { chunks: [], combinedContext: "", sources: [], confidence: 0 };
  }

  if (!chunks || chunks.length === 0) {
    return { chunks: [], combinedContext: "", sources: [], confidence: 0 };
  }

  // Fetch document titles for source attribution
  const docIds = [...new Set((chunks as any[]).map((c: any) => c.document_id))];
  const { data: docs } = await supabase
    .from("knowledge_documents")
    .select("id, title")
    .in("id", docIds);
  const docTitleMap = Object.fromEntries((docs ?? []).map((d: any) => [d.id, d.title]));

  const matchedChunks = (chunks as any[]).map((c: any) => ({
    id: c.id as string,
    document_id: c.document_id as string,
    business_id: c.business_id as string,
    content: c.content as string,
    embedding: c.embedding as number[],
    metadata: (c.metadata as Record<string, unknown>) || {},
    created_at: c.created_at as string,
    similarity: c.similarity as number,
  }));

  const sources: SourceCitation[] = matchedChunks.map((chunk) => ({
    document_title: docTitleMap[chunk.document_id] || (chunk.metadata?.title as string) || "Knowledge Base",
    content: chunk.content.slice(0, 300),
    confidence: chunk.similarity ?? 0.7,
  }));

  const combinedContext = matchedChunks.map((c) => c.content).join("\n\n---\n\n");
  const confidence = matchedChunks.length > 0
    ? matchedChunks.reduce((sum, c) => sum + (c.similarity ?? 0), 0) / matchedChunks.length
    : 0;

  return { chunks: matchedChunks, combinedContext, sources, confidence };
}

export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const supabase = getServiceSupabase();
  const { error } = await supabase.from("knowledge_chunks").delete().eq("document_id", documentId);
  if (error) throw new Error(`Failed to delete chunks: ${error.message}`);
}

export async function getDocumentStats(businessId: string) {
  const supabase = getServiceSupabase();
  const { count: totalDocuments } = await supabase
    .from("knowledge_documents")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId);

  const { count: totalChunks } = await supabase
    .from("knowledge_chunks")
    .select("*", { count: "exact", head: true })
    .eq("business_id", businessId);

  return {
    total_documents: totalDocuments || 0,
    total_chunks: totalChunks || 0,
  };
}
