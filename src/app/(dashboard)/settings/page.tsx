"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Settings, Building2, Bot, ToggleLeft, Save, Loader2, Check,
  Globe, Phone, Mail, MapPin, Link as LinkIcon, User,
} from "lucide-react";
import { slugify } from "@/lib/utils";

export default function SettingsPage() {
  const { business, fetchBusiness } = useAppStore();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    business_name: "",
    slug: "",
    description: "",
    industry: "Other",
    phone: "",
    email: "",
    address: "",
    website_url: "",
    logo_url: "",
    timezone: "UTC",
    social_links: {} as Record<string, string>,
  });

  const [features, setFeatures] = useState({
    chat_enabled: true,
    voice_enabled: true,
    booking_enabled: true,
  });

  const [brand, setBrand] = useState({
    personality: "professional",
    greeting_message: "Hello! How can I help you today?",
    primary_color: "#6366f1",
    is_published: false,
  });

  const INDUSTRIES = [
    "Other", "Healthcare", "Salon & Spa", "Fitness", "Restaurant",
    "Education", "Legal", "Consulting", "Retail", "Real Estate",
    "Automotive", "Technology", "Financial Services", "Hospitality",
  ];

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    if (!business?.id) return;
    loadData();
  }, [business?.id]);

  const loadData = async () => {
    if (!business?.id) return;
    setLoading(true);

    setForm({
      business_name: business.business_name || "",
      slug: business.slug || "",
      description: business.description || "",
      industry: business.industry || "Other",
      phone: business.phone || "",
      email: business.email || "",
      address: business.address || "",
      website_url: business.website_url || "",
      logo_url: business.logo_url || "",
      timezone: business.timezone || "UTC",
      social_links: (business.social_links || {}) as Record<string, string>,
    });

    const [{ data: f }, { data: b }] = await Promise.all([
      supabase.from("feature_toggles").select("*").eq("business_id", business.id).single(),
      supabase.from("brand_settings").select("*").eq("business_id", business.id).single(),
    ]);

    if (f) setFeatures({ chat_enabled: f.chat_enabled, voice_enabled: f.voice_enabled, booking_enabled: f.booking_enabled });
    if (b) setBrand({ personality: b.personality, greeting_message: b.greeting_message, primary_color: b.primary_color, is_published: b.is_published });

    setLoading(false);
  };

  const handleSave = async () => {
    if (!business?.id) return;
    setSaving(true);

    await Promise.all([
      supabase.from("businesses").update({
        business_name: form.business_name,
        slug: slugify(form.slug || form.business_name),
        description: form.description,
        industry: form.industry,
        phone: form.phone,
        email: form.email,
        address: form.address,
        website_url: form.website_url,
        logo_url: form.logo_url || null,
        timezone: form.timezone,
        social_links: form.social_links,
      }).eq("id", business.id),

      supabase.from("feature_toggles").upsert({
        business_id: business.id,
        ...features,
      }),

      supabase.from("brand_settings").upsert({
        business_id: business.id,
        personality: brand.personality,
        greeting_message: brand.greeting_message,
        primary_color: brand.primary_color,
        is_published: brand.is_published,
      }),
    ]);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    fetchBusiness();
  };

  const addSocialLink = (platform: string) => {
    setForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: "" },
    }));
  };

  const updateSocialLink = (platform: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [platform]: value },
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
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your business and AI configuration</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : saved ? <Check size={16} className="mr-2" /> : <Save size={16} className="mr-2" />}
          {saving ? "Saving..." : saved ? "Saved!" : "Save All Changes"}
        </Button>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 size={16} className="text-primary" /> Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Business Name</label>
              <input type="text" value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Page URL (slug)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">agentos.ai/</span>
                <input type="text" value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  placeholder="your-business" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} rows={3}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Describe your business..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Industry</label>
              <select value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input type="text" value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input type="url" value={form.website_url}
                onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo URL</label>
              <input type="url" value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="https://example.com/logo.png" />
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot size={16} className="text-primary" /> AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">AI Personality</label>
              <select value={brand.personality}
                onChange={(e) => setBrand({ ...brand, personality: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="corporate">Corporate</option>
                <option value="luxury">Luxury</option>
                <option value="medical">Medical</option>
                <option value="legal">Legal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Greeting Message</label>
              <textarea value={brand.greeting_message} rows={2}
                onChange={(e) => setBrand({ ...brand, greeting_message: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={brand.primary_color}
                  onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border cursor-pointer" />
                <input type="text" value={brand.primary_color}
                  onChange={(e) => setBrand({ ...brand, primary_color: e.target.value })}
                  className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <p className="font-medium text-sm">Publish Business Page</p>
                <p className="text-xs text-muted-foreground">Make your page accessible to customers</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={brand.is_published}
                  onChange={(e) => setBrand({ ...brand, is_published: e.target.checked })}
                  className="sr-only peer" />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </CardContent>
        </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ToggleLeft size={16} className="text-primary" /> Feature Toggles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: "chat_enabled", label: "Chatbot", desc: "Enable AI chat assistant on your business page" },
              { key: "voice_enabled", label: "Voice Agent", desc: "Enable AI voice receptionist for voice conversations" },
              { key: "booking_enabled", label: "Appointment Booking", desc: "Enable online appointment booking" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox"
                    checked={(features as any)[item.key]}
                    onChange={(e) => setFeatures((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon size={16} className="text-primary" /> Social Media Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(form.social_links).map(([platform, url]) => (
            <div key={platform} className="flex items-center gap-2">
              <span className="w-24 text-sm font-medium capitalize">{platform}</span>
              <input type="url" value={url}
                onChange={(e) => updateSocialLink(platform, e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={`https://${platform}.com/...`} />
              <button onClick={() => {
                const { [platform]: _, ...rest } = form.social_links;
                setForm((prev) => ({ ...prev, social_links: rest }));
              }} className="p-2 text-muted-foreground hover:text-red-500">✕</button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            {["instagram", "facebook", "twitter", "linkedin", "youtube"].filter((p) => !(p in form.social_links)).map((platform) => (
              <Button key={platform} size="sm" variant="outline" onClick={() => addSocialLink(platform)}>
                + {platform}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}