"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bot, Phone, Calendar, Save, Loader2, Check, Sparkles } from "lucide-react";
import type { FeatureToggles, BrandSettings, Personality } from "@/types";

const PERSONALITIES: { value: Personality; label: string; desc: string }[] = [
  { value: "professional", label: "Professional",  desc: "Formal, accurate, business-like" },
  { value: "friendly",     label: "Friendly",      desc: "Warm, conversational, enthusiastic" },
  { value: "corporate",    label: "Corporate",      desc: "Formal, structured, enterprise-grade" },
  { value: "luxury",       label: "Luxury",         desc: "Elegant, premium, exclusive" },
  { value: "medical",      label: "Medical",        desc: "Precise, empathetic, clinical" },
  { value: "legal",        label: "Legal",          desc: "Precise, careful, advisory" },
  { value: "custom",       label: "Custom",         desc: "Define your own personality prompt" },
];

function SaveBtn({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <Button type="submit" disabled={saving} size="sm">
      {saving ? <><Loader2 size={14} className="mr-1.5 animate-spin" />Saving…</>
      : saved  ? <><Check size={14} className="mr-1.5 text-green-400" />Saved!</>
      :           <><Save size={14} className="mr-1.5" />Save</>}
    </Button>
  );
}

export default function AISettingsPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Features
  const [features, setFeatures] = useState<Partial<FeatureToggles>>({
    chat_enabled: true, voice_enabled: false, booking_enabled: true,
  });
  const [featSaving, setFeatSaving] = useState(false);
  const [featSaved,  setFeatSaved]  = useState(false);

  // Brand / AI
  const [brand, setBrand] = useState<Partial<BrandSettings>>({
    bot_name: "AI Assistant",
    primary_color: "#6366f1",
    personality: "professional",
    greeting_message: "Hi! How can I help you today?",
    languages: ["English"],
    tone: "Helpful and professional",
    custom_personality_prompt: "",
    is_published: false,
  });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved,  setBrandSaved]  = useState(false);

  const flash = (setter: (v: boolean) => void) => { setter(true); setTimeout(() => setter(false), 2000); };

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
    if (!biz) { setLoading(false); return; }
    setBusinessId(biz.id);

    const [{ data: feat }, { data: b }] = await Promise.all([
      supabase.from("feature_toggles").select("*").eq("business_id", biz.id).single(),
      supabase.from("brand_settings").select("*").eq("business_id", biz.id).single(),
    ]);

    if (feat) setFeatures(feat as FeatureToggles);
    if (b)    setBrand(b as BrandSettings);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveFeatures = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setFeatSaving(true);
    const supabase = createClient();
    await supabase.from("feature_toggles").upsert(
      { business_id: businessId, ...features },
      { onConflict: "business_id" }
    );
    setFeatSaving(false);
    flash(setFeatSaved);
  };

  const saveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setBrandSaving(true);
    const supabase = createClient();
    await supabase.from("brand_settings").upsert(
      { business_id: businessId, ...brand },
      { onConflict: "business_id" }
    );
    setBrandSaving(false);
    flash(setBrandSaved);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">AI Settings</h1>
        <p className="text-muted-foreground">Configure your AI assistant&apos;s features and personality</p>
      </div>

      {/* ── Feature Toggles ── */}
      <form onSubmit={saveFeatures}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles size={18} className="text-primary" /> Feature Toggles
            </CardTitle>
            <CardDescription>Enable or disable customer-facing features on your business page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "chat_enabled",    icon: Bot,      label: "AI Chat Assistant",     desc: "Customers can chat with your AI assistant" },
              { key: "voice_enabled",   icon: Phone,    label: "AI Voice Receptionist", desc: "Customers can have a voice call with your AI" },
              { key: "booking_enabled", icon: Calendar, label: "Appointment Booking",   desc: "Customers can browse slots and book appointments" },
            ].map(({ key, icon: Icon, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch
                  checked={!!(features as Record<string, boolean>)[key]}
                  onCheckedChange={(val) => setFeatures((p) => ({ ...p, [key]: val }))}
                />
              </div>
            ))}
            <div className="pt-2">
              <SaveBtn saving={featSaving} saved={featSaved} />
            </div>
          </CardContent>
        </Card>
      </form>

      {/* ── AI Personality ── */}
      <form onSubmit={saveBrand}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot size={18} className="text-primary" /> AI Personality
            </CardTitle>
            <CardDescription>Customise how your AI assistant sounds and behaves</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Personality picker */}
            <div>
              <label className="text-sm font-medium block mb-2">Personality Style</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setBrand((prev) => ({ ...prev, personality: p.value }))}
                    className={`p-3 rounded-xl border text-left transition-all ${brand.personality === p.value ? "border-primary bg-primary/5" : "hover:border-primary/40"}`}
                  >
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {brand.personality === "custom" && (
              <div>
                <label className="text-sm font-medium block mb-1">Custom Personality Prompt</label>
                <textarea
                  value={brand.custom_personality_prompt ?? ""}
                  onChange={(e) => setBrand((p) => ({ ...p, custom_personality_prompt: e.target.value }))}
                  rows={3}
                  placeholder="Describe how the AI should behave and speak…"
                  className="w-full px-3 py-2 border rounded-xl bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium block mb-1">Bot Name</label>
                <input
                  value={brand.bot_name ?? ""}
                  onChange={(e) => setBrand((p) => ({ ...p, bot_name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="AI Assistant"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Brand Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={brand.primary_color ?? "#6366f1"}
                    onChange={(e) => setBrand((p) => ({ ...p, primary_color: e.target.value }))}
                    className="h-10 w-14 px-1 border rounded-xl cursor-pointer"
                  />
                  <input
                    value={brand.primary_color ?? "#6366f1"}
                    onChange={(e) => setBrand((p) => ({ ...p, primary_color: e.target.value }))}
                    className="flex-1 px-3 py-2 border rounded-xl bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Greeting Message</label>
              <textarea
                value={brand.greeting_message ?? ""}
                onChange={(e) => setBrand((p) => ({ ...p, greeting_message: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border rounded-xl bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Hi! How can I help you today?"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Tone</label>
              <input
                value={brand.tone ?? ""}
                onChange={(e) => setBrand((p) => ({ ...p, tone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Helpful and professional"
              />
            </div>

            {/* Publish toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div>
                <p className="text-sm font-medium">Publish Business Page</p>
                <p className="text-xs text-muted-foreground">Make your AI page accessible to customers</p>
              </div>
              <Switch
                checked={brand.is_published ?? false}
                onCheckedChange={(val) => setBrand((p) => ({ ...p, is_published: val }))}
              />
            </div>

            <SaveBtn saving={brandSaving} saved={brandSaved} />
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
