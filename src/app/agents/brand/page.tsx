"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, ArrowLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

const PERSONALITIES = ["professional", "friendly", "corporate", "luxury", "medical", "legal", "custom"];

export default function BrandAgentPage() {
  const router = useRouter();
  const [businessId, setBusinessId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [brand, setBrand] = useState({
    primary_color: "#6366f1",
    secondary_color: "#818cf8",
    bot_name: "Sales Assistant",
    greeting_message: "Hello! How can I help you today?",
    personality: "professional",
    custom_personality_prompt: "",
    tone: "Helpful and professional",
    chat_position: "right" as "left" | "right",
    languages: "English",
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
      if (!biz) return;
      setBusinessId(biz.id);
      const { data } = await supabase.from("brand_settings").select("*").eq("business_id", biz.id).single();
      if (data) setBrand((p) => ({ ...p, ...data, languages: (data.languages || ["English"]).join(", ") }));
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("brand_settings").upsert({
      business_id: businessId,
      ...brand,
      languages: brand.languages.split(",").map((l) => l.trim()).filter(Boolean),
    }, { onConflict: "business_id" });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft size={18} /></Button>
        <div><h1 className="text-2xl font-bold">Brand & Personality Agent</h1><p className="text-muted-foreground text-sm">Customize your chatbot&apos;s appearance and voice</p></div>
      </div>

      {/* Live preview */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-base">Live Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-hidden max-w-xs">
            <div className="p-3 flex items-center gap-2 text-white" style={{ backgroundColor: brand.primary_color }}>
              <Bot size={18} />
              <span className="font-semibold text-sm">{brand.bot_name || "Sales Assistant"}</span>
            </div>
            <div className="p-3 bg-background">
              <div className="bg-muted rounded-lg p-2.5 text-sm max-w-[80%]">{brand.greeting_message}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Bot Name</label>
            <input value={brand.bot_name} onChange={(e) => setBrand((p) => ({ ...p, bot_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Sales Assistant" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Greeting Message</label>
            <textarea value={brand.greeting_message} onChange={(e) => setBrand((p) => ({ ...p, greeting_message: e.target.value }))}
              rows={2} className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Brand Colors</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.primary_color} onChange={(e) => setBrand((p) => ({ ...p, primary_color: e.target.value }))}
                  className="h-10 w-16 rounded border cursor-pointer bg-background p-0.5" />
                <span className="text-sm text-muted-foreground font-mono">{brand.primary_color}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.secondary_color} onChange={(e) => setBrand((p) => ({ ...p, secondary_color: e.target.value }))}
                  className="h-10 w-16 rounded border cursor-pointer bg-background p-0.5" />
                <span className="text-sm text-muted-foreground font-mono">{brand.secondary_color}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#0f172a"].map((c) => (
              <button key={c} type="button" onClick={() => setBrand((p) => ({ ...p, primary_color: c }))}
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: brand.primary_color === c ? "currentColor" : "transparent" }} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Personality & Tone</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {PERSONALITIES.map((p) => (
              <button key={p} type="button" onClick={() => setBrand((b) => ({ ...b, personality: p }))}
                className={`px-3 py-2 rounded-md border text-sm capitalize transition-colors ${brand.personality === p ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"}`}>
                {p}
              </button>
            ))}
          </div>
          {brand.personality === "custom" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Custom Personality Prompt</label>
              <textarea value={brand.custom_personality_prompt} onChange={(e) => setBrand((p) => ({ ...p, custom_personality_prompt: e.target.value }))}
                rows={3} placeholder="Describe the personality in detail..."
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tone Description</label>
            <input value={brand.tone} onChange={(e) => setBrand((p) => ({ ...p, tone: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Helpful and professional" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Widget Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium">Chat Widget Position</label>
            <div className="flex gap-3 mt-2">
              {(["left", "right"] as const).map((pos) => (
                <button key={pos} onClick={() => setBrand((p) => ({ ...p, chat_position: pos }))}
                  className={`flex-1 py-2 border rounded-md text-sm capitalize ${brand.chat_position === pos ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                  {pos}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Supported Languages</label>
            <input value={brand.languages} onChange={(e) => setBrand((p) => ({ ...p, languages: e.target.value }))}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="English, Spanish, French" />
            <p className="text-xs text-muted-foreground">Comma-separated list of languages.</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving ? <><Loader2 size={16} className="mr-2 animate-spin" />Saving...</> : saved ? "✓ Saved!" : <><Save size={16} className="mr-2" />Save Settings</>}
      </Button>
    </div>
  );
}
