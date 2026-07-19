"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function KnowledgeAgentPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    confidence_threshold: 70,
    top_k_results: 5,
    cite_sources: true,
    fallback_message: "I don't have specific information about that. Would you like me to connect you with our team?",
    knowledge_categories: [] as string[],
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
      if (!biz) return;
      setBusinessId(biz.id);
      const { data } = await supabase.from("agent_configs").select("settings").eq("business_id", biz.id).eq("agent_type", "knowledge").single();
      if (data?.settings && Object.keys(data.settings).length > 0) setSettings((p) => ({ ...p, ...data.settings }));
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("agent_configs").upsert(
      { business_id: businessId, agent_type: "knowledge", enabled: true, settings },
      { onConflict: "business_id,agent_type" }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft size={18} /></Button>
        <div>
          <h1 className="text-2xl font-bold">Knowledge Agent</h1>
          <p className="text-muted-foreground text-sm">Configure RAG settings and response behavior</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Retrieval Settings</CardTitle>
          <CardDescription>Control how the agent searches your knowledge base</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Confidence Threshold</label>
              <span className="text-sm font-bold text-primary">{settings.confidence_threshold}%</span>
            </div>
            <input type="range" min="40" max="95" step="5" value={settings.confidence_threshold}
              onChange={(e) => setSettings((p) => ({ ...p, confidence_threshold: +e.target.value }))} className="w-full" />
            <p className="text-xs text-muted-foreground">Minimum similarity score to include a result. Lower = more answers, Higher = more accurate.</p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Number of Results (top-K)</label>
              <span className="text-sm font-bold text-primary">{settings.top_k_results}</span>
            </div>
            <input type="range" min="1" max="10" step="1" value={settings.top_k_results}
              onChange={(e) => setSettings((p) => ({ ...p, top_k_results: +e.target.value }))} className="w-full" />
            <p className="text-xs text-muted-foreground">How many document chunks to retrieve per query.</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cite Sources</p>
              <p className="text-xs text-muted-foreground">Show which document the answer came from</p>
            </div>
            <button
              onClick={() => setSettings((p) => ({ ...p, cite_sources: !p.cite_sources }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.cite_sources ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.cite_sources ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fallback Message</CardTitle>
          <CardDescription>Shown when no relevant answer is found</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea value={settings.fallback_message} onChange={(e) => setSettings((p) => ({ ...p, fallback_message: e.target.value }))}
            rows={3} className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
        {saving ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : saved ? "✓ Saved!" : <><Save size={16} className="mr-2" />Save Settings</>}
      </Button>
    </div>
  );
}
