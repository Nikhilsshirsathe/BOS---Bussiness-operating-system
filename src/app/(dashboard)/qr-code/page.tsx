"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Copy, Check, ExternalLink, Download, Loader2, RefreshCw } from "lucide-react";
import { useAppStore } from "@/lib/store";

export default function QRCodePage() {
  const { business, fetchBusiness } = useAppStore();
  const [slug, setSlug]       = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [copied, setCopied]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [qrUrl, setQrUrl]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLImageElement>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";

  const load = useCallback(async () => {
    setLoading(true);
    await fetchBusiness();
    setLoading(false);
  }, [fetchBusiness]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (business?.slug) {
      setSlug(business.slug);
      setNewSlug(business.slug);
    } else if (business?.business_name) {
      const auto = business.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setNewSlug(auto);
    }
  }, [business]);

  const publicUrl = slug ? `${origin}/b/${slug}` : null;

  useEffect(() => {
    if (!publicUrl) return;
    // Use the QR Server API for QR code generation
    const encoded = encodeURIComponent(publicUrl);
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=300x300&margin=20`);
  }, [publicUrl]);

  const saveSlug = async () => {
    if (!business || !newSlug.trim()) return;
    const cleaned = newSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/--+/g, "-").replace(/^-|-$/g, "");
    if (!cleaned) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("businesses").update({ slug: cleaned }).eq("id", business.id);
    if (!error) {
      setSlug(cleaned);
      setNewSlug(cleaned);
      // Refresh store
      useAppStore.setState({ business: { ...business, slug: cleaned } });
    } else {
      alert("That URL slug is already taken. Try a different one.");
    }
    setSaving(false);
  };

  const copyUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrUrl) return;
    const a = document.createElement("a");
    a.href = qrUrl;
    a.download = `${slug || "agentos"}-qr.png`;
    a.click();
  };

  const embedScript = `<!-- AgentOS Chat Widget -->
<script>
  window.AgentOS = { businessId: "${business?.id ?? "YOUR_BUSINESS_ID"}" };
</script>
<script async src="${origin}/widget.js"></script>`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">QR Code &amp; Share</h1>
        <p className="text-muted-foreground">Share your AI business page with customers</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin h-7 w-7 text-muted-foreground" /></div>
      ) : (
        <>
          {/* ── URL Slug ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Public URL</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This is your unique business page URL. Customers open this to interact with your AI assistant.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center border rounded-xl overflow-hidden bg-muted">
                  <span className="px-3 text-sm text-muted-foreground whitespace-nowrap">{origin}/b/</span>
                  <input
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="your-business"
                    className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none pr-3 font-mono"
                  />
                </div>
                <Button onClick={saveSlug} disabled={saving || newSlug === slug} size="sm">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  <span className="ml-1.5">Update</span>
                </Button>
              </div>

              {publicUrl && (
                <div className="flex gap-2">
                  <input readOnly value={publicUrl}
                    className="flex-1 px-3 py-2 border rounded-xl bg-muted text-sm text-muted-foreground" />
                  <Button variant="outline" size="sm" onClick={copyUrl}>
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.open(publicUrl, "_blank")}>
                    <ExternalLink size={14} />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── QR Code ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><QrCode size={18} /> QR Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Print or display this QR code at your business. Customers scan it to open your AI page instantly.
              </p>
              {qrUrl ? (
                <div className="flex flex-col items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img ref={qrRef} src={qrUrl} alt="QR Code" className="w-56 h-56 rounded-xl border shadow" />
                  <p className="text-xs text-muted-foreground font-mono">{publicUrl}</p>
                  <Button variant="outline" onClick={downloadQR}>
                    <Download size={14} className="mr-1.5" /> Download QR Code
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
                  <QrCode size={40} className="opacity-20" />
                  <p className="text-sm">Set your URL slug above to generate a QR code</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Embed Widget ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Website Embed Widget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add this snippet before your site&apos;s <code className="text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> tag to embed the chat widget.
              </p>
              <pre className="p-4 bg-muted rounded-xl text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">{embedScript}</pre>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(embedScript); }}>
                <Copy size={14} className="mr-1.5" /> Copy Code
              </Button>
            </CardContent>
          </Card>

          {/* ── Share links ── */}
          {publicUrl && (
            <Card>
              <CardHeader><CardTitle className="text-base">Share on Social</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "WhatsApp",  href: `https://wa.me/?text=${encodeURIComponent(`Chat with our AI assistant: ${publicUrl}`)}`, color: "bg-green-500" },
                    { label: "Twitter/X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Chat with our AI: ${publicUrl}`)}`, color: "bg-black" },
                    { label: "Facebook",  href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`, color: "bg-blue-600" },
                    { label: "LinkedIn",  href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`, color: "bg-blue-700" },
                  ].map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-full text-white text-sm font-medium ${s.color} hover:opacity-90 transition-opacity`}>
                      {s.label}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
