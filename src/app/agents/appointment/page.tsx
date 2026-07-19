"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface DayHours { day: number; start: string; end: string; enabled: boolean; }

export default function AppointmentAgentPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({ duration_minutes: 30, buffer_minutes: 15, services: ["Consultation", "Product Demo", "Sales Call"] });
  const [hours, setHours] = useState<DayHours[]>(
    DAYS.map((_, i) => ({ day: i, start: "09:00", end: "17:00", enabled: i < 5 }))
  );
  const [newService, setNewService] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
      if (!biz) return;
      setBusinessId(biz.id);

      const [{ data: cfg }, { data: bh }] = await Promise.all([
        supabase.from("agent_configs").select("settings").eq("business_id", biz.id).eq("agent_type", "appointment").single(),
        supabase.from("business_hours").select("*").eq("business_id", biz.id).order("day_of_week"),
      ]);

      if (cfg?.settings && Object.keys(cfg.settings).length > 0) setSettings((p) => ({ ...p, ...(cfg.settings as typeof settings) }));
      if (bh && bh.length > 0) {
        setHours(DAYS.map((_, i) => {
          const found = bh.find((h: { day_of_week: number }) => h.day_of_week === i);
          return found ? { day: i, start: found.start_time.slice(0, 5), end: found.end_time.slice(0, 5), enabled: found.is_available } : { day: i, start: "09:00", end: "17:00", enabled: i < 5 };
        }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("agent_configs").upsert(
      { business_id: businessId, agent_type: "appointment", enabled: true, settings },
      { onConflict: "business_id,agent_type" }
    );
    // Upsert business hours
    for (const h of hours) {
      await supabase.from("business_hours").upsert(
        { business_id: businessId, day_of_week: h.day, start_time: h.start, end_time: h.end, is_available: h.enabled },
        { onConflict: "business_id,day_of_week" }
      );
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft size={18} /></Button>
        <div>
          <h1 className="text-2xl font-bold">Appointment Agent</h1>
          <p className="text-muted-foreground text-sm">Set availability, duration, and services</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Meeting Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Meeting Duration (min)</label>
              <input type="number" min="15" step="15" value={settings.duration_minutes}
                onChange={(e) => setSettings((p) => ({ ...p, duration_minutes: +e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Buffer Between Meetings (min)</label>
              <input type="number" min="0" step="5" value={settings.buffer_minutes}
                onChange={(e) => setSettings((p) => ({ ...p, buffer_minutes: +e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Business Hours</CardTitle><CardDescription>Set when appointments can be booked</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DAYS.map((day, i) => (
              <div key={day} className="flex items-center gap-3">
                <button onClick={() => setHours((h) => h.map((d, idx) => idx === i ? { ...d, enabled: !d.enabled } : d))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${hours[i].enabled ? "bg-primary" : "bg-muted"}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${hours[i].enabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
                <span className="w-24 text-sm">{day}</span>
                <input type="time" value={hours[i].start} disabled={!hours[i].enabled}
                  onChange={(e) => setHours((h) => h.map((d, idx) => idx === i ? { ...d, start: e.target.value } : d))}
                  className="px-2 py-1 border rounded bg-background text-sm disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring" />
                <span className="text-muted-foreground text-sm">–</span>
                <input type="time" value={hours[i].end} disabled={!hours[i].enabled}
                  onChange={(e) => setHours((h) => h.map((d, idx) => idx === i ? { ...d, end: e.target.value } : d))}
                  className="px-2 py-1 border rounded bg-background text-sm disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Available Services</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {settings.services.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={s} onChange={(e) => setSettings((p) => ({ ...p, services: p.services.map((sv, si) => si === i ? e.target.value : sv) }))}
                className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setSettings((p) => ({ ...p, services: p.services.filter((_, si) => si !== i) }))}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={newService} onChange={(e) => setNewService(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newService.trim()) { setSettings((p) => ({ ...p, services: [...p.services, newService.trim()] })); setNewService(""); }}}
              placeholder="Add service..." className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <Button size="sm" variant="outline" onClick={() => { if (newService.trim()) { setSettings((p) => ({ ...p, services: [...p.services, newService.trim()] })); setNewService(""); }}}>
              <Plus size={14} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : saved ? "✓ Saved!" : <><Save size={16} className="mr-2" />Save Settings</>}
      </Button>
    </div>
  );
}
