"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import {
  BookOpen, Upload, FileText, Link, Loader2, Trash2, Check,
  Sparkles, ExternalLink, Globe, File, AlertCircle, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const [documents, setDocuments]     = useState<Document[]>([]);
  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [websiteUrl, setWebsiteUrl]   = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [stats, setStats]             = useState({ total_docs: 0, total_chunks: 0 });

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);
  useEffect(() => { if (business?.id) loadData(); }, [business?.id]);

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
    setStats({ total_docs: docs?.length ?? 0, total_chunks: totalChunks ?? 0 });
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
      if (result.success) loadData();
    } catch (err) { console.error("Upload error:", err); }
    setUploading(false);
  };

  const handleWebsiteScrape = async () => {
    if (!websiteUrl || !business?.id) return;
    setUploading(true);
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ business_id: business.id, title: websiteUrl, url: websiteUrl, type: "website" }),
    });
    const result = await res.json();
    if (result.success) { loadData(); setWebsiteUrl(""); setShowUrlInput(false); }
    setUploading(false);
  };

  const deleteDocument = async (id: string) => {
    await supabase.from("knowledge_documents").delete().eq("id", id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    loadData();
  };

  const getDocIcon = (type: string) => {
    const cls = "shrink-0";
    switch (type) {
      case "pdf":     return <FileText size={16} className={cn(cls, "text-rose-500")} />;
      case "docx":    return <FileText size={16} className={cn(cls, "text-blue-500")} />;
      case "txt":     return <File     size={16} className={cn(cls, "text-slate-500")} />;
      case "website": return <Globe    size={16} className={cn(cls, "text-emerald-500")} />;
      default:        return <File     size={16} className={cn(cls, "text-slate-400")} />;
    }
  };

  const getDocBg = (type: string) => {
    switch (type) {
      case "pdf":     return "bg-rose-50 border-rose-100";
      case "docx":    return "bg-blue-50 border-blue-100";
      case "txt":     return "bg-slate-50 border-slate-100";
      case "website": return "bg-emerald-50 border-emerald-100";
      default:        return "bg-slate-50 border-slate-100";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
          <p className="text-sm text-muted-foreground">Loading knowledge base…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">

      {/* ── Page header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <BookOpen size={18} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Teach your AI about your business</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowUrlInput(v => !v)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-medium border transition-all duration-200",
              showUrlInput
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-white border-border text-foreground hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
            )}
          >
            <Link size={14} /> Add Website
          </button>
          <label className="cursor-pointer">
            <span className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-bold text-white transition-all duration-200 cursor-pointer",
              "bos-gradient shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02]",
              uploading && "opacity-70 pointer-events-none"
            )}>
              {uploading
                ? <><Loader2 size={14} className="animate-spin" /> Uploading…</>
                : <><Upload size={14} /> Upload Documents</>
              }
            </span>
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

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: BookOpen, label: "Documents", value: stats.total_docs,
            iconBg: "bg-indigo-50 border-indigo-100", iconColor: "text-indigo-500",
            valueBg: "from-indigo-50 to-violet-50 border-indigo-100/60",
          },
          {
            icon: Sparkles, label: "Knowledge Chunks", value: stats.total_chunks.toLocaleString(),
            iconBg: "bg-blue-50 border-blue-100", iconColor: "text-blue-500",
            valueBg: "from-blue-50 to-sky-50 border-blue-100/60",
          },
          {
            icon: Check, label: "Ready for AI", value: documents.filter(d => d.status === "indexed").length,
            iconBg: "bg-emerald-50 border-emerald-100", iconColor: "text-emerald-500",
            valueBg: "from-emerald-50 to-teal-50 border-emerald-100/60",
          },
        ].map(stat => (
          <div key={stat.label} className={cn(
            "flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br border",
            stat.valueBg
          )}>
            <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", stat.iconBg)}>
              <stat.icon size={18} className={stat.iconColor} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground leading-none">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── URL input panel ───────────────────────────────────── */}
      {showUrlInput && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Globe size={14} className="text-indigo-500" /> Import from Website
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={websiteUrl}
              onChange={e => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              className={cn(
                "flex-1 px-4 py-2.5 rounded-[12px] text-sm border bg-white",
                "border-indigo-200 placeholder:text-muted-foreground/40",
                "focus:outline-none focus:ring-2 focus:ring-indigo-300/50 focus:border-indigo-300",
                "transition-all duration-200"
              )}
            />
            <button
              onClick={handleWebsiteScrape}
              disabled={uploading || !websiteUrl}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-sm font-semibold text-white bos-gradient disabled:opacity-50 transition-all duration-200"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              Fetch
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            We'll crawl your website and extract content for the AI knowledge base.
          </p>
        </div>
      )}

      {/* ── Documents list ────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white shadow-bos-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-foreground">Your Knowledge Documents</h2>
          </div>
          {documents.length > 0 && (
            <span className="text-xs text-muted-foreground">{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {documents.length > 0 ? (
          <div className="divide-y divide-border">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/70 transition-colors group">
                {/* Icon */}
                <div className={cn(
                  "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                  getDocBg(doc.document_type)
                )}>
                  {getDocIcon(doc.document_type)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {doc.document_type.toUpperCase()}
                    {doc.chunk_count > 0 && ` · ${doc.chunk_count} chunks`}
                    {doc.file_size ? ` · ${(doc.file_size / 1024).toFixed(0)} KB` : ""}
                    {` · ${new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                  </p>
                </div>

                {/* Status badge */}
                <span className={cn(
                  "shrink-0 text-xs px-2.5 py-1 rounded-full font-medium",
                  doc.status === "indexed"    && "bg-emerald-50 text-emerald-600 border border-emerald-100",
                  doc.status === "processing" && "bg-amber-50 text-amber-600 border border-amber-100",
                  doc.status === "failed"     && "bg-red-50 text-red-600 border border-red-100",
                  !["indexed","processing","failed"].includes(doc.status) && "bg-slate-100 text-slate-500 border border-slate-200"
                )}>
                  {doc.status}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.document_url && (
                    <a
                      href={doc.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
              <BookOpen size={28} className="text-indigo-300" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">No documents yet</p>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Upload PDFs, DOCX files, or add your website URL — the AI will learn from these and answer customer questions accurately.
            </p>
            <div className="flex gap-3">
              <label className="cursor-pointer">
                <span className="flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold text-white bos-gradient shadow-md shadow-indigo-500/20 cursor-pointer transition-all hover:scale-[1.02]">
                  <Upload size={14} /> Upload Files
                </span>
                <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleFileUpload} />
              </label>
              <button
                onClick={() => setShowUrlInput(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-medium border border-border bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
              >
                <Link size={14} /> Add Website
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Supported formats ─────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white shadow-bos-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <AlertCircle size={15} className="text-indigo-500" />
          <h2 className="text-sm font-semibold text-foreground">Supported Formats</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-border">
          {[
            { icon: FileText, label: "PDF Documents",  desc: "Scanned docs, reports, catalogs", color: "text-rose-500",    bg: "bg-rose-50"   },
            { icon: FileText, label: "DOCX Files",     desc: "Word documents, proposals",      color: "text-blue-500",    bg: "bg-blue-50"   },
            { icon: File,     label: "Text Files",     desc: "Plain text, markdown",           color: "text-slate-500",   bg: "bg-slate-50"  },
            { icon: Globe,    label: "Website URLs",   desc: "Import content from your site",  color: "text-emerald-500", bg: "bg-emerald-50"},
          ].map(fmt => (
            <div key={fmt.label} className="flex flex-col items-center justify-center gap-2 p-5 text-center hover:bg-slate-50/70 transition-colors">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", fmt.bg)}>
                <fmt.icon size={16} className={fmt.color} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{fmt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
