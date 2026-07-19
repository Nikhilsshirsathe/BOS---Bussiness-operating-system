"use client";

import { useState } from "react";
import { useLeads } from "@/lib/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Download, Search, Loader2, RefreshCw } from "lucide-react";
import type { Lead } from "@/lib/hooks/use-data";

const STATUS_STYLES: Record<string, string> = {
  hot: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  warm: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  cold: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  lost: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ICON_STYLES: Record<string, string> = {
  hot: "bg-red-100 dark:bg-red-950 text-red-600",
  warm: "bg-amber-100 dark:bg-amber-950 text-amber-600",
  cold: "bg-blue-100 dark:bg-blue-950 text-blue-600",
  converted: "bg-green-100 dark:bg-green-950 text-green-600",
  lost: "bg-gray-100 dark:bg-gray-800 text-gray-500",
};

export default function LeadsPage() {
  const { leads, loading, refetch, updateStatus } = useLeads();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = leads.filter((l) => {
    const matchSearch = !search || l.customer_name.toLowerCase().includes(search.toLowerCase()) || l.customer_email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const countByStatus = (s: string) => leads.filter((l) => l.status === s).length;

  const exportCSV = () => {
    const rows = [["Name", "Email", "Phone", "Score", "Status", "Source", "Date"]];
    filtered.forEach((l) => rows.push([l.customer_name, l.customer_email, l.customer_phone || "", String(l.score), l.status, l.source, l.created_at.slice(0, 10)]));
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv])); a.download = "leads.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Track and manage your qualified leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw size={14} className="mr-1.5" />Refresh</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download size={14} className="mr-1.5" />Export CSV</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(["hot", "warm", "cold"] as const).map((s) => (
          <Card key={s} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}>
            <CardContent className="p-5">
              <p className={`text-2xl font-bold ${s === "hot" ? "text-red-500" : s === "warm" ? "text-amber-500" : "text-blue-500"}`}>{countByStatus(s)}</p>
              <p className="text-sm text-muted-foreground capitalize">{s} Leads</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Status</option>
          {["hot", "warm", "cold", "converted", "lost"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin h-7 w-7 text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Users size={40} className="opacity-20" />
            <p className="text-sm">{leads.length === 0 ? "No leads yet. Start chatting to generate leads." : "No leads match your filters."}</p>
          </div>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${ICON_STYLES[lead.status]}`}>
                      <Users size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{lead.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.customer_email} · via {lead.source}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="font-bold text-sm">{lead.score}</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    <select value={lead.status} onChange={(e) => updateStatus(lead.id, e.target.value as Lead["status"])}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring ${STATUS_STYLES[lead.status]}`}>
                      {["hot", "warm", "cold", "converted", "lost"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                    <span className="text-xs text-muted-foreground hidden md:block">{lead.created_at.slice(0, 10)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
