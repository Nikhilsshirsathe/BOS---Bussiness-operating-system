"use client";

import { useState } from "react";
import { useAppointments } from "@/lib/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Loader2, RefreshCw } from "lucide-react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import type { Appointment } from "@/lib/hooks/use-data";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  completed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  "no-show": "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
};

function formatApptDate(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

export default function AppointmentsPage() {
  const { appointments, loading, refetch, updateStatus } = useAppointments();
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = appointments.filter((a) => statusFilter === "all" || a.status === statusFilter);
  const todayCount = appointments.filter((a) => isToday(parseISO(a.appointment_time))).length;
  const pendingCount = appointments.filter((a) => a.status === "scheduled").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Manage scheduled appointments</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}><RefreshCw size={14} className="mr-1.5" />Refresh</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-primary">{todayCount}</p><p className="text-sm text-muted-foreground">Today</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-amber-500">{pendingCount}</p><p className="text-sm text-muted-foreground">Pending Confirmation</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-2xl font-bold text-green-500">{appointments.length}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["all", "scheduled", "confirmed", "completed", "cancelled"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}>
            {s === "all" ? `All (${appointments.length})` : `${s} (${appointments.filter((a) => a.status === s).length})`}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin h-7 w-7 text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Calendar size={40} className="opacity-20" />
            <p className="text-sm">{appointments.length === 0 ? "No appointments yet. They&apos;ll appear here once booked via your chatbot." : "No appointments match this filter."}</p>
          </div>
        ) : (
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{appt.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{appt.customer_email} · {appt.service || "Appointment"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar size={12} />{formatApptDate(appt.appointment_time)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />{appt.duration_minutes} min
                    </div>
                    <select value={appt.status} onChange={(e) => updateStatus(appt.id, e.target.value as Appointment["status"])}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring ${STATUS_STYLES[appt.status]}`}>
                      {["scheduled", "confirmed", "completed", "cancelled", "no-show"].map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
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
