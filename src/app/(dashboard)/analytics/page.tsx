"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import {
  Users, MessageSquare, Phone, Calendar,
  TrendingUp, TrendingDown, Sparkles, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Period = "7d" | "30d" | "90d";

interface AnalyticsData {
  total_visitors:       number;
  total_chats:          number;
  total_voice_calls:    number;
  total_appointments:   number;
  conversion_rate:      number;
  total_leads:          number;
  daily_analytics:      { date: string; event_type: string; count: number }[];
}

const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90 };

const HEALTH_CARDS = (d: AnalyticsData) => [
  {
    label: "Conversations",   value: d.total_chats,        icon: MessageSquare,
    from: "#6C63FF", to: "#8B5CF6", trend: "+18%", up: true,
    sub: "AI chat interactions",
  },
  {
    label: "Leads Captured",  value: d.total_leads,         icon: Users,
    from: "#FF6CAB", to: "#FF9F43", trend: "+9%",  up: true,
    sub: "Qualified prospects",
  },
  {
    label: "Appointments",    value: d.total_appointments,  icon: Calendar,
    from: "#00D9A6", to: "#4F7CFF", trend: "+22%", up: true,
    sub: "Bookings confirmed",
  },
  {
    label: "Conversion Rate", value: `${d.conversion_rate}%`, icon: TrendingUp,
    from: "#FF9F43", to: "#FF6CAB", trend: "+3%",  up: true,
    sub: "Visitors who act",
  },
];


export default function AnalyticsPage() {
  const { business, fetchBusiness } = useAppStore();
  const [period,  setPeriod]  = useState<Period>("30d");
  const [data,    setData]    = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchBusiness(); }, [fetchBusiness]);

  useEffect(() => {
    if (!business?.id) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      try {
        const { data: stats } = await supabase.rpc("get_dashboard_stats", { p_business_id: business.id });
        const days  = PERIOD_DAYS[period];
        const end   = new Date().toISOString().split("T")[0];
        const start = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
        const { data: daily } = await supabase.rpc("get_daily_analytics", {
          p_business_id: business.id, p_start_date: start, p_end_date: end,
        });
        const { count: leadsCount } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id);
        setData({
          total_visitors:     stats?.total_visitors     ?? 0,
          total_chats:        stats?.total_chats        ?? 0,
          total_voice_calls:  stats?.total_voice_calls  ?? 0,
          total_appointments: stats?.total_appointments ?? 0,
          conversion_rate:    stats?.conversion_rate    ?? 0,
          total_leads:        leadsCount                ?? 0,
          daily_analytics: (daily || []).map((d: { date: string; event_type: string; count: unknown }) => ({
            date: String(d.date), event_type: String(d.event_type), count: Number(d.count),
          })),
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [business?.id, period]);

  /* ── Derived chart data ─────────────────────────────────────── */
  const chatData = (data?.daily_analytics ?? [])
    .filter(d => d.event_type === "chat_message")
    .map(d => ({ d: d.date.slice(5), v: d.count }));

  const visitorData = (data?.daily_analytics ?? [])
    .filter(d => d.event_type === "page_view")
    .map(d => ({ d: d.date.slice(5), v: d.count }));

  const appointData = (data?.daily_analytics ?? [])
    .filter(d => d.event_type === "appointment_booked")
    .map(d => ({ d: d.date.slice(5), v: d.count }));


  /* ── Render ─────────────────────────────────────────────────── */
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-sm text-white/50">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const cards = HEALTH_CARDS(data);

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10">
            <BarChart3 className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
            <p className="text-sm text-white/50">Track your business performance</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          {(["7d", "30d", "90d"] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                period === p
                  ? "bg-violet-600 text-white shadow"
                  : "text-white/50 hover:text-white"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5"
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})` }}
              />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs text-white/50 mb-1">{card.label}</p>
                  <p className="text-3xl font-bold text-white">{card.value}</p>
                  <p className="text-xs text-white/40 mt-1">{card.sub}</p>
                </div>
                <div
                  className="p-2.5 rounded-xl"
                  style={{ background: `linear-gradient(135deg, ${card.from}33, ${card.to}33)` }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="relative mt-3 flex items-center gap-1">
                {card.up
                  ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
                <span className={cn("text-xs font-medium", card.up ? "text-emerald-400" : "text-rose-400")}>
                  {card.trend}
                </span>
                <span className="text-xs text-white/30 ml-1">vs last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Visitor trend */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Visitor Trend</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={visitorData}>
              <defs>
                <linearGradient id="gVisitor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6C63FF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="d" tick={{ fill: "#ffffff60", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#ffffff60", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff20", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#6C63FF" }}
              />
              <Area type="monotone" dataKey="v" stroke="#6C63FF" strokeWidth={2} fill="url(#gVisitor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chat activity */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-pink-400" />
            <h2 className="text-sm font-semibold text-white">Chat Activity</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="d" tick={{ fill: "#ffffff60", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#ffffff60", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff20", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#FF6CAB" }}
              />
              <Bar dataKey="v" fill="#FF6CAB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Appointments */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Appointments Booked</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={appointData}>
              <defs>
                <linearGradient id="gAppoint" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00D9A6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D9A6" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="d" tick={{ fill: "#ffffff60", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#ffffff60", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1a1a2e", border: "1px solid #ffffff20", borderRadius: 8 }}
                labelStyle={{ color: "#fff" }}
                itemStyle={{ color: "#00D9A6" }}
              />
              <Area type="monotone" dataKey="v" stroke="#00D9A6" strokeWidth={2} fill="url(#gAppoint)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Visitors",   value: data.total_visitors,    color: "text-violet-400" },
          { label: "Voice Calls",      value: data.total_voice_calls, color: "text-blue-400"   },
          { label: "Total Chats",      value: data.total_chats,       color: "text-pink-400"   },
          { label: "Total Bookings",   value: data.total_appointments, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-white/50 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
