"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateVisitorId } from "@/lib/utils";
import {
  MessageSquare, Phone, Calendar, Clock, MapPin,
  Globe, Star, ChevronRight, Loader2, Bot, Send,
  Link as LinkIcon,
} from "lucide-react";
import type { Business, BrandSettings } from "@/types";
import PublicVoice from "@/components/public/public-voice";
import PublicBooking from "@/components/public/public-booking";

interface FeatureData {
  chat_enabled: boolean;
  voice_enabled: boolean;
  booking_enabled: boolean;
}

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  duration_minutes: number;
  category: string | null;
}

type ActiveView = "home" | "voice" | "booking";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function PublicBusinessPage() {
  const params = useParams();
  const slug = params.slug as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [brand, setBrand] = useState<BrandSettings | null>(null);
  const [features, setFeatures] = useState<FeatureData | null>(null);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [visitorId] = useState(generateVisitorId);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<ActiveView>("home");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Try to find by slug first
      let biz: any = null;
      const slugRes = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (slugRes.data) {
        biz = slugRes.data;
      } else {
        // Fallback: match by auto-generated slug from business_name
        const allRes = await supabase
          .from("businesses")
          .select("*")
          .eq("is_active", true);
        if (allRes.data) {
          biz = allRes.data.find((b: any) => {
            const auto = b.business_name
              .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
            return auto === slug;
          }) || null;
        }
      }

      if (!biz) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setBusiness(biz as Business);

      // Set page title to business name
      document.title = biz.business_name;

      const [brandRes, featuresRes, servicesRes, hoursRes] = await Promise.all([
        supabase.from("brand_settings").select("*").eq("business_id", biz.id).single(),
        supabase.from("feature_toggles").select("*").eq("business_id", biz.id).single(),
        supabase.from("services").select("*").eq("business_id", biz.id).eq("is_active", true).order("sort_order"),
        supabase.from("business_hours").select("*").eq("business_id", biz.id).order("day_of_week"),
      ]);

      if (brandRes.data) setBrand(brandRes.data as BrandSettings);
      if (featuresRes.data) setFeatures(featuresRes.data as FeatureData);
      if (servicesRes.data) setServices(servicesRes.data as ServiceData[]);
      if (hoursRes.data) setHours(hoursRes.data);

      // Log page visit (best effort)
      supabase.from("sharing_analytics").insert({
        business_id: biz.id,
        event_type: "page_visit",
        visitor_id: visitorId,
      }).then();

      setLoading(false);
    };
    load();
  }, [slug]);

  const startChat = () => {
    if (!business || !brand) return;
    setShowChat(true);
    if (chatMessages.length === 0) {
      setChatMessages([{ role: "assistant", content: brand.greeting_message }]);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !business || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          message: msg,
          conversation_id: chatId,
          visitor_id: visitorId,
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't get a response. Please try again." },
        ]);
      } else {
        if (data.conversation_id) setChatId(data.conversation_id);
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message || "Sorry, I didn't catch that. Could you rephrase?" },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." },
      ]);
    }
    setChatLoading(false);
  };

  const primaryColor = brand?.primary_color || "#6366f1";
  const today = new Date().getDay();

  // â”€â”€ Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  // â”€â”€ Not found â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (notFound || !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Bot size={36} className="text-gray-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
          <p className="text-gray-500 text-sm">
            This business page doesn't exist or hasn't been set up yet.
          </p>
        </div>
      </div>
    );
  }

  // â”€â”€ Voice view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (activeView === "voice") {
    return <PublicVoice business={business} brand={brand} onBack={() => setActiveView("home")} />;
  }

  // â”€â”€ Booking view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (activeView === "booking") {
    return <PublicBooking business={business} brand={brand} onBack={() => setActiveView("home")} />;
  }

  // â”€â”€ Home view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="min-h-screen bg-white">

      {/* Hero banner with brand colour */}
      <div className="h-24 w-full" style={{ backgroundColor: primaryColor + "18" }} />

      <div className="max-w-lg mx-auto px-4 pb-16 -mt-12">

        {/* Business avatar */}
        <div className="flex flex-col items-center text-center mb-6">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.business_name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg mb-3"
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-3 flex items-center justify-center text-3xl font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {business.business_name[0].toUpperCase()}
            </div>
          )}

          <h1 className="text-2xl font-bold text-gray-900">{business.business_name}</h1>

          {business.industry && (
            <span
              className="mt-1.5 text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: primaryColor + "18", color: primaryColor }}
            >
              {business.industry}
            </span>
          )}

          {business.description && (
            <p className="mt-3 text-sm text-gray-500 max-w-sm leading-relaxed">
              {business.description}
            </p>
          )}

          {/* Contact chips */}
          {(business.phone || (business as any).email || business.address) && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full px-3 py-1.5 transition-colors"
                >
                  <Phone size={11} /> {business.phone}
                </a>
              )}
              {(business as any).email && (
                <a
                  href={`mailto:${(business as any).email}`}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full px-3 py-1.5 transition-colors"
                >
                  <Globe size={11} /> {(business as any).email}
                </a>
              )}
              {business.address && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1.5">
                  <MapPin size={11} /> {business.address}
                </span>
              )}
            </div>
          )}
        </div>

        {/* â”€â”€ AI Action Buttons â”€â”€ */}
        <div className="space-y-3 mb-6">
          {(!features || features.chat_enabled) && (
            <button
              onClick={startChat}
              className="w-full flex items-center justify-between p-4 rounded-2xl text-white shadow-md transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <MessageSquare size={19} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">Chat with AI</p>
                  <p className="text-xs opacity-75">{brand?.bot_name || "AI Assistant"} Â· Online now</p>
                </div>
              </div>
              <ChevronRight size={18} className="opacity-60" />
            </button>
          )}

          {(!features || features.voice_enabled) && (
            <button
              onClick={() => setActiveView("voice")}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 bg-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              style={{ borderColor: primaryColor + "40" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: primaryColor + "15" }}
                >
                  <Phone size={19} style={{ color: primaryColor }} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-900">Talk with AI Voice Agent</p>
                  <p className="text-xs text-gray-400">Speak naturally â€” get instant answers</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          )}

          {(!features || features.booking_enabled) && (
            <button
              onClick={() => setActiveView("booking")}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 bg-white shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
              style={{ borderColor: primaryColor + "40" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: primaryColor + "15" }}
                >
                  <Calendar size={19} style={{ color: primaryColor }} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-gray-900">Book Appointment</p>
                  <p className="text-xs text-gray-400">Check availability &amp; schedule online</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          )}
        </div>

        {/* â”€â”€ Services â”€â”€ */}
        {services.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Star size={14} style={{ color: primaryColor }} /> Our Services
            </h2>
            <div className="space-y-2">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{service.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{service.duration_minutes} min</p>
                  </div>
                  {service.price != null && (
                    <p className="text-sm font-bold shrink-0 ml-4" style={{ color: primaryColor }}>
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: service.currency,
                        maximumFractionDigits: 0,
                      }).format(service.price)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* â”€â”€ Working Hours â”€â”€ */}
        {hours.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl border bg-white">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock size={14} style={{ color: primaryColor }} /> Working Hours
            </h2>
            <div className="space-y-1.5">
              {hours.map((h) => (
                <div key={h.day_of_week} className="flex justify-between text-sm">
                  <span className={today === h.day_of_week ? "font-semibold text-gray-900" : "text-gray-400"}>
                    {DAY_NAMES[h.day_of_week]}
                  </span>
                  {h.is_available ? (
                    <span className={today === h.day_of_week ? "font-semibold text-gray-900" : "text-gray-500"}>
                      {h.start_time.slice(0, 5)} â€“ {h.end_time.slice(0, 5)}
                    </span>
                  ) : (
                    <span className="text-gray-300">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* â”€â”€ Social Links â”€â”€ */}
        {business.social_links && Object.keys(business.social_links).length > 0 && (
          <div className="flex justify-center gap-3 mb-6">
            {Object.entries(business.social_links).map(([platform, url]) => {
              if (!url) return null;
              return (
                <a
                  key={platform}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs text-gray-500 hover:bg-gray-50 transition-colors capitalize"
                  title={platform}
                >
                  <LinkIcon size={11} />
                  {platform}
                </a>
              );
            })}
          </div>
        )}

        {/* â”€â”€ Footer â”€â”€ */}
        <p className="text-center text-xs text-gray-300 mt-4">
          Powered by <span className="font-semibold">AgentOS</span>
        </p>
      </div>

      {/* â”€â”€ Chat Widget â”€â”€ */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowChat(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            {/* Chat header */}
            <div className="p-4 flex items-center gap-3 text-white" style={{ backgroundColor: primaryColor }}>
              {business.logo_url ? (
                <img src={business.logo_url} alt="" className="w-10 h-10 rounded-full object-cover bg-white/20" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                  {business.business_name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{business.business_name}</p>
                <p className="text-xs opacity-75">{brand?.bot_name || "AI Assistant"} Â· Online</p>
              </div>
              <button onClick={() => setShowChat(false)} className="text-white/70 hover:text-white text-xl leading-none">âœ•</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.role === "user" ? "text-white rounded-tr-sm" : "bg-white text-gray-800 rounded-tl-sm shadow-sm"
                    }`}
                    style={msg.role === "user" ? { backgroundColor: primaryColor } : {}}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((delay) => (
                        <div
                          key={delay}
                          className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="p-3 border-t bg-white flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-4 py-2.5 border rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as any]: primaryColor + "40" }}
                placeholder="Type your messageâ€¦"
                disabled={chatLoading}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
