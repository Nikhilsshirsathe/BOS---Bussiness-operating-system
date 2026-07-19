"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen, Upload, FileText, Link, Loader2, Trash2, Check,
  Sparkles, ExternalLink, Globe, File, AlertCircle,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  document_type: string;
  document_url: string | null;
  file_size: number | null;
  status: string;
  chunk_count: number;
  created_at: string;
}

export default function KnowledgePage() {
  const { business, fetchBusiness } = useAppStore();
  const supabase = createClient();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [stats, setStats] = useState({ total_docs: 0, total_chunks: 0 });

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    if (!business?.id) return;
    loadData();
  }, [business?.id]);

  const loadData = async () => {
    if (!business?.id) return;
    setLoading(true);

    const { data: docs } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    const { count: totalChunks } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id);

    setDocuments((docs || []) as Document[]);
    setStats({
      total_docs: docs?.length || 0,
      total_chunks: totalChunks || 0,
    });
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("business_id", business.id);
    formData.append("title", file.name);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (result.success) {
        loadData();
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
    setUploading(false);
  };

  const handleWebsiteScrape = async () => {
    if (!websiteUrl || !business?.id) return;
    setUploading(true);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: business.id,
        title: websiteUrl,
        url: websiteUrl,
        type: "website",
      }),
    });

    const result = await res.json();
    if (result.success) {
      loadData();
      setWebsiteUrl("");
      setShowUrlInput(false);
    }
    setUploading(false);
  };

  const deleteDocument = async (id: string) => {
    await supabase.from("knowledge_documents").delete().eq("id", id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    loadData();
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case "pdf": return <FileText size={20} />;
      case "docx": return <FileText size={20} />;
      case "txt": return <File size={20} />;
      case "website": return <Globe size={20} />;
      default: return <File size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">Teach your AI about your business</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowUrlInput(!showUrlInput)}>
            <Link size={16} className="mr-2" /> Add Website
          </Button>
          <label className="cursor-pointer">
            <Button asChild disabled={uploading}>
              <span>
                {uploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
                {uploading ? "Uploading..." : "Upload Documents"}
              </span>
            </Button>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50">
              <BookOpen size={18} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_docs}</p>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <Sparkles size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total_chunks.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Knowledge Chunks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/50">
              <Check size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{documents.filter((d) => d.status === "indexed").length}</p>
              <p className="text-xs text-muted-foreground">Ready for AI</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* URL Input */}
      {showUrlInput && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://example.com"
              />
              <Button onClick={handleWebsiteScrape} disabled={uploading || !websiteUrl}>
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} className="mr-2" />}
                Fetch
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your website URL to automatically import content into the AI knowledge base
            </p>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen size={16} className="text-primary" /> Your Knowledge Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      {getDocIcon(doc.document_type)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.document_type.toUpperCase()} · {doc.chunk_count} chunks
                        {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                        · {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      doc.status === "indexed" ? "bg-green-50 dark:bg-green-950/50 text-green-600" :
                      doc.status === "processing" ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600" :
                      "bg-red-50 dark:bg-red-950/50 text-red-600"
                    }`}>
                      {doc.status}
                    </span>
                    {doc.document_url && (
                      <a href={doc.document_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <button onClick={() => deleteDocument(doc.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium mb-1">Teach your AI about your business</p>
              <p className="text-sm mb-6">
                Upload PDFs, DOCX files, product catalogs, or add your website URL.
                The AI will learn from these documents and answer customer questions accurately.
              </p>
              <div className="flex justify-center gap-4">
                <label className="cursor-pointer">
                  <Button variant="outline">
                    <Upload size={16} className="mr-2" /> Upload Files
                  </Button>
                  <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleFileUpload} />
                </label>
                <Button variant="outline" onClick={() => setShowUrlInput(true)}>
                  <Link size={16} className="mr-2" /> Add Website
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported Formats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle size={16} className="text-primary" /> Supported Formats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: FileText, label: "PDF Documents", desc: "Scanned docs, reports, catalogs" },
              { icon: FileText, label: "DOCX Files", desc: "Word documents, proposals" },
              { icon: File, label: "Text Files", desc: "Plain text, markdown" },
              { icon: Globe, label: "Website URLs", desc: "Import content from your site" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg border text-center">
                <item.icon size={20} className="mx-auto mb-1 text-primary" />
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}