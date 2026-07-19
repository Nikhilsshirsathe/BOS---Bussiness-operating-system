"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function EscalationAgentPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    contact_email: "",
    contact_phone: "",
    department: "Support",
    confidence_threshold: 70,
    trigger_keywords: "refund, complaint, angry, cancel, legal, escalate, human, manager",
    auto_escalate: true,
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
      if (!biz) return;
      setBusinessId(biz.id);
      const { data } = await supabase.from("agent_configs").select("settings").eq("business_id", biz.id).eq("agent_type", "escalation").single();
      if (data?.settings && Object.keys(data.settings).length > 0) setSettings((p) => ({ ...p, ...(data.settings as typeof settings) }));
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("agent_configs").upsert(
      { business_id: businessId, agent_type: "escalation", enabled: true, settings },
      { onConflict: "business_id,agent_type" }
    );
    // Upsert escalation rule
    if (settings.contact_email) {
      await supabase.from("escalation_rules").upsert({
        business_id: businessId,
        confidence_threshold: settings.confidence_threshold / 100,
        trigger_keywords: settings.trigger_keywords.split(",").map((k) => k.trim()).filter(Boolean),
        department: settings.department,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone || null,
        is_active: true,
      }, { onConflict: "id" });
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft size={18} /></Button>
        <div><h1 className="text-2xl font-bold">Human Escalation Agent</h1><p className="text-muted-foreground text-sm">Configure when and how to escalate to human support</p></div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Support Contact</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Support Email <span className="text-destructive">*</span></label>
            <input type="email" value={settings.contact_email} onChange={(e) => setSettings((p) => ({ ...p, contact_email: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="support@yourcompany.com" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Phone (optional)</label>
              <input type="tel" value={settings.contact_phone} onChange={(e) => setSettings((p) => ({ ...p, contact_phone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="+1 (555) 000-0000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Department</label>
              <input value={settings.department} onChange={(e) => setSettings((p) => ({ ...p, department: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Support" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Escalation Rules</CardTitle><CardDescription>When should the AI hand off to a human?</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between"><label className="text-sm font-medium">AI Confidence Threshold</label><span className="text-sm font-bold">{settings.confidence_threshold}%</span></div>
            <input type="range" min="30" max="90" step="5" value={settings.confidence_threshold}
              onChange={(e) => setSettings((p) => ({ ...p, confidence_threshold: +e.target.value }))} className="w-full" />
            <p className="text-xs text-muted-foreground">Escalate when AI confidence drops below this threshold.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Trigger Keywords</label>
            <input value={settings.trigger_keywords} onChange={(e) => setSettings((p) => ({ ...p, trigger_keywords: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="refund, complaint, angry..." />
            <p className="text-xs text-muted-foreground">Comma-separated words that trigger immediate escalation.</p>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium">Auto-Escalate on Trigger Keywords</p><p className="text-xs text-muted-foreground">Immediately create a ticket when keywords are detected</p></div>
            <button onClick={() => setSettings((p) => ({ ...p, auto_escalate: !p.auto_escalate }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.auto_escalate ? "bg-primary" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.auto_escalate ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : saved ? "✓ Saved!" : <><Save size={16} className="mr-2" />Save Settings</>}
      </Button>
    </div>
  );
}
