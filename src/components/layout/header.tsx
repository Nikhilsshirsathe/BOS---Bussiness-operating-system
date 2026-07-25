"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { Moon, Sun, Bell, Search, ChevronRight, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard":    "Home",
  "/chatbot":      "AI Assistant",
  "/voice-agent":  "Voice Assistant",
  "/appointment":  "Appointments",
  "/knowledge":    "Business Information",
  "/analytics":    "Analytics",
  "/leads":        "Customers",
  "/share":        "QR & Share",
  "/settings":     "Customize Your Business",
  "/services":     "Services",
  "/conversations":"Conversations",
  "/voice-calls":  "Voice Calls",
  "/ai-settings":  "AI Personality",
  "/profile-setup":"Build Your Digital Branch",
};

const GREETINGS = ["Good morning", "Good afternoon", "Good evening"];
const SUBTITLES = [
  "Your digital branch is growing beautifully today.",
  "Ready to serve your customers — 24/7.",
  "Everything is running smoothly.",
  "Your AI assistant is online and ready.",
];

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? GREETINGS[0] : h < 17 ? GREETINGS[1] : GREETINGS[2];
}

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { business, fetchBusiness } = useAppStore();
  const pathname = usePathname();
  const router   = useRouter();
  const [mounted, setMounted]   = useState(false);
  const [search,  setSearch]    = useState("");
  const [focused, setFocused]   = useState(false);

  useEffect(() => { setMounted(true); fetchBusiness(); }, [fetchBusiness]);

  const isHome = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const label  = Object.entries(PAGE_LABELS)
    .filter(([r]) => pathname === r || pathname.startsWith(r + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Home";

  const firstName = business?.business_name?.split(" ")[0] ?? "";
  const subtitle  = SUBTITLES[Math.floor(Date.now() / 1000 / 3600) % SUBTITLES.length];
  const publicUrl = business?.slug ? `/b/${business.slug}` : null;
  const initials  = business?.business_name
    ? business.business_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "B";

  return (
    <header className="sticky top-0 z-40 px-4 pt-3">
      {/* ── Main header bar ─────────────────────────────────── */}
      <div className="h-14 px-6 flex items-center gap-4 glass rounded-[20px] border border-border/60 shadow-bos-sm">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
          {!isHome && (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
              >
                Home
              </button>
              <ChevronRight size={13} className="text-muted-foreground/40 shrink-0" />
            </>
          )}
          <span className="font-semibold text-foreground truncate">{label}</span>
        </div>

        {/* Search */}
        <div className={cn(
          "relative hidden md:flex items-center",
          "transition-all duration-300",
          focused ? "w-64" : "w-44"
        )}>
          <Search size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search anything…"
            className={cn(
              "w-full pl-8 pr-3 py-2 text-sm rounded-[14px]",
              "bg-muted/60 border border-border/60",
              "placeholder:text-muted-foreground/50 text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40",
              "transition-all duration-200"
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 rounded-[10px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200"
            >
              {theme === "dark"
                ? <Sun  size={16} className="text-amber-500" />
                : <Moon size={16} />
              }
            </button>
          )}

          {/* Notifications */}
          <button className="relative w-8 h-8 rounded-[10px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 border-2 border-background shadow-sm" />
          </button>

          {/* Avatar */}
          <button
            onClick={() => router.push("/settings")}
            className={cn(
              "ml-1 w-9 h-9 rounded-[12px] shrink-0",
              "bos-gradient flex items-center justify-center",
              "text-white text-[11px] font-bold tracking-wide",
              "shadow-md shadow-indigo-500/30",
              "hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/40",
              "transition-all duration-200 cursor-pointer select-none"
            )}
            title={business?.business_name}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* ── Greeting hero (home only) ─────────────────────────── */}
      {isHome && (
        <div className="px-4 pt-4 pb-2">
        <div className="relative overflow-hidden px-8 pt-8 pb-6 rounded-[24px] border border-border/40"
          style={{ background: "linear-gradient(135deg, #F5F7FF 0%, #EEF2FF 50%, #F8F6FF 100%)" }}>

          {/* Animated blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="blob absolute -top-8 right-8 w-48 h-48 rounded-full bg-indigo-400 opacity-25" />
            <div className="blob blob-2 absolute top-2 right-32 w-32 h-32 rounded-full bg-violet-400 opacity-20" />
            <div className="blob blob-3 absolute -bottom-8 left-16 w-36 h-36 rounded-full bg-sky-400 opacity-15" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} className="text-indigo-400" />
              <p className="text-sm text-indigo-400 font-medium">
                {getGreeting()}{firstName ? `, ${firstName}` : ""} 👋
              </p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
              Your Digital Branch is{" "}
              <span className="bos-gradient-text">Live.</span>
            </h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                bos.ai{publicUrl}
                <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
        </div>
      )}
    </header>
  );
}
