"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Check, Clock, Calendar, Shield } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface HourRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Config {
  slot_duration_minutes: number;
  buffer_minutes: number;
  max_daily_appointments: number;
  advance_booking_days: number;
  cancellation_hours: number;
}

function SaveBtn({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <Button type="submit" disabled={saving} size="sm">
      {saving ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Saving…</>
      : saved  ? <><Check size={14} className="mr-1.5 text-green-400" />Saved!</>
      :           <><Save size={14} className="mr-1.5" />Save Changes</>}
    </Button>
  );
}

export default function AppointmentConfigPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState<Config>({
    slot_duration_minutes: 30,
    buffer_minutes: 10,
    max_daily_appointments: 20,
    advance_booking_days: 30,
    cancellation_hours: 24,
  });
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgSaved, setCfgSaved]   = useState(false);

  const [hours, setHours] = useState<Record<number, HourRow>>({});
  const [hrsSaving, setHrsSaving] = useState(false);
  const [hrsSaved,  setHrsSaved]  = useState(false);

  const flash = (s: (v: boolean) => void) => { s(true); setTimeout(() => s(false), 2000); };

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
    if (!biz) { setLoading(false); return; }
    setBusinessId(biz.id);

    const [{ data: cfg }, { data: rawHours }] = await Promise.all([
      supabase.from("appointment_config").select("*").eq("business_id", biz.id).single(),
      supabase.from("business_hours").select("*").eq("business_id", biz.id).order("day_of_week"),
    ]);

    if (cfg) setConfig(cfg as Config);

    const map: Record<number, HourRow> = {};
    (rawHours ?? []).forEach((h: HourRow) => { map[h.day_of_week] = h; });
    for (let d = 0; d < 7; d++) {
      if (!map[d]) map[d] = { day_of_week: d, start_time: "09:00", end_time: "17:00", is_available: d >= 1 && d <= 5 };
    }
    setHours(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setCfgSaving(true);
    const supabase = createClient();
    await supabase.from("appointment_config")
      .upsert({ business_id: businessId, ...config }, { onConflict: "business_id" });
    setCfgSaving(false);
    flash(setCfgSaved);
  };

  const saveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setHrsSaving(true);
    const supabase = createClient();
    const rows = Object.values(hours).map((h) => ({ business_id: businessId, ...h }));
    await supabase.from("business_hours").upsert(rows, { onConflict: "business_id,day_of_week" });
    setHrsSaving(false);
    flash(setHrsSaved);
  };

  const updateHour = (dow: number, field: keyof HourRow, value: string | boolean) =>
    setHours((p) => ({ ...p, [dow]: { ...p[dow], [field]: value } }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Appointment Configuration</h1>
        <p className="text-muted-foreground">Configure how customers can book appointments via your AI page</p>
      </div>

      {/* ── Slot Configuration ── */}
      <form onSubmit={saveConfig}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock size={18} className="text-primary" /> Slot Settings
            </CardTitle>
            <CardDescription>Control how appointment slots are generated and managed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { key: "slot_duration_minutes", label: "Slot Duration (minutes)", min: 5, step: 5,
                  desc: "Length of each appointment" },
                { key: "buffer_minutes", label: "Buffer Time (minutes)", min: 0, step: 5,
                  desc: "Gap between appointments" },
                { key: "max_daily_appointments", label: "Max Daily Appointments", min: 1, step: 1,
                  desc: "Maximum bookings per day" },
                { key: "advance_booking_days", label: "Advance Booking (days)", min: 1, step: 1,
                  desc: "How far ahead customers can book" },
                { key: "cancellation_hours", label: "Cancellation Notice (hours)", min: 0, step: 1,
                  desc: "Min hours notice to cancel" },
              ].map(({ key, label, min, step, desc }) => (
                <div key={key} className="sm:col-span-1">
                  <label className="text-sm font-medium block mb-0.5">{label}</label>
                  <p className="text-xs text-muted-foreground mb-1">{desc}</p>
                  <input
                    type="number" min={min} step={step}
                    value={(config as unknown as Record<string, number>)[key]}
                    onChange={(e) => setConfig((p) => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground space-y-1 mt-2">
              <p className="font-medium text-foreground text-sm">Preview</p>
              <p>📅 Slots: every {config.slot_duration_minutes} min + {config.buffer_minutes} min buffer</p>
              <p>📊 Max {config.max_daily_appointments} appointments/day</p>
              <p>🗓 Book up to {config.advance_booking_days} days ahead</p>
              <p>❌ Cancel at least {config.cancellation_hours}h before</p>
            </div>

            <SaveBtn saving={cfgSaving} saved={cfgSaved} />
          </CardContent>
        </Card>
      </form>

      {/* ── Business Hours ── */}
      <form onSubmit={saveHours}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar size={18} className="text-primary" /> Working Hours
            </CardTitle>
            <CardDescription>
              Days and hours when appointments can be booked. Uncheck a day to mark it as closed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 7 }, (_, d) => d).map((dow) => {
              const h = hours[dow];
              if (!h) return null;
              return (
                <div key={dow} className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <input
                      type="checkbox"
                      id={`avail-${dow}`}
                      checked={h.is_available}
                      onChange={(e) => updateHour(dow, "is_available", e.target.checked)}
                      className="h-4 w-4 accent-primary cursor-pointer"
                    />
                    <label htmlFor={`avail-${dow}`} className="text-sm cursor-pointer select-none">
                      {DAYS[dow]}
                    </label>
                  </div>
                  {h.is_available ? (
                    <>
                      <input type="time" value={h.start_time}
                        onChange={(e) => updateHour(dow, "start_time", e.target.value)}
                        className="px-3 py-1.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      <span className="text-muted-foreground text-sm">to</span>
                      <input type="time" value={h.end_time}
                        onChange={(e) => updateHour(dow, "end_time", e.target.value)}
                        className="px-3 py-1.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">Closed</span>
                  )}
                </div>
              );
            })}
            <div className="pt-2">
              <SaveBtn saving={hrsSaving} saved={hrsSaved} />
            </div>
          </CardContent>
        </Card>
      </form>

      {/* ── Security note ── */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 text-sm text-muted-foreground">
        <Shield size={16} className="shrink-0 mt-0.5" />
        <p>
          Appointment slots are calculated in real time based on existing bookings. The AI will automatically
          show customers only the available slots and prevent double-booking.
        </p>
      </div>
    </div>
  );
}
