"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Phone, Calendar,
  BookOpen, Share2, Settings, LogOut, ExternalLink,
  ChevronLeft, ChevronRight, Users,
  Zap, Crown, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Home",               href: "/dashboard",   icon: LayoutDashboard, tint: "text-indigo-500",  bg: "bg-indigo-50  dark:bg-indigo-950/40"  },
  { label: "AI Assistant",       href: "/chatbot",     icon: MessageSquare,   tint: "text-violet-500",  bg: "bg-violet-50  dark:bg-violet-950/40"  },
  { label: "Voice Assistant",    href: "/voice-agent", icon: Phone,           tint: "text-sky-500",     bg: "bg-sky-50     dark:bg-sky-950/40"     },
  { label: "Appointments",       href: "/appointment", icon: Calendar,        tint: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/40" },
  { label: "Business Info",      href: "/knowledge",   icon: BookOpen,        tint: "text-amber-500",   bg: "bg-amber-50   dark:bg-amber-950/40"   },
  { label: "Customers",          href: "/leads",       icon: Users,           tint: "text-orange-500",  bg: "bg-orange-50  dark:bg-orange-950/40"  },
  { label: "QR & Share",         href: "/share",       icon: Share2,          tint: "text-teal-500",    bg: "bg-teal-50    dark:bg-teal-950/40"    },
  { label: "Customize Business", href: "/settings",    icon: Settings,        tint: "text-slate-500",   bg: "bg-slate-50   dark:bg-slate-950/40"   },
  { label: "Preview",            href: "/preview",     icon: Smartphone,      tint: "text-violet-500",  bg: "bg-violet-50  dark:bg-violet-950/40"  },
];

export function Sidebar() {
  const pathname            = usePathname();
  const { business, reset } = useAppStore();
  const router              = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "relative shrink-0 h-screen sticky top-0 z-30",
        "transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[264px]"
      )}
    >
      {/* ── Floating glass panel ──────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col mx-3 my-3 rounded-[32px] overflow-hidden",
          "glass-sidebar transition-all duration-300",
          "h-[calc(100vh-24px)]"
        )}
      >
        {/* ── Logo row ──────────────────────────────────────────── */}
        <div className={cn(
          "flex items-center h-[60px] px-4 shrink-0",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className="w-8 h-8 rounded-[11px] bos-gradient flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
            <Zap size={15} className="text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className="font-bold text-[16px] tracking-tight bos-gradient-text">BOS</span>
              <p className="text-[10px] text-muted-foreground -mt-0.5 leading-none">Business OS</p>
            </div>
          )}
        </div>

        {/* ── Business chip ─────────────────────────────────────── */}
        {business && !collapsed && (
          <div className="mx-3 mb-2 px-4 py-3 rounded-[18px] bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900/30">
            <p className="text-[10px] uppercase tracking-[0.12em] text-indigo-400 font-semibold mb-0.5">
              Your Branch
            </p>
            <p className="text-sm font-semibold truncate text-foreground leading-tight">
              {business.business_name}
            </p>
            {business.slug && (
              <Link
                href={`/b/${business.slug}`}
                target="_blank"
                className="text-[11px] text-indigo-400 flex items-center gap-1 mt-0.5 hover:text-indigo-600 transition-colors"
              >
                <span className="truncate">/{business.slug}</span>
                <ExternalLink size={9} className="shrink-0" />
              </Link>
            )}
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────── */}
        <nav className="flex-1 min-h-0 px-3 py-1 space-y-0.5 overflow-y-auto scrollbar-hide">
          {NAV.map(({ label, href, icon: Icon, tint, bg }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "group flex items-center rounded-[14px] text-[13px] font-medium",
                  "transition-all duration-200 ease-out",
                  collapsed ? "justify-center p-2" : "gap-3 px-3 py-2",
                  active
                    ? "bos-gradient text-white shadow-md shadow-indigo-500/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30"
                )}
              >
                {active ? (
                  <Icon size={16} className="text-white shrink-0" />
                ) : (
                  <span className={cn(
                    "w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0",
                    "transition-transform duration-200 group-hover:scale-110",
                    bg
                  )}>
                    <Icon size={14} className={tint} />
                  </span>
                )}
                {!collapsed && (
                  <span className="truncate leading-none">{label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Upgrade card ──────────────────────────────────────── */}
        {!collapsed && (
          <div className="mx-3 mb-1.5 p-3 rounded-[16px] bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 text-white relative overflow-hidden" style={{flexShrink: 0}}>
            <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1">
                <Crown size={12} className="text-yellow-300" />
                <span className="text-[10px] font-semibold text-white/90 uppercase tracking-wide">Upgrade to Pro</span>
              </div>
              <p className="text-[10px] text-white/70 mb-2 leading-relaxed">
                Unlimited AI, custom domains & priority support.
              </p>
              <button className="w-full py-1.5 rounded-[8px] bg-white text-indigo-600 text-[10px] font-bold hover:bg-indigo-50 transition-colors">
                Upgrade Now →
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="px-3 pb-4 pt-1 space-y-0.5 shrink-0 border-t border-border/40">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expand" : "Collapse"}
            className={cn(
              "w-full flex items-center rounded-[14px] text-[13px] text-muted-foreground",
              "hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200",
              collapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
            )}
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight size={16} className="shrink-0" /> : <ChevronLeft size={16} className="shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
          {business?.slug && (
            <Link
              href={`/b/${business.slug}`}
              target="_blank"
              title={collapsed ? "View Public Page" : undefined}
              className={cn(
                "flex items-center rounded-[14px] text-[13px] text-muted-foreground",
                "hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 hover:text-indigo-600 transition-all duration-200",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
              )}
            >
              <ExternalLink size={16} className="shrink-0" />
              {!collapsed && <span>View Public Page</span>}
            </Link>
          )}
          <button
            onClick={handleSignOut}
            title={collapsed ? "Sign Out" : undefined}
            className={cn(
              "w-full flex items-center rounded-[14px] text-[13px] text-muted-foreground",
              "hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-500 transition-all duration-200",
              collapsed ? "justify-center p-2.5" : "gap-3 px-3.5 py-2.5"
            )}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

    </aside>
  );
}
