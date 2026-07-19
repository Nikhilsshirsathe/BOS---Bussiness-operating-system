"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function QualificationAgentPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    target_profile: "",
    min_budget: "",
    max_budget: "",
    hot_threshold: 80,
    cold_threshold: 40,
    qualification_questions: [
      "What is your primary business challenge?",
      "What is your budget range?",
      "What is your timeline for implementation?",
    ],
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
      if (!biz) return;
      setBusinessId(biz.id);
      const { data } = await supabase.from("agent_configs").select("settings").eq("business_id", biz.id).eq("agent_type", "qualification").single();
      if (data?.settings && Object.keys(data.settings).length > 0) setSettings((p) => ({ ...p, ...(data.settings as typeof settings) }));
      setLoading(false);
    };
    load();
  }, []);

  const [newQ, setNewQ] = useState("");

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("agent_configs").upsert(
      { business_id: businessId, agent_type: "qualification", enabled: true, settings },
      { onConflict: "business_id,agent_type" }
    );
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft size={18} /></Button>
        <div>
          <h1 className="text-2xl font-bold">Sales Qualification Agent</h1>
          <p className="text-muted-foreground text-sm">Define lead scoring rules and qualification criteria</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lead Score Thresholds</CardTitle><CardDescription>Define what makes a hot, warm, or cold lead</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">🔴 Hot Lead Threshold</label>
              <span className="text-sm font-bold">{settings.hot_threshold}+</span>
            </div>
            <input type="range" min="60" max="95" step="5" value={settings.hot_threshold}
              onChange={(e) => setSettings((p) => ({ ...p, hot_threshold: +e.target.value }))} className="w-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">🔵 Cold Lead Threshold</label>
              <span className="text-sm font-bold">Below {settings.cold_threshold}</span>
            </div>
            <input type="range" min="20" max="60" step="5" value={settings.cold_threshold}
              onChange={(e) => setSettings((p) => ({ ...p, cold_threshold: +e.target.value }))} className="w-full" />
          </div>
          <p className="text-xs text-muted-foreground">🟡 Warm leads fall between {settings.cold_threshold} and {settings.hot_threshold}.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Target Customer Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <textarea value={settings.target_profile} onChange={(e) => setSettings((p) => ({ ...p, target_profile: e.target.value }))}
            rows={3} placeholder="Describe your ideal customer (e.g., B2B SaaS companies, 10-500 employees...)"
            className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Min Budget ($)</label>
              <input type="number" value={settings.min_budget} onChange={(e) => setSettings((p) => ({ ...p, min_budget: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="1000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Max Budget ($)</label>
              <input type="number" value={settings.max_budget} onChange={(e) => setSettings((p) => ({ ...p, max_budget: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="100000" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Qualification Questions</CardTitle><CardDescription>Questions the agent will ask to qualify leads</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {settings.qualification_questions.map((q, i) => (
            <div key={i} className="flex gap-2">
              <input value={q} onChange={(e) => setSettings((p) => ({ ...p, qualification_questions: p.qualification_questions.map((v, vi) => vi === i ? e.target.value : v) }))}
                className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                onClick={() => setSettings((p) => ({ ...p, qualification_questions: p.qualification_questions.filter((_, qi) => qi !== i) }))}>
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <input value={newQ} onChange={(e) => setNewQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newQ.trim()) { setSettings((p) => ({ ...p, qualification_questions: [...p.qualification_questions, newQ.trim()] })); setNewQ(""); }}}
              placeholder="Add a question..." className="flex-1 px-3 py-1.5 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <Button size="sm" variant="outline" onClick={() => { if (newQ.trim()) { setSettings((p) => ({ ...p, qualification_questions: [...p.qualification_questions, newQ.trim()] })); setNewQ(""); }}}>
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
