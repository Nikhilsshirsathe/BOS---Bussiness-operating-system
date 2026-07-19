"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, RefreshCw, ExternalLink, Eye, Smartphone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LivePhonePreviewProps {
  reloadKey?: number;
  label?: string;
  sublabel?: string;
  emptyMessage?: string;
  sticky?: boolean;
}

export function LivePhonePreview({
  reloadKey = 0,
  label = "Live Preview",
  sublabel,
  emptyMessage = "Set up your business slug in Settings to see a live preview here",
  sticky = false,
}: LivePhonePreviewProps) {
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(false);
  const prevReloadKey = useRef(reloadKey);

  const fetchUrl = useCallback(async (): Promise<{ url: string | null; err: string | null }> => {
    try {
      const supabase = createClient();

      // 1. Get current user
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) return { url: null, err: `Auth error: ${authErr?.message || "no user"}` };

      // 2. Get business — select only columns that exist in the initial schema
      //    slug was added later; fall back gracefully if it's null
      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("id, business_name, slug:slug")
        .eq("owner_id", user.id)
        .single();

      if (bizErr) {
        // slug column might not exist yet — retry without it
        const { data: biz2, error: bizErr2 } = await supabase
          .from("businesses")
          .select("id, business_name")
          .eq("owner_id", user.id)
          .single();
        if (bizErr2 || !biz2) return { url: null, err: `DB error: ${bizErr2?.message || bizErr.message}` };
        // Generate a slug from business name
        const autoSlug = biz2.business_name
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
        return { url: `${window.location.origin}/b/${autoSlug}`, err: null };
      }

      if (!biz) return { url: null, err: "No business found for this user" };

      // Use slug if set, otherwise auto-generate from business name
      const slug = biz.slug || biz.business_name
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

      const url = `${window.location.origin}/b/${slug}`;
      return { url, err: null };
    } catch (e: any) {
      return { url: null, err: e?.message || "Unknown error" };
    }
  }, []);

  const loadPreview = useCallback(async () => {
    setError(null);
    const { url, err } = await fetchUrl();
    setPublicUrl(url);
    setError(err);
    setReady(true);
    if (url) {
      setIframeLoading(true);
      setIframeKey((k) => k + 1);
    }
  }, [fetchUrl]);

  // Initial load
  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  // Reload when parent increments reloadKey
  useEffect(() => {
    if (reloadKey === prevReloadKey.current) return;
    prevReloadKey.current = reloadKey;
    loadPreview();
  }, [reloadKey, loadPreview]);

  const wrapperClass = [
    "space-y-3",
    sticky ? "xl:sticky xl:top-6 xl:self-start" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <Eye size={15} className="text-primary" />
        <span className="text-sm font-semibold">{label}</span>
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={loadPreview} title="Reload preview">
            <RefreshCw size={13} />
          </Button>
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="h-7 px-2" title="Open in new tab">
                <ExternalLink size={13} />
              </Button>
            </a>
          )}
        </div>
        {/* Show resolved URL for confirmation */}
        {publicUrl && (
          <span className="w-full text-[10px] font-mono text-primary truncate">{publicUrl}</span>
        )}
      </div>

      {/* Phone frame */}
      <div className="relative mx-auto w-[300px]">
        <div className="rounded-[3rem] border-[8px] border-foreground/15 bg-foreground/10 shadow-2xl overflow-hidden">

          {/* Notch */}
          <div className="relative bg-foreground/10 h-7 flex items-center justify-center">
            <div className="w-24 h-4 rounded-full bg-foreground/20" />
            <div className="absolute right-4 flex gap-1 items-center">
              <div className="w-3 h-1.5 rounded-sm bg-foreground/30" />
              <div className="w-1 h-1 rounded-full bg-foreground/30" />
            </div>
          </div>

          {/* Screen */}
          <div className="relative bg-background overflow-hidden" style={{ height: 600 }}>
            {!ready ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 bg-muted/30">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading preview…</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
                <AlertCircle size={36} className="text-amber-500 opacity-70" />
                <p className="text-sm font-medium">Preview unavailable</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button size="sm" variant="outline" onClick={loadPreview} className="mt-2">
                  <RefreshCw size={12} className="mr-1.5" /> Retry
                </Button>
              </div>
            ) : publicUrl ? (
              <>
                {iframeLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading your page…</p>
                  </div>
                )}
                <iframe
                  key={iframeKey}
                  src={publicUrl}
                  className="w-full h-full border-0"
                  title="Live business page preview"
                  onLoad={() => setIframeLoading(false)}
                  allow="microphone"
                  style={{ display: "block" }}
                />
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 bg-muted/30 p-8 text-center">
                <Smartphone size={40} className="text-muted-foreground opacity-30" />
                <p className="text-sm font-medium">No public page yet</p>
                <p className="text-xs text-muted-foreground">{emptyMessage}</p>
              </div>
            )}
          </div>

          {/* Home bar */}
          <div className="bg-foreground/10 h-6 flex items-center justify-center">
            <div className="w-20 h-1 rounded-full bg-foreground/30" />
          </div>
        </div>

        {/* Side buttons */}
        <div className="absolute left-[-13px] top-24 w-1.5 h-8 rounded-l-full bg-foreground/20" />
        <div className="absolute left-[-13px] top-36 w-1.5 h-8 rounded-l-full bg-foreground/20" />
        <div className="absolute right-[-13px] top-28 w-1.5 h-12 rounded-r-full bg-foreground/20" />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Fully interactive · reloads after save
      </p>
    </div>
  );
}
