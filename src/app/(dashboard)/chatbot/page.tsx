"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LivePhonePreview } from "@/components/ui/live-phone-preview";
import {
  Bot, Settings, Globe,
  Loader2, Save, Sparkles, Check,
} from "lucide-react";

const PERSONALITIES = [
  { value: "professional", label: "Professional", desc: "Concise, accurate, and helpful" },
  { value: "friendly",     label: "Friendly",     desc: "Warm, conversational, and enthusiastic" },
  { value: "corporate",    label: "Corporate",    desc: "Formal business tone" },
  { value: "luxury",       label: "Luxury",       desc: "Elegant and sophisticated" },
  { value: "medical",      label: "Medical",      desc: "Precise, empathetic, professional" },
  { value: "legal",        label: "Legal",        desc: "Clear, precise, authoritative" },
  { value: "custom",       label: "Custom",       desc: "Define your own personality" },
];

const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Arabic", "Portuguese", "Japanese"];

export default function ChatbotPage() {
  const { business, fetchBusiness } = useAppStore();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);

  const [form, setForm] = useState({
    bot_name: "AI Assistant",
    greeting_message: "Hello! How can I help you today?",
    personality: "professional",
    custom_personality_prompt: "",
    languages: ["English"],
    primary_color: "#6366f1",
    tone: "Helpful and professional",
    chat_position: "right" as "left" | "right",
    logo_url: "",
  });

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    if (!business?.id) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("brand_settings")
        .select("*")
        .eq("business_id", business.id)
        .single();
      if (data) {
        setForm({
          bot_name: data.bot_name || "AI Assistant",
          greeting_message: data.greeting_message || "Hello! How can I help you today?",
          personality: data.personality || "professional",
          custom_personality_prompt: data.custom_personality_prompt || "",
          languages: data.languages || ["English"],
          primary_color: data.primary_color || "#6366f1",
          tone: data.tone || "Helpful and professional",
          chat_position: data.chat_position || "right",
          logo_url: data.logo_url || "",
        });
      }
      setLoading(false);
    };
    load();
  }, [business?.id, supabase]);

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    const { error } = await supabase.from("brand_settings").upsert({
      business_id: business.id,
      bot_name: form.bot_name,
      greeting_message: form.greeting_message,
      personality: form.personality,
      custom_personality_prompt: form.personality === "custom" ? form.custom_personality_prompt : null,
      languages: form.languages,
      primary_color: form.primary_color,
      tone: form.tone,
      chat_position: form.chat_position,
      logo_url: form.logo_url || null,
    });
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setPreviewReloadKey((k) => k + 1);
    }
    setSaving(false);
  };

  const toggleLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Chatbot</h1>
          <p className="text-muted-foreground">Configure your AI chat assistant</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : saved ? <Check size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {/* Settings + live preview side by side */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Basic Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings size={16} className="text-primary" /> Basic Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bot Name</label>
                  <input
                    type="text" value={form.bot_name}
                    onChange={(e) => setForm({ ...form, bot_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="AI Assistant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Greeting Message</label>
                  <textarea
                    value={form.greeting_message} rows={3}
                    onChange={(e) => setForm({ ...form, greeting_message: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Hello! How can I help you today?"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tone</label>
                  <select
                    value={form.tone}
                    onChange={(e) => setForm({ ...form, tone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="Helpful and professional">Helpful and professional</option>
                    <option value="Casual and friendly">Casual and friendly</option>
                    <option value="Warm and welcoming">Warm and welcoming</option>
                    <option value="Formal and corporate">Formal and corporate</option>
                    <option value="Luxury and premium">Luxury and premium</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Chat Position</label>
                  <div className="flex gap-2">
                    {(["left", "right"] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setForm({ ...form, chat_position: pos })}
                        className={`flex-1 px-4 py-2 rounded-lg border text-sm capitalize transition-colors ${
                          form.chat_position === pos
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Personality */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-primary" /> AI Personality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setForm({ ...form, personality: p.value })}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      form.personality === p.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{p.label}</span>
                      {form.personality === p.value && <Check size={14} className="text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                  </button>
                ))}
                {form.personality === "custom" && (
                  <textarea
                    value={form.custom_personality_prompt}
                    onChange={(e) => setForm({ ...form, custom_personality_prompt: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring mt-2"
                    rows={4}
                    placeholder="Describe how you want the AI to behave..."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Language & Theme */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe size={16} className="text-primary" /> Language & Theme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Supported Languages</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        form.languages.includes(lang)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Primary Color</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color" value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                  />
                  <input
                    type="text" value={form.primary_color}
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <LivePhonePreview
          reloadKey={previewReloadKey}
          label="Live Preview"
          sublabel="— updates on save"
          emptyMessage="Set up your business slug in Settings to preview"
          sticky
        />
      </div>
    </div>
  );
}
