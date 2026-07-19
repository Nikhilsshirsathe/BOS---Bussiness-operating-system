"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bot, Building2, Sparkles, Check, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Personality } from "@/types";

const STEPS = ["Business", "Features", "AI Style", "Go Live"] as const;

const INDUSTRIES = [
  "Healthcare / Medical", "Dental Clinic", "Legal / Law Firm",
  "Real Estate", "Beauty & Wellness", "Fitness & Gym",
  "Education & Coaching", "Restaurant & Food", "Retail & E-commerce",
  "Technology / SaaS", "Finance & Accounting", "Home Services", "Other",
];

const PERSONALITIES: { value: Personality; label: string; emoji: string }[] = [
  { value: "professional", label: "Professional",  emoji: "💼" },
  { value: "friendly",     label: "Friendly",      emoji: "😊" },
  { value: "corporate",    label: "Corporate",      emoji: "🏢" },
  { value: "luxury",       label: "Luxury",         emoji: "✨" },
  { value: "medical",      label: "Medical",        emoji: "🏥" },
  { value: "legal",        label: "Legal",          emoji: "⚖️" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [bizName,      setBizName]      = useState("");
  const [slug,         setSlug]         = useState("");
  const [industry,     setIndustry]     = useState("");
  const [description,  setDescription]  = useState("");
  const [chatEnabled,  setChatEnabled]  = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [bookEnabled,  setBookEnabled]  = useState(true);
  const [personality,  setPersonality]  = useState<Personality>("professional");
  const [botName,      setBotName]      = useState("AI Assistant");
  const [greeting,     setGreeting]     = useState("Hi! How can I help you today?");
  const [color,        setColor]        = useState("#6366f1");

  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const canNext = [
    bizName.trim().length >= 2 && industry,
    true,
    botName.trim().length > 0,
  ][step] ?? true;

  const finish = async () => {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const finalSlug = slug || autoSlug(bizName);

    // 1. Create business
    const { data: biz, error: bizErr } = await supabase.from("businesses").insert({
      owner_id: user.id,
      business_name: bizName,
      slug: finalSlug,
      industry,
      description,
      onboarding_completed: true,
    }).select("id").single();

    if (bizErr || !biz) {
      alert("Failed to create business. Please try again.");
      setSaving(false);
      return;
    }

    // 2. Parallel inserts
    await Promise.all([
      supabase.from("brand_settings").insert({
        business_id: biz.id,
        bot_name: botName,
        greeting_message: greeting,
        personality,
        primary_color: color,
        is_published: true,
      }),
      supabase.from("feature_toggles").insert({
        business_id: biz.id,
        chat_enabled: chatEnabled,
        voice_enabled: voiceEnabled,
        booking_enabled: bookEnabled,
      }),
      // Default business hours Mon–Fri
      supabase.from("business_hours").insert(
        [1,2,3,4,5].map((day) => ({
          business_id: biz.id,
          day_of_week: day,
          start_time: "09:00",
          end_time: "17:00",
          is_available: true,
        }))
      ),
      // Default appointment config
      supabase.from("appointment_config").insert({
        business_id: biz.id,
        slot_duration_minutes: 30,
        buffer_minutes: 10,
        max_daily_appointments: 20,
        advance_booking_days: 30,
        cancellation_hours: 24,
      }),
    ]);

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Bot size={18} className="text-primary-foreground" />
          </div>
          AgentOS
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < step  ? "bg-primary text-primary-foreground" :
                i === step ? "bg-primary/10 text-primary border-2 border-primary" :
                             "bg-muted text-muted-foreground"
              )}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={cn("text-xs hidden sm:block", i === step ? "text-primary font-medium" : "text-muted-foreground")}>{s}</span>
              {i < STEPS.length - 1 && <div className={cn("w-8 h-px", i < step ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border rounded-2xl shadow-xl p-6 space-y-6">
          {/* ── Step 0: Business Info ── */}
          {step === 0 && (
            <>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Building2 size={20} className="text-primary" />Business Info</h2>
                <p className="text-muted-foreground text-sm mt-1">Tell us about your business</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Business Name <span className="text-destructive">*</span></label>
                  <input value={bizName} onChange={(e) => {
                    setBizName(e.target.value);
                    if (!slug) setSlug(autoSlug(e.target.value));
                  }}
                    placeholder="SmileCare Dental Clinic"
                    className="w-full px-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Your AI Page URL</label>
                  <div className="flex items-center border rounded-xl overflow-hidden bg-muted">
                    <span className="px-3 text-xs text-muted-foreground whitespace-nowrap">agentos.ai/b/</span>
                    <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder={autoSlug(bizName || "your-business")}
                      className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none pr-3 font-mono" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Industry <span className="text-destructive">*</span></label>
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                    {INDUSTRIES.map((ind) => (
                      <button key={ind} type="button" onClick={() => setIndustry(ind)}
                        className={cn("text-left text-xs px-3 py-2 rounded-xl border transition-all",
                          industry === ind ? "border-primary bg-primary/5 font-medium text-primary" : "hover:border-primary/40")}>
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Description (optional)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    placeholder="Briefly describe your business…"
                    className="w-full px-4 py-2.5 border rounded-xl bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
            </>
          )}

          {/* ── Step 1: Features ── */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles size={20} className="text-primary" />Choose Features</h2>
                <p className="text-muted-foreground text-sm mt-1">Select what customers can do on your page</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: "chat",  label: "AI Chat Assistant",     desc: "Text-based Q&A and lead capture",  val: chatEnabled,  set: setChatEnabled,  emoji: "💬" },
                  { key: "voice", label: "AI Voice Receptionist", desc: "Voice calls handled by AI",         val: voiceEnabled, set: setVoiceEnabled, emoji: "📞" },
                  { key: "book",  label: "Appointment Booking",   desc: "Customers book slots online",       val: bookEnabled,  set: setBookEnabled,  emoji: "📅" },
                ].map(({ key, label, desc, val, set, emoji }) => (
                  <button key={key} type="button" onClick={() => set(!val)}
                    className={cn("w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                      val ? "border-primary bg-primary/5" : "hover:border-primary/30")}>
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      val ? "bg-primary border-primary" : "border-muted-foreground")}>
                      {val && <Check size={12} className="text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── Step 2: AI Style ── */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Bot size={20} className="text-primary" />AI Personality</h2>
                <p className="text-muted-foreground text-sm mt-1">Customise how your AI assistant sounds</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Personality</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PERSONALITIES.map((p) => (
                      <button key={p.value} type="button" onClick={() => setPersonality(p.value)}
                        className={cn("flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all",
                          personality === p.value ? "border-primary bg-primary/5" : "hover:border-primary/30")}>
                        <span className="text-2xl">{p.emoji}</span>
                        <span className="text-xs font-medium">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium block mb-1">Bot Name</label>
                    <input value={botName} onChange={(e) => setBotName(e.target.value)}
                      className="w-full px-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="AI Assistant" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">Brand Color</label>
                    <div className="flex gap-2">
                      <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                        className="h-10 w-14 px-1 border rounded-xl cursor-pointer" />
                      <input value={color} onChange={(e) => setColor(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-xl bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Greeting Message</label>
                  <input value={greeting} onChange={(e) => setGreeting(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Hi! How can I help you?" />
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Go Live ── */}
          {step === 3 && (
            <>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><Check size={20} className="text-primary" />Ready to Go Live!</h2>
                <p className="text-muted-foreground text-sm mt-1">Review and create your AI business page</p>
              </div>
              <div className="rounded-xl border bg-muted/50 p-4 space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span className="font-semibold">{bizName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span>{industry}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">URL</span><span className="font-mono text-xs">agentos.ai/b/{slug || autoSlug(bizName)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Features</span>
                  <span>{[chatEnabled && "Chat", voiceEnabled && "Voice", bookEnabled && "Booking"].filter(Boolean).join(" · ")}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">AI Style</span><span className="capitalize">{personality}</span></div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                You can change all settings later from your dashboard.
              </p>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>← Back</Button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                Next <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button onClick={finish} disabled={saving} className="px-8">
                {saving ? <><Loader2 size={16} className="mr-2 animate-spin" />Creating…</> : "🚀 Launch My AI Page"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
