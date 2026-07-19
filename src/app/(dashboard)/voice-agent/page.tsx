"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LivePhonePreview } from "@/components/ui/live-phone-preview";
import {
  Phone, Mic, Volume2, Settings, Loader2, Save, Check,
  Headphones, Bot,
} from "lucide-react";

export default function VoiceAgentPage() {
  const { business, fetchBusiness } = useAppStore();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<any[]>([]);
  const [previewReloadKey, setPreviewReloadKey] = useState(0);

  const [form, setForm] = useState({
    voice_enabled: true,
    greeting: "Hello! Thank you for calling. How can I help you today?",
    voice_type: "female",
    language: "en-US",
    max_duration: 5,
    collect_contact: true,
    book_appointments: true,
  });

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    if (!business?.id) return;
    const load = async () => {
      setLoading(true);
      const { data: toggles } = await supabase
        .from("feature_toggles")
        .select("*")
        .eq("business_id", business.id)
        .single();
      if (toggles) {
        setForm((prev) => ({ ...prev, voice_enabled: toggles.voice_enabled }));
      }
      const { data: voiceCalls } = await supabase
        .from("voice_calls")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setCalls(voiceCalls || []);
      setLoading(false);
    };
    load();
  }, [business?.id, supabase]);

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);
    await supabase.from("feature_toggles").upsert({
      business_id: business.id,
      voice_enabled: form.voice_enabled,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    setPreviewReloadKey((k) => k + 1);
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
          <h1 className="text-3xl font-bold">Voice Agent</h1>
          <p className="text-muted-foreground">Configure your AI voice receptionist</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : saved ? <Check size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
        </Button>
      </div>

      {/* Config + live preview */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Voice Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings size={16} className="text-primary" /> Voice Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Enable Voice Agent</p>
                    <p className="text-xs text-muted-foreground">Let customers talk to AI via voice</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.voice_enabled}
                      onChange={(e) => setForm({ ...form, voice_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Greeting Message</label>
                  <textarea
                    value={form.greeting} rows={3}
                    onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Hello! Thank you for calling..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Voice Type</label>
                  <div className="flex gap-2">
                    {[{ value: "female", label: "Female Voice" }, { value: "male", label: "Male Voice" }].map((v) => (
                      <button
                        key={v.value}
                        onClick={() => setForm({ ...form, voice_type: v.value })}
                        className={`flex-1 px-4 py-2 rounded-lg border text-sm transition-colors ${
                          form.voice_type === v.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Call Duration (minutes)</label>
                  <input
                    type="number" value={form.max_duration} min={1} max={30}
                    onChange={(e) => setForm({ ...form, max_duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Capabilities</p>
                  {[
                    { key: "collect_contact",   label: "Collect customer contact information" },
                    { key: "book_appointments", label: "Book appointments via voice" },
                  ].map((item) => (
                    <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(form as any)[item.key]}
                        onChange={(e) => setForm({ ...form, [item.key]: e.target.checked })}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* How it works */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Headphones size={16} className="text-primary" /> How Voice Agent Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { step: 1, icon: Mic,     title: "Customer Speaks",  desc: "Customer clicks 'Talk with AI' on your business page and speaks naturally." },
                  { step: 2, icon: Bot,     title: "AI Processes",     desc: "Speech-to-text converts their voice, AI understands intent, and retrieves information." },
                  { step: 3, icon: Volume2, title: "AI Responds",      desc: "Text-to-speech generates a natural voice response. The AI can book appointments, answer questions, and more." },
                  { step: 4, icon: Phone,   title: "Call Complete",    desc: "The conversation is logged, and if an appointment was booked, it appears in your dashboard." },
                ].map((s) => (
                  <div key={s.step} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <s.icon size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
                <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Voice Agent Note</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Uses the Browser Web Speech API for STT and TTS. Customers can have natural
                    conversations with your AI receptionist directly in their browser.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Voice Calls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone size={16} className="text-primary" /> Recent Voice Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calls.length > 0 ? (
                <div className="space-y-2">
                  {calls.map((call) => (
                    <div key={call.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          call.status === "completed" ? "bg-green-50 dark:bg-green-950/50 text-green-500" :
                          call.status === "active"    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-500"  :
                                                        "bg-muted text-muted-foreground"
                        }`}>
                          <Phone size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{call.visitor_name || "Anonymous"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(call.created_at).toLocaleDateString()} · {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                          call.status === "completed" ? "bg-green-50 dark:bg-green-950/50 text-green-600" :
                          call.status === "active"    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600"   :
                                                        "bg-muted text-muted-foreground"
                        }`}>
                          {call.status}
                        </span>
                        {call.appointment_booked && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600">
                            Booked
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No voice calls yet</p>
                  <p className="text-xs">Voice calls will appear here once customers start using the voice agent</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live preview */}
        <LivePhonePreview
          reloadKey={previewReloadKey}
          label="Live Preview"
          sublabel="— try the voice agent"
          emptyMessage="Set up your business slug in Settings to preview"
          sticky
        />
      </div>
    </div>
  );
}
