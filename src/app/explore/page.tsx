"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search, MapPin, Phone, Globe, Bot, Store,
  MessageCircle, Share2, Briefcase,
  Clock, Star, ChevronRight, LogOut, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  "All","Restaurant & Food","Retail & Shopping","Health & Wellness",
  "Beauty & Salon","Education & Training","Medical & Dental",
  "Legal & Finance","Real Estate","Technology","Automotive","Entertainment","Other",
];

interface Business {
  id: string;
  business_name: string;
  slug: string | null;
  tagline: string | null;
  category: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  social_links: Record<string, string>;
  opening_hours: Record<string, { open: string; close: string; closed: boolean }> | null;
}

function isOpenNow(hours: Business["opening_hours"]): boolean | null {
  if (!hours) return null;
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const now   = new Date();
  const day   = days[now.getDay()];
  const h     = hours[day];
  if (!h || h.closed) return false;
  const [oh, om] = h.open.split(":").map(Number);
  const [ch, cm] = h.close.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins <= ch * 60 + cm;
}


function BusinessCard({ biz }: { biz: Business }) {
  const open = isOpenNow(biz.opening_hours);
  const location = [biz.city, biz.state].filter(Boolean).join(", ");

  return (
    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
      {/* Cover */}
      <div className="relative h-36 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {biz.cover_url ? (
          <Image src={biz.cover_url} alt="cover" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <Store size={48} />
          </div>
        )}
        {/* Category badge */}
        {biz.category && (
          <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
            {biz.category}
          </span>
        )}
        {/* Open/Closed badge */}
        {open !== null && (
          <span className={`absolute top-3 right-3 text-xs px-2.5 py-1 rounded-full font-medium
            ${open ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}>
            {open ? "Open Now" : "Closed"}
          </span>
        )}
      </div>

      {/* Logo + Name row */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-primary/10 border border-border flex-shrink-0 -mt-8 ring-2 ring-card">
          {biz.logo_url ? (
            <Image src={biz.logo_url} alt="logo" fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-primary font-bold text-lg">
              {biz.business_name.charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-base leading-tight truncate">{biz.business_name}</h3>
          {biz.tagline && <p className="text-xs text-muted-foreground truncate mt-0.5">{biz.tagline}</p>}
        </div>
      </div>

      {/* Description */}
      {biz.description && (
        <p className="px-4 text-xs text-muted-foreground line-clamp-2 mb-2">{biz.description}</p>
      )}

      {/* Location / phone */}
      <div className="px-4 pb-3 space-y-1">
        {location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={11} /> <span className="truncate">{location}</span>
          </div>
        )}
        {biz.phone && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone size={11} /> <span>{biz.phone}</span>
          </div>
        )}
      </div>

      {/* Social icons */}
      {biz.social_links && Object.keys(biz.social_links).some((k) => biz.social_links[k]) && (
        <div className="px-4 pb-3 flex items-center gap-2">
          {biz.social_links.instagram && <a href={`https://${biz.social_links.instagram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-pink-500 transition-colors"><MessageCircle size={14} /></a>}
          {biz.social_links.twitter   && <a href={`https://${biz.social_links.twitter}`}   target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-sky-500 transition-colors"><MessageCircle size={14} /></a>}
          {biz.social_links.facebook  && <a href={`https://${biz.social_links.facebook}`}  target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-600 transition-colors"><Share2 size={14} /></a>}
          {biz.social_links.linkedin  && <a href={`https://${biz.social_links.linkedin}`}  target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-700 transition-colors"><Briefcase size={14} /></a>}
          {biz.website_url            && <a href={biz.website_url}                          target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><Globe size={14} /></a>}
        </div>
      )}

      {/* CTA */}
      <div className="px-4 pb-4">
        {biz.slug ? (
          <Link href={`/b/${biz.slug}`}>
            <Button size="sm" className="w-full gap-2">
              <Bot size={13} /> Chat with AI <ChevronRight size={13} />
            </Button>
          </Link>
        ) : (
          <Button size="sm" variant="outline" className="w-full" disabled>Profile incomplete</Button>
        )}
      </div>
    </div>
  );
}


export default function ExplorePage() {
  const [businesses,   setBusinesses]   = useState<Business[]>([]);
  const [filtered,     setFiltered]     = useState<Business[]>([]);
  const [search,       setSearch]       = useState("");
  const [category,     setCategory]     = useState("All");
  const [loading,      setLoading]      = useState(true);
  const [userName,     setUserName]     = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "there");
      }
      const { data } = await supabase
        .from("businesses")
        .select("id,business_name,slug,tagline,category,description,phone,email,website_url,logo_url,cover_url,city,state,country,social_links,opening_hours")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      const list = (data ?? []) as Business[];
      setBusinesses(list);
      setFiltered(list);
      setLoading(false);
    })();
  }, []);

  const applyFilters = useCallback(() => {
    let list = businesses;
    if (category !== "All") list = list.filter((b) => b.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.business_name.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.city?.toLowerCase().includes(q) ||
        b.category?.toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [businesses, category, search]);

  useEffect(() => { applyFilters(); }, [applyFilters]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/user-login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/50 via-background to-violet-100/20 dark:from-violet-950/10 dark:via-background dark:to-background">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-lg shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white">
              <Store size={16} />
            </div>
            <span className="hidden sm:inline">Explore</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Search businesses, services, cities…"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {userName && (
              <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
                <User size={14} />
                <span>{userName}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-muted-foreground">
              <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="max-w-6xl mx-auto px-4 py-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {userName ? `Hi ${userName}! ` : ""}Discover Local Businesses
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          Browse AI-powered businesses near you. Chat, call, and book appointments instantly.
        </p>
      </div>

      {/* ── Category Filter ── */}
      <div className="max-w-6xl mx-auto px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all
                ${category === cat
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-card text-muted-foreground border-border hover:border-violet-400 hover:text-violet-600"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Results count ── */}
      <div className="max-w-6xl mx-auto px-4 mb-4">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${filtered.length} business${filtered.length !== 1 ? "es" : ""} found`}
          {category !== "All" && ` in "${category}"`}
          {search && ` matching "${search}"`}
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border rounded-2xl overflow-hidden animate-pulse">
                <div className="h-36 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                  <div className="h-8 bg-muted rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Store size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No businesses found</h3>
            <p className="text-muted-foreground text-sm">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((biz) => <BusinessCard key={biz.id} biz={biz} />)}
          </div>
        )}
      </div>

      {/* ── Footer CTA ── */}
      <div className="border-t bg-card">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground text-sm mb-3">Own a business? Get your own AI-powered page.</p>
          <Link href="/signup">
            <Button className="gap-2">
              <Bot size={15} /> Create Business Page — It&apos;s Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
