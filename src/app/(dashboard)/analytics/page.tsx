"use client";

import { useState } from "react";
import { useDashboardStats } from "@/lib/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Calendar, TrendingUp, Loader2 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const PERIODS = [{ label: "7 days", value: "7d" }, { label: "30 days", value: "30d" }, { label: "90 days", value: "90d" }];
const AGENT_COLORS: Record<string, string> = {
  knowledge: "#6366f1", appointment: "#10b981", qualification: "#f59e0b",
  pricing: "#8b5cf6", escalation: "#ef4444", brand: "#ec4899",
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const { stats, loading } = useDashboardStats(period);

  const agentPieData = Object.entries(stats?.agent_usage || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: AGENT_COLORS[name] || "#6366f1",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Detailed insights into your AI sales performance</p>
        </div>
        <div className="flex gap-1 border rounded-lg p-1">
          {PERIODS.map((p) => (
            <Button key={p.value} variant={period === p.value ? "default" : "ghost"} size="sm"
              onClick={() => setPeriod(p.value)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Conversations", value: stats?.total_conversations ?? 0, icon: MessageSquare, color: "text-green-500" },
              { label: "Total Leads", value: stats?.total_leads ?? 0, icon: Users, color: "text-purple-500" },
              { label: "Appointments", value: stats?.total_appointments ?? 0, icon: Calendar, color: "text-blue-500" },
              { label: "Conversion Rate", value: `${stats?.conversion_rate ?? 0}%`, icon: TrendingUp, color: "text-amber-500" },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label}>
                  <CardContent className="p-5">
                    <div className={`flex items-center gap-2 text-sm mb-2 ${card.color}`}>
                      <Icon size={16} /><span>{card.label}</span>
                    </div>
                    <p className="text-3xl font-bold">{card.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="col-span-full lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-base">Leads Over Time</CardTitle></CardHeader>
              <CardContent>
                {(stats?.leads_over_time?.length ?? 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={stats!.leads_over_time}>
                      <defs>
                        <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} width={28} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="count" name="Leads" stroke="#6366f1" fill="url(#leadGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Conversations Over Time</CardTitle></CardHeader>
              <CardContent>
                {(stats?.conversations_over_time?.length ?? 0) > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats!.conversations_over_time}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} width={28} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="count" name="Chats" fill="#10b981" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data for this period</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Agent Distribution</CardTitle></CardHeader>
              <CardContent>
                {agentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={agentPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                        {agentPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No agent activity yet</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Lead Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3 mt-2">
                  {[
                    { label: "Hot Leads", value: stats?.hot_leads ?? 0, total: stats?.total_leads ?? 1, color: "bg-red-500" },
                    { label: "Warm Leads", value: stats?.warm_leads ?? 0, total: stats?.total_leads ?? 1, color: "bg-amber-500" },
                    { label: "Cold Leads", value: stats?.cold_leads ?? 0, total: stats?.total_leads ?? 1, color: "bg-blue-500" },
                  ].map((item) => {
                    const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                    return (
                      <div key={item.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{item.label}</span>
                          <span className="text-muted-foreground">{item.value} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className={`${item.color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
