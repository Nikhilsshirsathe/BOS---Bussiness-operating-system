"use client";

import { useState } from "react";
import { useConversations } from "@/lib/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Search, Loader2, Zap } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  resolved: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  escalated: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

const ICON_STYLES: Record<string, string> = {
  active: "bg-green-100 dark:bg-green-950 text-green-600",
  pending: "bg-amber-100 dark:bg-amber-950 text-amber-600",
  resolved: "bg-gray-100 dark:bg-gray-800 text-gray-500",
  escalated: "bg-red-100 dark:bg-red-950 text-red-600",
};

const AGENT_LABELS: Record<string, string> = {
  knowledge: "Knowledge", appointment: "Appointment", qualification: "Sales",
  pricing: "Pricing", escalation: "Escalation", brand: "Brand",
};

export default function ConversationsPage() {
  const { conversations, loading, refetch } = useConversations();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = conversations.filter((c) => {
    const matchSearch = !search ||
      (c.visitor_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.visitor_email || "").toLowerCase().includes(search.toLowerCase()) ||
      c.visitor_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = conversations.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1 text-green-500 font-medium">
                <Zap size={14} /> {activeCount} live
              </span>
            )}
            {activeCount > 0 ? " · " : ""}Monitor and review customer conversations
          </p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..."
            className="pl-9 pr-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-56" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "active", "pending", "resolved", "escalated"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
            {s === "all" ? `All (${conversations.length})` : `${s} (${conversations.filter((c) => c.status === s).length})`}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin h-7 w-7 text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <MessageSquare size={40} className="opacity-20" />
            <p className="text-sm">{conversations.length === 0 ? "No conversations yet. Deploy your chatbot to start receiving messages." : "No conversations match your filters."}</p>
          </div>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((conv) => (
                <div key={conv.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${ICON_STYLES[conv.status]}`}>
                      <MessageSquare size={15} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {conv.visitor_name || conv.visitor_email || `Visitor ${conv.visitor_id.slice(0, 8)}`}
                        {conv.status === "active" && (
                          <span className="ml-2 inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {AGENT_LABELS[conv.current_agent] || conv.current_agent} Agent
                        {conv.summary ? ` · ${conv.summary.slice(0, 60)}...` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[conv.status]}`}>
                      {conv.status}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {formatDistanceToNow(parseISO(conv.updated_at), { addSuffix: true })}
                    </span>
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
