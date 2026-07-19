"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import {
  Users, MessageSquare, Phone, Calendar, QrCode, ExternalLink,
  TrendingUp, Bot, Loader2, BarChart3, Clock, Star, Search,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface DashboardData {
  total_visitors: number;
  total_chats: number;
  total_voice_calls: number;
  total_appointments: number;
  conversion_rate: number;
  total_qr_scans: number;
  total_link_clicks: number;
  appointments_today: number;
  total_documents: number;
  active_conversations: number;
  agent_usage: Record<string, number>;
  popular_queries: { query: string; count: number }[];
  daily_analytics: { date: string; event_type: string; count: number }[];
}

const AGENT_COLORS: Record<string, string> = {
  knowledge: "#6366f1", appointment: "#10b981",
  qualification: "#f59e0b", pricing: "#8b5cf6",
  escalation: "#ef4444", brand: "#ec4899",
};

export default function DashboardPage() {
  const { business, fetchBusiness } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    const load = async () => {
      if (!business?.id) return;
      setLoading(true);
      const supabase = createClient();

      try {
        // Get stats from RPC
        const { data: stats } = await supabase.rpc("get_dashboard_stats", {
          p_business_id: business.id,
        });

        // Get popular queries
        const { data: queries } = await supabase.rpc("get_popular_queries", {
          p_business_id: business.id,
          p_limit: 8,
        });

        // Get daily analytics (last 30 days)
        const endDate = new Date().toISOString().split("T")[0];
        const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
        const { data: daily } = await supabase.rpc("get_daily_analytics", {
          p_business_id: business.id,
          p_start_date: startDate,
          p_end_date: endDate,
        });

        // Get agent usage from chat_messages
        const { data: agentData } = await supabase
          .from("chat_messages")
          .select("agent_type")
          .eq("business_id", business.id)
          .not("agent_type", "is", null);

        const agentUsage: Record<string, number> = {};
        (agentData || []).forEach((m) => {
          if (m.agent_type) agentUsage[m.agent_type] = (agentUsage[m.agent_type] || 0) + 1;
        });

        setData({
          total_visitors: stats?.total_visitors ?? 0,
          total_chats: stats?.total_chats ?? 0,
          total_voice_calls: stats?.total_voice_calls ?? 0,
          total_appointments: stats?.total_appointments ?? 0,
          conversion_rate: stats?.conversion_rate ?? 0,
          total_qr_scans: stats?.total_qr_scans ?? 0,
          total_link_clicks: stats?.total_link_clicks ?? 0,
          appointments_today: stats?.appointments_today ?? 0,
          total_documents: stats?.total_documents ?? 0,
          active_conversations: stats?.active_conversations ?? 0,
          agent_usage: agentUsage,
          popular_queries: (queries || []).slice(0, 8),
          daily_analytics: (daily || []).map((d: any) => ({
            date: d.date,
            event_type: d.event_type,
            count: Number(d.count),
          })),
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      }
      setLoading(false);
    };
    load();
  }, [business?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = [
    { label: "Total Visitors",    value: data?.total_visitors ?? 0,       icon: Users,          color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/50" },
    { label: "Total Chats",       value: data?.total_chats ?? 0,          icon: MessageSquare,  color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/50" },
    { label: "Voice Calls",       value: data?.total_voice_calls ?? 0,    icon: Phone,          color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/50" },
    { label: "Appointments",      value: data?.total_appointments ?? 0,   icon: Calendar,       color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/50" },
    { label: "QR Code Scans",     value: data?.total_qr_scans ?? 0,       icon: QrCode,         color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/50" },
    { label: "Link Clicks",       value: data?.total_link_clicks ?? 0,    icon: ExternalLink,   color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-950/50" },
  ];

  const agentPieData = Object.entries(data?.agent_usage || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: AGENT_COLORS[name] ?? "#6366f1",
  }));

  const chatDailyData = (data?.daily_analytics || [])
    .filter((d) => d.event_type === "chat_message")
    .slice(-14)
    .map((d) => ({ date: d.date.slice(5), count: d.count }));

  const bookingDailyData = (data?.daily_analytics || [])
    .filter((d) => d.event_type === "appointment_booked")
    .slice(-14)
    .map((d) => ({ date: d.date.slice(5), count: d.count }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{business ? `, ${business.business_name}` : ""}! Here's your business overview.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className={`inline-flex p-2.5 rounded-lg mb-3 ${bg}`}>
                <Icon size={18} className={color} />
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50">
              <TrendingUp size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{data?.conversion_rate ?? 0}%</p>
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <BarChart3 size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{data?.total_documents ?? 0}</p>
              <p className="text-xs text-muted-foreground">Knowledge Docs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50">
              <Clock size={18} className="text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{data?.appointments_today ?? 0}</p>
              <p className="text-xs text-muted-foreground">Today's Appointments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
              <MessageSquare size={18} className="text-purple-500" />
            </div>
            <div>
              <p className="text-lg font-bold">{data?.active_conversations ?? 0}</p>
              <p className="text-xs text-muted-foreground">Active Conversations</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" /> Daily Conversations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chatDailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chatDailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Chats" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar size={16} className="text-primary" /> Daily Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingDailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={bookingDailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="count" name="Bookings" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Usage + Popular Queries */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot size={16} className="text-primary" /> AI Agent Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={agentPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                    {agentPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                <Bot size={40} className="opacity-20" />
                No AI activity yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Search size={16} className="text-primary" /> Popular Customer Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.popular_queries && data.popular_queries.length > 0 ? (
              <div className="space-y-2">
                {data.popular_queries.map((q, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm truncate flex-1">{q.query}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{q.count}x</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                No queries recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Engagement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star size={16} className="text-primary" /> Key Metrics at a Glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Avg. Daily Chats", value: chatDailyData.length > 0 ? Math.round(chatDailyData.reduce((a, b) => a + b.count, 0) / chatDailyData.length) : 0, icon: MessageSquare },
              { label: "Total AI Responses", value: data?.total_chats ?? 0, icon: Bot },
              { label: "QR Engagement", value: data?.total_qr_scans ?? 0, icon: QrCode },
              { label: "Link Shares", value: data?.total_link_clicks ?? 0, icon: ExternalLink },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg border text-center">
                <item.icon size={16} className="mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{item.value.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}