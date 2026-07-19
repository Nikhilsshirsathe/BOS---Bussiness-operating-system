"use client";

import { useState } from "react";
import { useVoiceCalls } from "@/lib/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Loader2, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import type { VoiceCall } from "@/types";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  active:    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  failed:    "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  initiated: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
};

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function CallRow({ call }: { call: VoiceCall }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border-b last:border-0">
      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer gap-4"
        onClick={() => call.transcript?.length > 0 && setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${call.status === "completed" ? "bg-green-100 dark:bg-green-950" : "bg-muted"}`}>
            <Phone size={15} className={call.status === "completed" ? "text-green-600" : "text-muted-foreground"} />
          </div>
          <div>
            <p className="font-medium text-sm">{call.visitor_name || call.visitor_id.slice(0, 12)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock size={11} /> {formatDuration(call.duration_seconds)}
              {call.appointment_booked && <span className="text-green-600 font-medium">· Appointment booked</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[call.status]}`}>
            {call.status}
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">
            {formatDistanceToNow(parseISO(call.created_at), { addSuffix: true })}
          </span>
          {call.transcript?.length > 0 && (
            expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />
          )}
        </div>
      </div>
      {expanded && call.transcript?.length > 0 && (
        <div className="px-4 pb-4 space-y-2 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 mb-2">Transcript</p>
          {call.transcript.map((turn, i) => (
            <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] text-xs px-3 py-2 rounded-xl ${
                turn.role === "user" ? "bg-primary text-white" : "bg-card border"
              }`}>
                <p className="font-medium capitalize mb-0.5 opacity-70">{turn.role}</p>
                {turn.content}
              </div>
            </div>
          ))}
          {call.summary && (
            <div className="bg-card border rounded-xl p-3 text-xs mt-2">
              <p className="font-medium text-muted-foreground mb-1">Summary</p>
              <p>{call.summary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VoiceCallsPage() {
  const { calls, loading, refetch } = useVoiceCalls();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = statusFilter === "all" ? calls : calls.filter((c) => c.status === statusFilter);
  const completed = calls.filter((c) => c.status === "completed").length;
  const totalMinutes = Math.round(calls.reduce((s, c) => s + c.duration_seconds, 0) / 60);
  const booked = calls.filter((c) => c.appointment_booked).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Voice Calls</h1>
          <p className="text-muted-foreground">AI voice call transcripts and analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}><RefreshCw size={14} className="mr-1.5" />Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-primary">{completed}</p><p className="text-sm text-muted-foreground">Completed Calls</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-emerald-500">{totalMinutes}</p><p className="text-sm text-muted-foreground">Total Minutes</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-amber-500">{booked}</p><p className="text-sm text-muted-foreground">Appointments via Voice</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "completed", "active", "failed"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
            {s === "all" ? `All (${calls.length})` : `${s} (${calls.filter((c) => c.status === s).length})`}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin h-7 w-7 text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Phone size={40} className="opacity-20" />
            <p className="text-sm">{calls.length === 0 ? "No voice calls yet. Enable Voice AI in AI Settings." : "No calls match this filter."}</p>
          </div>
        ) : (
          <CardContent className="p-0">
            {filtered.map((call) => <CallRow key={call.id} call={call} />)}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
