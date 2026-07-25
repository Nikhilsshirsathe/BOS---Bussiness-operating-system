"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera, Upload, MapPin, Globe, Phone, Mail, Clock,
  MessageCircle, Share2, Briefcase, UserCheck, ChevronRight,
  ChevronLeft, Check, Loader2, Bot, Tag, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const CATEGORIES = [
  "Restaurant & Food","Retail & Shopping","Health & Wellness","Beauty & Salon",
  "Education & Training","Legal & Finance","Medical & Dental","Real Estate",
  "Technology","Automotive","Construction","Entertainment","Other",
];

type Hours = { open: string; close: string; closed: boolean };
type HoursMap = Record<string, Hours>;

interface ProfileData {
  business_name: string;
  tagline: string;
  category: string;
  description: string;
  phone: string;
  email: string;
  website_url: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  social_instagram: string;
  social_twitter: string;
  social_facebook: string;
  social_linkedin: string;
  hours: HoursMap;
  logo_url: string;
  cover_url: string;
}


const defaultHours = (): HoursMap =>
  Object.fromEntries(DAYS.map((d) => [d, { open: "09:00", close: "18:00", closed: d === "Sunday" }]));

export default function ProfileSetupPage() {
  const router = useRouter();
  const logoRef  = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [step,    setStep]    = useState(1);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [bizId,   setBizId]   = useState<string | null>(null);

  const [data, setData] = useState<ProfileData>({
    business_name: "", tagline: "", category: "", description: "",
    phone: "", email: "", website_url: "",
    address: "", city: "", state: "", country: "India", postal_code: "",
    social_instagram: "", social_twitter: "", social_facebook: "", social_linkedin: "",
    hours: defaultHours(),
    logo_url: "", cover_url: "",
  });

  // Load existing business on mount
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();
      if (biz) {
        setBizId(biz.id);
        setData((prev) => ({
          ...prev,
          business_name: biz.business_name ?? "",
          tagline:       biz.tagline       ?? "",
          category:      biz.category      ?? "",
          description:   biz.description   ?? "",
          phone:         biz.phone         ?? "",
          email:         biz.email         ?? "",
          website_url:   biz.website_url   ?? "",
          address:       biz.address       ?? "",
          city:          biz.city          ?? "",
          state:         biz.state         ?? "",
          country:       biz.country       ?? "India",
          postal_code:   biz.postal_code   ?? "",
          logo_url:      biz.logo_url      ?? "",
          cover_url:     biz.cover_url     ?? "",
          social_instagram: biz.social_links?.instagram ?? "",
          social_twitter:   biz.social_links?.twitter   ?? "",
          social_facebook:  biz.social_links?.facebook  ?? "",
          social_linkedin:  biz.social_links?.linkedin  ?? "",
          hours: biz.opening_hours && Object.keys(biz.opening_hours).length
            ? biz.opening_hours : defaultHours(),
        }));
      }
    })();
  }, [router]);

  const set = (k: keyof ProfileData, v: string) => setData((p) => ({ ...p, [k]: v }));

  const uploadImage = async (file: File, bucket: string): Promise<string> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const ext  = file.name.split(".").pop();
    const path = `${user!.id}/${bucket}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("business-assets").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, field: "logo_url" | "cover_url") => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, field === "logo_url" ? "logo" : "cover");
      set(field, url);
    } catch {
      setError("Image upload failed. Using local preview.");
      set(field, URL.createObjectURL(file));
    }
  };


  const save = async (goToDashboard = false) => {
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const payload = {
        business_name: data.business_name,
        tagline:       data.tagline,
        category:      data.category,
        description:   data.description,
        phone:         data.phone,
        email:         data.email,
        website_url:   data.website_url,
        address:       data.address,
        city:          data.city,
        state:         data.state,
        country:       data.country,
        postal_code:   data.postal_code,
        logo_url:      data.logo_url,
        cover_url:     data.cover_url,
        opening_hours: data.hours,
        social_links: {
          instagram: data.social_instagram,
          twitter:   data.social_twitter,
          facebook:  data.social_facebook,
          linkedin:  data.social_linkedin,
        },
        onboarding_completed: goToDashboard,
        updated_at: new Date().toISOString(),
      };

      if (bizId) {
        await supabase.from("businesses").update(payload).eq("id", bizId);
      } else {
        const slug = data.business_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const { data: newBiz } = await supabase.from("businesses").insert({
          owner_id: user.id, slug, industry: data.category || "Other", ...payload,
        }).select("id").single();
        if (newBiz) setBizId(newBiz.id);
      }

      if (goToDashboard) router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const TOTAL_STEPS = 4;
  const next = () => { save(); setStep((s) => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const inputCls = "w-full px-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";


  // ── Step renderers ──────────────────────────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Photos & Branding</h2>
        <p className="text-sm text-muted-foreground">Add a logo and cover image to make your profile stand out</p>
      </div>

      {/* Cover Photo */}
      <div>
        <label className="block text-sm font-medium mb-2">Cover Photo</label>
        <div
          className="relative h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-dashed border-border cursor-pointer group"
          onClick={() => coverRef.current?.click()}
        >
          {data.cover_url ? (
            <Image src={data.cover_url} alt="cover" fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors">
              <Upload size={28} className="mb-2" />
              <span className="text-sm font-medium">Click to upload cover photo</span>
              <span className="text-xs mt-1">Recommended: 1200×400px</span>
            </div>
          )}
          <div className="absolute bottom-3 right-3 bg-black/60 text-white rounded-lg px-3 py-1.5 text-xs flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={12} /> Change cover
          </div>
        </div>
        <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, "cover_url")} />
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium mb-2">Business Logo / Profile Photo</label>
        <div className="flex items-center gap-5">
          <div
            className="relative w-24 h-24 rounded-full overflow-hidden bg-primary/10 border-2 border-dashed border-border cursor-pointer group flex-shrink-0"
            onClick={() => logoRef.current?.click()}
          >
            {data.logo_url ? (
              <Image src={data.logo_url} alt="logo" fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                <Camera size={24} />
              </div>
            )}
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()} className="gap-2">
              <Upload size={14} /> Upload Logo
            </Button>
            <p className="text-xs text-muted-foreground mt-1.5">PNG or JPG · Square · Min 200×200px</p>
          </div>
        </div>
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, "logo_url")} />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">Basic Information</h2>
        <p className="text-sm text-muted-foreground">Tell customers what your business is about</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Business Name *</label>
          <input className={inputCls} value={data.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="e.g. SmileCare Dental" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tagline</label>
          <input className={inputCls} value={data.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="e.g. Your smile, our priority" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select className={inputCls} value={data.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className={`${inputCls} h-28 resize-none`}
            value={data.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe your business, services, and what makes you unique…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className={`${inputCls} pl-9`} value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Business Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" className={`${inputCls} pl-9`} value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="hello@yourbusiness.com" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Website</label>
          <div className="relative">
            <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className={`${inputCls} pl-9`} value={data.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://yourbusiness.com" />
          </div>
        </div>
      </div>
    </div>
  );


  const renderStep3 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-1">Location</h2>
        <p className="text-sm text-muted-foreground">Help customers find you</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Street Address</label>
        <div className="relative">
          <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={`${inputCls} pl-9`} value={data.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main Street" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input className={inputCls} value={data.city} onChange={(e) => set("city", e.target.value)} placeholder="Mumbai" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">State</label>
          <input className={inputCls} value={data.state} onChange={(e) => set("state", e.target.value)} placeholder="Maharashtra" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Postal Code</label>
          <input className={inputCls} value={data.postal_code} onChange={(e) => set("postal_code", e.target.value)} placeholder="400001" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <input className={inputCls} value={data.country} onChange={(e) => set("country", e.target.value)} placeholder="India" />
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      {/* Social Links */}
      <div>
        <h2 className="text-xl font-bold mb-1">Social Media</h2>
        <p className="text-sm text-muted-foreground mb-4">Connect your social profiles</p>
        <div className="space-y-3">
          {[
            { icon: MessageCircle, label: "Instagram", key: "social_instagram" as const, placeholder: "instagram.com/yourbusiness" },
            { icon: MessageCircle, label: "Twitter/X",  key: "social_twitter"   as const, placeholder: "twitter.com/yourbusiness" },
            { icon: Share2,       label: "Facebook",   key: "social_facebook"  as const, placeholder: "facebook.com/yourbusiness" },
            { icon: Briefcase,    label: "LinkedIn",   key: "social_linkedin"  as const, placeholder: "linkedin.com/company/yourbusiness" },
          ].map(({ icon: Icon, label, key, placeholder }) => (
            <div key={key} className="relative">
              <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${inputCls} pl-9`}
                value={data[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                aria-label={label}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Business Hours */}
      <div>
        <h2 className="text-xl font-bold mb-1">Business Hours</h2>
        <p className="text-sm text-muted-foreground mb-4">Set your opening and closing times</p>
        <div className="space-y-2">
          {DAYS.map((day) => {
            const h = data.hours[day];
            return (
              <div key={day} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className="w-24 text-sm font-medium shrink-0">{day}</div>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={!h.closed}
                    onChange={(e) => setData((p) => ({ ...p, hours: { ...p.hours, [day]: { ...h, closed: !e.target.checked } } }))}
                    className="rounded"
                  />
                  <span className="text-xs text-muted-foreground">{h.closed ? "Closed" : "Open"}</span>
                </label>
                {!h.closed && (
                  <>
                    <input
                      type="time" value={h.open}
                      onChange={(e) => setData((p) => ({ ...p, hours: { ...p.hours, [day]: { ...h, open: e.target.value } } }))}
                      className="border rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <input
                      type="time" value={h.close}
                      onChange={(e) => setData((p) => ({ ...p, hours: { ...p.hours, [day]: { ...h, close: e.target.value } } }))}
                      className="border rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );


  // ── Main render ─────────────────────────────────────────────────
  const stepMeta = [
    { icon: Camera,    label: "Photos"      },
    { icon: Building2, label: "Business"    },
    { icon: MapPin,    label: "Location"    },
    { icon: Clock,     label: "Hours & Social" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-2xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              <Bot size={16} />
            </div>
            AgentOS
          </div>
          <Button variant="ghost" size="sm" onClick={() => save(true)} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
            Skip setup
          </Button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center mb-8">
          {stepMeta.map((s, i) => {
            const num   = i + 1;
            const done  = num < step;
            const active = num === step;
            return (
              <div key={s.label} className="flex items-center flex-1 last:flex-none">
                <button
                  onClick={() => num < step && setStep(num)}
                  className={`flex flex-col items-center gap-1 group ${num <= step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${done   ? "bg-green-500 text-white"
                    : active ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    :          "bg-muted text-muted-foreground"}`}>
                    {done ? <Check size={16} /> : <s.icon size={16} />}
                  </div>
                  <span className={`text-xs hidden sm:block ${active ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </button>
                {i < stepMeta.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded transition-all ${done ? "bg-green-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-card border rounded-2xl shadow-xl overflow-hidden">
          {/* Preview banner (step 1) */}
          {step === 1 && data.cover_url && (
            <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5">
              <Image src={data.cover_url} alt="cover" fill className="object-cover" />
              {data.logo_url && (
                <div className="absolute -bottom-8 left-6 w-16 h-16 rounded-full border-4 border-card overflow-hidden bg-background">
                  <Image src={data.logo_url} alt="logo" fill className="object-cover" />
                </div>
              )}
            </div>
          )}

          <div className={`p-6 ${step === 1 && data.cover_url && data.logo_url ? "pt-12" : ""}`}>
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive mb-4">
                {error}
              </div>
            )}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t">
              <Button variant="ghost" onClick={back} disabled={step === 1} className="gap-2">
                <ChevronLeft size={16} /> Back
              </Button>

              {step < TOTAL_STEPS ? (
                <Button onClick={next} disabled={saving} className="gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                  Save & Continue <ChevronRight size={16} />
                </Button>
              ) : (
                <Button onClick={() => save(true)} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />}
                  Finish Setup
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step counter */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step} of {TOTAL_STEPS} — You can always edit this later from Settings
        </p>
      </div>
    </div>
  );
}
