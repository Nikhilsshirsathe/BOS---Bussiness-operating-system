"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Share2, QrCode, Link, Copy, Download, Check, Loader2,
  ExternalLink, Eye, MessageSquare, Phone, Calendar,
  BarChart3, Smartphone, Mail, Globe, RefreshCw,
} from "lucide-react";
import { LivePhonePreview } from "@/components/ui/live-phone-preview";

export default function SharePage() {
  const { business, fetchBusiness } = useAppStore();
  const supabase = createClient();

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  const publicUrl =
    typeof window !== "undefined" && business?.slug
      ? `${window.location.origin}/b/${business.slug}`
      : null;

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    if (!business?.id) return;
    loadAnalytics();
  }, [business?.id]);

  const loadAnalytics = async () => {
    if (!business?.id) return;
    setLoading(true);
    const { data } = await supabase.rpc("get_sharing_analytics", {
      p_business_id: business.id,
    });
    setAnalytics(data);
    setLoading(false);
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const shareVia = (platform: string) => {
    if (!publicUrl) return;
    const text = encodeURIComponent(`Check out my AI-powered business page! 🤖✨\n\n${publicUrl}`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      email: `mailto:?subject=My AI Business Page&body=${text}`,
    };
    if (urls[platform]) window.open(urls[platform], "_blank");
  };

  const downloadQR = () => {
    if (!publicUrl) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`;
    window.open(qrUrl, "_blank");
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
      <div>
        <h1 className="text-3xl font-bold">Share My Business</h1>
        <p className="text-muted-foreground">Share your AI-powered business page with customers</p>
      </div>

      {/* Two-column layout: tools left, live preview right */}
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">

        {/* ── Left column ── */}
        <div className="space-y-6">

          {/* Public Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link size={16} className="text-primary" /> Your Public Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              {publicUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
                    <Globe size={16} className="text-primary shrink-0" />
                    <span className="text-sm font-mono flex-1 truncate">{publicUrl}</span>
                    <Button size="sm" variant="ghost" onClick={copyLink}>
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </Button>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="ghost">
                        <ExternalLink size={14} />
                      </Button>
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => shareVia("whatsapp")}>
                      <MessageSquare size={14} className="mr-1.5" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => shareVia("facebook")}>
                      <Share2 size={14} className="mr-1.5" /> Facebook
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => shareVia("twitter")}>
                      <Share2 size={14} className="mr-1.5" /> X (Twitter)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => shareVia("email")}>
                      <Mail size={14} className="mr-1.5" /> Email
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Link size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Set up your business slug in Settings to get a public link</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code + Where to Share */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode size={16} className="text-primary" /> QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {publicUrl ? (
                  <div className="space-y-4">
                    <div className="inline-flex p-4 rounded-xl border bg-white">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(publicUrl)}`}
                        alt="QR Code"
                        className="w-48 h-48"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" onClick={downloadQR}>
                        <Download size={14} className="mr-1.5" /> Download QR
                      </Button>
                      <Button variant="outline" onClick={copyLink}>
                        {copied
                          ? <Check size={14} className="text-green-500" />
                          : <Copy size={14} className="mr-1.5" />}
                        Copy Link
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Place this QR code on your storefront, business cards, menus, and posters
                    </p>
                  </div>
                ) : (
                  <div className="py-8 text-muted-foreground">
                    <QrCode size={48} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Generate your QR code by setting up your business page</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone size={16} className="text-primary" /> Where to Share
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: QrCode, label: "Shop Entrance",    desc: "Display at the door" },
                    { icon: QrCode, label: "Visiting Cards",   desc: "Print on business cards" },
                    { icon: QrCode, label: "Posters & Banners",desc: "Add to marketing materials" },
                    { icon: QrCode, label: "Menus",            desc: "Digital menu access" },
                    { icon: QrCode, label: "Reception Desk",   desc: "Self-service check-in" },
                    { icon: QrCode, label: "Product Packaging",desc: "On product labels" },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg border text-center hover:bg-muted/50 transition-colors">
                      <item.icon size={20} className="mx-auto mb-1 text-primary" />
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sharing Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 size={16} className="text-primary" /> Sharing Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: "QR Scans",      value: analytics.total_qr_scans,           icon: QrCode,        color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/50" },
                      { label: "Link Clicks",   value: analytics.total_link_clicks,         icon: Link,          color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/50" },
                      { label: "Page Visits",   value: analytics.total_page_visits,         icon: Eye,           color: "text-green-500",   bg: "bg-green-50 dark:bg-green-950/50" },
                      { label: "Chats Started", value: analytics.total_chats_started,       icon: MessageSquare, color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/50" },
                      { label: "Voice Calls",   value: analytics.total_voice_started,       icon: Phone,         color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/50" },
                      { label: "Appointments",  value: analytics.total_appointments_booked, icon: Calendar,      color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/50" },
                    ].map((item) => (
                      <div key={item.label} className={`p-3 rounded-lg ${item.bg} text-center`}>
                        <item.icon size={16} className={`mx-auto mb-1 ${item.color}`} />
                        <p className="text-lg font-bold">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  {analytics.daily_breakdown?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Daily Breakdown</p>
                      <div className="space-y-1">
                        {analytics.daily_breakdown.slice(0, 10).map((day: any) => (
                          <div key={day.date} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                            <span className="text-muted-foreground">{day.date}</span>
                            <div className="flex gap-3">
                              <span className="text-xs">{day.qr_scans || 0} QR</span>
                              <span className="text-xs">{day.link_clicks || 0} Clicks</span>
                              <span className="text-xs">{day.page_visits || 0} Visits</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No sharing data yet</p>
                  <p className="text-xs">Analytics will appear once customers start visiting your page</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right column: Live interactive preview ── */}
        <LivePhonePreview
          label="Live Preview"
          sublabel="— interact with your page"
          emptyMessage="Set up your business slug in Settings to see your live page here"
          sticky
        />
      </div>
    </div>
  );
}
