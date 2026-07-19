"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingData {
  business_id?: string;
  [key: string]: unknown;
}

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

interface UploadedFile {
  name: string;
  size: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function StepDocuments({ data, updateData }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !data.business_id) return;
    const newFiles = Array.from(files).filter(
      (f) => f.size < 20 * 1024 * 1024 && ["pdf", "docx", "txt"].includes(f.name.split(".").pop()?.toLowerCase() || "")
    );
    if (newFiles.length === 0) return;

    setUploading(true);
    const statuses: UploadedFile[] = newFiles.map((f) => ({ name: f.name, size: f.size, status: "uploading" as const }));
    setUploadedFiles((prev) => [...prev, ...statuses]);

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("business_id", data.business_id);
        formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const result = await res.json();

        setUploadedFiles((prev) =>
          prev.map((f, idx) =>
            idx === (prev.length - newFiles.length + i)
              ? { ...f, status: result.success ? "done" : "error", error: result.error }
              : f
          )
        );
      } catch {
        setUploadedFiles((prev) =>
          prev.map((f, idx) =>
            idx === (prev.length - newFiles.length + i) ? { ...f, status: "error", error: "Upload failed" } : f
          )
        );
      }
    }
    setUploading(false);
  };

  const formatBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="space-y-4">
      {!data.business_id && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-700 dark:text-amber-300">
          Complete Step 1 first to enable document uploads.
        </div>
      )}

      <div
        className={cn("border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
          !data.business_id && "opacity-50 pointer-events-none"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-1">Drop files here or click to browse</p>
        <p className="text-sm text-muted-foreground">PDF, DOCX, TXT — max 20 MB each</p>
        <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <FileText size={18} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
              </div>
              {f.status === "uploading" && <Loader2 size={16} className="animate-spin text-primary shrink-0" />}
              {f.status === "done" && <Check size={16} className="text-green-500 shrink-0" />}
              {f.status === "error" && (
                <div className="flex items-center gap-1 text-destructive shrink-0">
                  <X size={14} />
                  <span className="text-xs">{f.error || "Failed"}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        You can skip this step and upload documents later from the Knowledge Base page.
      </p>
    </div>
  );
}
