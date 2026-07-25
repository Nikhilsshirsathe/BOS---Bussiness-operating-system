"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar, Clock, Plus, Loader2, Check, X, Save,
} from "lucide-react";

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  appointment_time: string;
  duration_minutes: number;
  service: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface BusinessHour {
  id?: string;
  business_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function AppointmentPage() {
  const { business, fetchBusiness } = useAppStore();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [showAddAppt, setShowAddAppt] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [newAppt, setNewAppt] = useState({
    customer_name: "", customer_email: "", customer_phone: "",
    appointment_time: "", service: "", duration_minutes: 30,
  });

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    if (!business?.id) return;
    loadData();
  }, [business?.id]);

  const loadData = async () => {
    if (!business?.id) return;
    setLoading(true);
    const [apptsRes, hoursRes] = await Promise.all([
      supabase.from("appointments").select("*").eq("business_id", business.id).order("appointment_time", { ascending: false }).limit(100),
      supabase.from("business_hours").select("*").eq("business_id", business.id).order("day_of_week"),
    ]);
    setAppointments((apptsRes.data || []) as Appointment[]);
    if (hoursRes.data && hoursRes.data.length > 0) {
      setHours(hoursRes.data as BusinessHour[]);
    } else {
      const defaults: BusinessHour[] = [];
      for (let i = 0; i < 7; i++) {
        defaults.push({
          business_id: business!.id,
          day_of_week: i,
          start_time: i === 0 || i === 6 ? "10:00" : "09:00",
          end_time:   i === 0 || i === 6 ? "16:00" : "18:00",
          is_available: i !== 0,
        });
      }
      setHours(defaults);
    }
    setLoading(false);
  };

  const updateHour = (index: number, field: keyof BusinessHour, value: any) => {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };

  const saveHours = async () => {
    if (!business?.id) return;
    setSaving(true);
    for (const h of hours) {
      await supabase.from("business_hours").upsert({
        business_id: business.id,
        day_of_week: h.day_of_week,
        start_time: h.start_time,
        end_time: h.end_time,
        is_available: h.is_available,
      });
    }
    setSaving(false);
  };

  const addAppointment = async () => {
    if (!business?.id || !newAppt.customer_name || !newAppt.customer_email || !newAppt.appointment_time) return;
    setSaving(true);
    await supabase.from("appointments").insert({
      business_id: business.id,
      customer_name: newAppt.customer_name,
      customer_email: newAppt.customer_email,
      customer_phone: newAppt.customer_phone || null,
      appointment_time: newAppt.appointment_time,
      duration_minutes: newAppt.duration_minutes,
      service: newAppt.service || null,
      status: "scheduled",
    });
    setShowAddAppt(false);
    setNewAppt({ customer_name: "", customer_email: "", customer_phone: "", appointment_time: "", service: "", duration_minutes: 30 });
    setSaving(false);
    loadData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("appointments").update({ status }).eq("id", id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const todayAppts = appointments.filter(
    (a) => new Date(a.appointment_time).toISOString().split("T")[0] === selectedDate
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const daysOfWeek = () => [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
  ];

  const timeOptions = () => {
    const times: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        times.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return times;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const days = daysOfWeek();
  const times = timeOptions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Appointment</h1>
          <p className="text-muted-foreground">Manage appointments and working hours</p>
        </div>
        <Button onClick={() => setShowAddAppt(true)}>
          <Plus size={16} className="mr-2" /> Add Appointment
        </Button>
      </div>

      {/* Main layout */}
      <div className="space-y-6">
        <div className="space-y-6">

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Date Picker */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar size={16} className="text-primary" /> {selectedDate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  type="date" value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Summary</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Today",     value: todayAppts.length },
                      { label: "Upcoming",  value: appointments.filter((a) => a.status === "scheduled").length },
                      { label: "Completed", value: appointments.filter((a) => a.status === "completed").length },
                      { label: "Cancelled", value: appointments.filter((a) => a.status === "cancelled").length },
                    ].map((s) => (
                      <div key={s.label} className="p-3 rounded-lg bg-muted text-center">
                        <p className="text-lg font-bold">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Appointments */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock size={16} className="text-primary" /> Appointments for {selectedDate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayAppts.length > 0 ? (
                  <div className="space-y-2">
                    {todayAppts
                      .sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime())
                      .map((appt) => (
                        <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-10 rounded-full ${
                              appt.status === "confirmed" ? "bg-green-500" :
                              appt.status === "cancelled" ? "bg-red-500"   :
                              appt.status === "completed" ? "bg-blue-500"  :
                                                            "bg-amber-500"
                            }`} />
                            <div>
                              <p className="text-sm font-medium">{appt.customer_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(appt.appointment_time)} · {appt.duration_minutes} min{appt.service ? ` · ${appt.service}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              appt.status === "confirmed" ? "bg-green-50 dark:bg-green-950/50 text-green-600" :
                              appt.status === "cancelled" ? "bg-red-50 dark:bg-red-950/50 text-red-600"       :
                              appt.status === "completed" ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600"    :
                                                            "bg-amber-50 dark:bg-amber-950/50 text-amber-600"
                            }`}>
                              {appt.status}
                            </span>
                            <div className="flex gap-1">
                              {appt.status === "scheduled" && (
                                <>
                                  <button onClick={() => updateStatus(appt.id, "confirmed")} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/50 text-green-600" title="Confirm">
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => updateStatus(appt.id, "cancelled")} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600" title="Cancel">
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                              {appt.status === "confirmed" && (
                                <button onClick={() => updateStatus(appt.id, "completed")} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600" title="Complete">
                                  <Check size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No appointments for this date</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Working Hours */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock size={16} className="text-primary" /> Working Hours
              </CardTitle>
              <Button size="sm" onClick={saveHours} disabled={saving}>
                {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                Save Hours
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {hours.map((h, i) => (
                  <div key={h.day_of_week} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <label className="flex items-center gap-2 w-24">
                      <input
                        type="checkbox"
                        checked={h.is_available}
                        onChange={(e) => updateHour(i, "is_available", e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium">{days[h.day_of_week].label.slice(0, 3)}</span>
                    </label>
                    {h.is_available ? (
                      <div className="flex items-center gap-2 flex-1">
                        <select value={h.start_time} onChange={(e) => updateHour(i, "start_time", e.target.value)}
                          className="px-2 py-1.5 border rounded-lg bg-background text-sm">
                          {times.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-muted-foreground">to</span>
                        <select value={h.end_time} onChange={(e) => updateHour(i, "end_time", e.target.value)}
                          className="px-2 py-1.5 border rounded-lg bg-background text-sm">
                          {times.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* All Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar size={16} className="text-primary" /> All Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Customer</th>
                        <th className="text-left py-2 px-3 font-medium">Date</th>
                        <th className="text-left py-2 px-3 font-medium">Time</th>
                        <th className="text-left py-2 px-3 font-medium">Service</th>
                        <th className="text-left py-2 px-3 font-medium">Status</th>
                        <th className="text-left py-2 px-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appt) => (
                        <tr key={appt.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-3">
                            <p className="font-medium">{appt.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{appt.customer_email}</p>
                          </td>
                          <td className="py-2 px-3">{formatDate(appt.appointment_time)}</td>
                          <td className="py-2 px-3">{formatTime(appt.appointment_time)}</td>
                          <td className="py-2 px-3">{appt.service || "—"}</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                              appt.status === "confirmed" ? "bg-green-50 dark:bg-green-950/50 text-green-600" :
                              appt.status === "cancelled" ? "bg-red-50 dark:bg-red-950/50 text-red-600"       :
                              appt.status === "completed" ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600"    :
                              appt.status === "no-show"   ? "bg-gray-50 dark:bg-gray-950/50 text-gray-600"    :
                                                            "bg-amber-50 dark:bg-amber-950/50 text-amber-600"
                            }`}>{appt.status}</span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1">
                              {appt.status === "scheduled" && (
                                <>
                                  <button onClick={() => updateStatus(appt.id, "confirmed")} className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/50 text-green-600" title="Confirm">
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => updateStatus(appt.id, "cancelled")} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600" title="Cancel">
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No appointments yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Appointment Modal */}
      {showAddAppt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Add Appointment</h3>
              <button onClick={() => setShowAddAppt(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer Name *</label>
                <input type="text" value={newAppt.customer_name}
                  onChange={(e) => setNewAppt({ ...newAppt, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" value={newAppt.customer_email}
                  onChange={(e) => setNewAppt({ ...newAppt, customer_email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" value={newAppt.customer_phone}
                  onChange={(e) => setNewAppt({ ...newAppt, customer_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="+1 234 567 8900" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date & Time *</label>
                <input type="datetime-local" value={newAppt.appointment_time}
                  onChange={(e) => setNewAppt({ ...newAppt, appointment_time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (min)</label>
                  <input type="number" value={newAppt.duration_minutes} min={15} step={15}
                    onChange={(e) => setNewAppt({ ...newAppt, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Service</label>
                  <input type="text" value={newAppt.service}
                    onChange={(e) => setNewAppt({ ...newAppt, service: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Haircut" />
                </div>
              </div>
              <Button className="w-full" onClick={addAppointment} disabled={saving}>
                {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Calendar size={16} className="mr-2" />}
                Book Appointment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
