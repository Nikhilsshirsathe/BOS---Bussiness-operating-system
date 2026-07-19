import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { indexDocument } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const businessId = formData.get("business_id") as string;
    const title = (formData.get("title") as string) || "Untitled Document";

    if (!file || !businessId) {
      return NextResponse.json({ success: false, error: "Missing file or business_id" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large (max 20 MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
    const allowedTypes = ["pdf", "docx", "txt", "md"];
    if (!allowedTypes.includes(ext)) {
      return NextResponse.json({ success: false, error: `Unsupported file type: .${ext}` }, { status: 400 });
    }

    // Use service role client — bypasses RLS for server-side operations
    const supabase = getServiceSupabase();

    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${businessId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("knowledge-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.warn("Storage upload warning:", uploadError.message);
      // Continue — storage is optional, indexing is the important part
    }

    const { data: publicUrlData } = supabase.storage
      .from("knowledge-documents")
      .getPublicUrl(filePath);

    // Create document record
    const { data: doc, error: docError } = await supabase
      .from("knowledge_documents")
      .insert({
        business_id: businessId,
        title,
        document_url: publicUrlData?.publicUrl || null,
        document_type: ext === "md" ? "txt" : ext,
        file_size: file.size,
        status: "processing",
        chunk_count: 0,
      })
      .select()
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { success: false, error: `Failed to create document record: ${docError?.message}` },
        { status: 500 }
      );
    }

    // Extract text content
    let textContent = "";
    try {
      if (ext === "txt" || ext === "md") {
        textContent = await file.text();
      } else if (ext === "pdf") {
        const { PDFParse } = await import("pdf-parse");
        const buffer = Buffer.from(fileBuffer);
        const pdfParser = new PDFParse({ data: buffer, verbosity: 0 });
        const pdfData = await pdfParser.getText();
        textContent = pdfData.text || "";
        const info = await pdfParser.getInfo();
        await supabase
          .from("knowledge_documents")
          .update({ page_count: info.total || 0 })
          .eq("id", doc.id);
      } else if (ext === "docx") {
        const { default: mammoth } = await import("mammoth");
        const buffer = Buffer.from(fileBuffer);
        const result = await mammoth.extractRawText({ buffer });
        textContent = result.value;
      }
    } catch (parseError) {
      console.error("Parse error:", parseError);
      try { textContent = await file.text(); } catch { textContent = ""; }
    }

    if (!textContent.trim()) {
      await supabase.from("knowledge_documents").update({ status: "failed" }).eq("id", doc.id);
      return NextResponse.json(
        { success: false, error: "Could not extract text from document" },
        { status: 422 }
      );
    }

    // Index with embeddings (rag.ts also uses service role internally)
    let chunkCount = 0;
    try {
      chunkCount = await indexDocument(businessId, doc.id, textContent, { title, source: "upload" });
      await supabase
        .from("knowledge_documents")
        .update({ status: "indexed", chunk_count: chunkCount })
        .eq("id", doc.id);
    } catch (indexError) {
      console.error("Indexing error:", indexError);
      await supabase.from("knowledge_documents").update({ status: "failed" }).eq("id", doc.id);
      return NextResponse.json(
        {
          success: false,
          error: "Document uploaded but indexing failed. Check your OPENAI_API_KEY in .env.local.",
          document_id: doc.id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, document_id: doc.id, chunk_count: chunkCount, title });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
