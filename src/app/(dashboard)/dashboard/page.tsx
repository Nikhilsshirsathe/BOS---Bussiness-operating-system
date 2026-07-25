"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import {
  Users, MessageSquare, Phone, Calendar,
  BookOpen, Share2, Settings, BarChart3,
  ArrowUpRight, Bot, Sparkles, TrendingUp,
  Zap, QrCode, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardData {
  total_visitors:       number;
  total_chats:          number;
  total_voice_calls:    number;
  total_appointments:   number;
  conversion_rate:      number;
  total_qr_scans:       number;
  appointments_today:   number;
  total_documents:      number;
  active_conversations: number;
  daily_analytics:      { date: string; event_type: string; count: number }[];
}

const TOOLS = [
  { label: "AI Assistant",       href: "/chatbot",     icon: MessageSquare, from: "#6C63FF", to: "#8B5CF6", desc: "Chat & respond" },
  { label: "Voice Assistant",    href: "/voice-agent", icon: Phone,         from: "#00C2FF", to: "#4F7CFF", desc: "Voice calls" },
  { label: "Appointments",       href: "/appointment", icon: Calendar,      from: "#00D9A6", to: "#4F7CFF", desc: "Manage bookings" },
  { label: "Business Info",      href: "/knowledge",   icon: BookOpen,      from: "#FF9F43", to: "#FF6CAB", desc: "Knowledge base" },
  { label: "Analytics",          href: "/analytics",   icon: BarChart3,     from: "#FF6CAB", to: "#8B5CF6", desc: "Insights & data" },
  { label: "Customers",          href: "/leads",       icon: Users,         from: "#FF9F43", to: "#FF6CAB", desc: "Lead pipeline" },
  { label: "QR & Share",         href: "/share",       icon: Share2,        from: "#00D9A6", to: "#00C2FF", desc: "Share your branch" },
  { label: "Customize",          href: "/settings",    icon: Settings,      from: "#94A3B8", to: "#64748B", desc: "Your preferences" },
];


export default function DashboardPage() {
  const { business, fetchBusiness } = useAppStore();
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);

  useEffect(() => {
    if (!business?.id) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      try {
        const { data: stats } = await supabase.rpc("get_dashboard_stats", { p_business_id: business.id });
        const end   = new Date().toISOString().split("T")[0];
        const start = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const { data: daily } = await supabase.rpc("get_daily_analytics", {
          p_business_id: business.id, p_start_date: start, p_end_date: end,
        });
        setData({
          total_visitors:       stats?.total_visitors       ?? 0,
          total_chats:          stats?.total_chats          ?? 0,
          total_voice_calls:    stats?.total_voice_calls    ?? 0,
          total_appointments:   stats?.total_appointments   ?? 0,
          conversion_rate:      stats?.conversion_rate      ?? 0,
          total_qr_scans:       stats?.total_qr_scans       ?? 0,
          appointments_today:   stats?.appointments_today   ?? 0,
          total_documents:      stats?.total_documents      ?? 0,
          active_conversations: stats?.active_conversations ?? 0,
          daily_analytics: (daily || []).map((d: { date: string; event_type: string; count: unknown }) => ({
            date: String(d.date), event_type: String(d.event_type), count: Number(d.count),
          })),
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [business?.id]);

  const chatTrend = (data?.daily_analytics ?? [])
    .filter(d => d.event_type === "chat_message")
    .slice(-14)
    .map(d => ({ d: d.date.slice(5), v: d.count }));

  if (loading) {
    return (
      <div className="p-6 space-y-5 max-w-7xl mx-auto">
        <div className="skeleton h-6 w-52 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-[28px]" />)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-24 rounded-[28px]" />)}
        </div>
      </div>
    );
  }


  const kpis = [
    {
      label: "Total Visitors", value: data?.total_visitors ?? 0, icon: Users,
      from: "#6C63FF", to: "#8B5CF6",
      trend: "+12%", trendUp: true,
    },
    {
      label: "AI Conversations", value: data?.total_chats ?? 0, icon: MessageSquare,
      from: "#4F7CFF", to: "#00C2FF",
      badge: data?.active_conversations ? `${data.active_conversations} live` : null,
    },
    {
      label: "Appointments", value: data?.total_appointments ?? 0, icon: Calendar,
      from: "#00D9A6", to: "#4F7CFF",
      badge: data?.appointments_today ? `${data.appointments_today} today` : null,
    },
    {
      label: "Voice Calls", value: data?.total_voice_calls ?? 0, icon: Phone,
      from: "#00C2FF", to: "#4F7CFF",
      trend: "+8%", trendUp: true,
    },
  ];

  return (
    <div className="p-6 pb-12 max-w-7xl mx-auto space-y-8">

      {/* ── Live Page Banner ─────────────────────────────────── */}
      {business?.slug && (
        <div className="rounded-[20px] border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-[12px] bg-primary flex items-center justify-center shrink-0">
              <Zap size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary">🎉 Your AI business page is live!</p>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {typeof window !== "undefined" ? window.location.origin : ""}/b/{business.slug}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <a
              href={`/b/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <ExternalLink size={12} /> View Page
            </a>
            <Link
              href="/share"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/40 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
            >
              <QrCode size={12} /> QR Code
            </Link>
          </div>
        </div>
      )}

      {/* ── KPI Widgets ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, from, to, trend, trendUp, badge }, i) => (
          <div
            key={label}
            className={cn("glass-card rounded-[28px] p-5 hover-lift cursor-default border border-border/60 fade-up", `fade-up-${i + 1}`)}
          >
            {/* Icon */}
            <div
              className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-4 shadow-md"
              style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 4px 14px ${from}40` }}
            >
              <Icon size={19} className="text-white" strokeWidth={2} />
            </div>
            {/* Value */}
            <p className="text-3xl font-bold tracking-tight mb-0.5">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            {/* Badge or trend */}
            <div className="mt-3">
              {badge && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {badge}
                </span>
              )}
              {trend && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                  trendUp ? "text-emerald-500" : "text-red-500"
                )}>
                  <TrendingUp size={11} /> {trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Secondary row — conversion + chart ──────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Conversion rate */}
        <div className="glass-card rounded-[28px] p-6 border border-border/60 card-purple fade-up fade-up-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">Conversion Rate</p>
          <p className="text-5xl font-bold bos-gradient-text mb-1">{data?.conversion_rate ?? 0}%</p>
          <p className="text-xs text-muted-foreground">Visitors who take action</p>
        </div>
        {/* QR scans */}
        <div className="glass-card rounded-[28px] p-6 border border-border/60 card-teal fade-up fade-up-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">QR Code Scans</p>
          <div className="flex items-center gap-3 mb-1">
            <QrCode size={28} className="text-teal-500" />
            <p className="text-5xl font-bold">{(data?.total_qr_scans ?? 0).toLocaleString()}</p>
          </div>
          <p className="text-xs text-muted-foreground">People scanned your code</p>
        </div>
        {/* Chat trend */}
        <div className="glass-card rounded-[28px] p-6 border border-border/60 fade-up fade-up-4">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-3">Chat Trend (14d)</p>
          {chatTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={72}>
              <AreaChart data={chatTrend}>
                <defs>
                  <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6C63FF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#6C63FF" strokeWidth={2.5} fill="url(#chatGrad)" dot={false} />
                <XAxis dataKey="d" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                  formatter={(v) => [v, "Chats"]}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[72px] flex flex-col items-center justify-center text-center">
              <Sparkles size={20} className="text-indigo-300 mb-1" />
              <p className="text-xs text-muted-foreground">Your journey starts here.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Tool Grid ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Your Business Tools</h2>
          <span className="text-xs text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">8 tools</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TOOLS.map(({ label, href, icon: Icon, from, to, desc }, idx) => (
            <Link key={href} href={href}>
              <div className={cn(
                "glass-card rounded-[28px] p-5 border border-border/60 hover-lift cursor-pointer group",
                `fade-up fade-up-${Math.min(idx + 1, 6)}`
              )}>
                <div
                  className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform duration-300"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 4px 14px ${from}35` }}
                >
                  <Icon size={19} className="text-white" strokeWidth={2} />
                </div>
                <p className="text-sm font-semibold leading-tight mb-0.5">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
                <ArrowUpRight
                  size={14}
                  className="mt-3 text-muted-foreground/30 group-hover:text-indigo-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── AI Status banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[28px] bos-gradient p-7 text-white fade-up fade-up-5 shadow-bos-lg">
        <div className="absolute -top-8  -right-8  w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-8 w-48 h-48 rounded-full bg-white/5"  />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[18px] bg-white/20 flex items-center justify-center shrink-0">
              <Bot size={26} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-xl mb-0.5">Your AI Assistant is Active</p>
              <p className="text-white/70 text-sm">Customers can chat, call, and book appointments 24/7</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-center gap-2 text-sm bg-white/15 px-4 py-2 rounded-full border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </span>
            {business?.slug && (
              <a href={`/b/${business.slug}`} target="_blank" rel="noopener noreferrer">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-indigo-600 text-sm font-semibold hover:bg-indigo-50 transition-colors">
                  <ExternalLink size={13} /> Open
                </button>
              </a>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
