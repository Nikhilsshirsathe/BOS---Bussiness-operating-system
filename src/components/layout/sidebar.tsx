"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, Phone, Calendar,
  BookOpen, Share2, Settings, Bot, LogOut, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Dashboard",     href: "/dashboard",     icon: LayoutDashboard },
  { label: "Chatbot",       href: "/chatbot",       icon: MessageSquare },
  { label: "Voice Agent",   href: "/voice-agent",   icon: Phone },
  { label: "Appointment",   href: "/appointment",   icon: Calendar },
  { label: "Knowledge Base", href: "/knowledge",    icon: BookOpen },
  { label: "Share My Business", href: "/share",     icon: Share2 },
  { label: "Settings",      href: "/settings",      icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { business, reset } = useAppStore();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  };

  return (
    <aside className="w-60 shrink-0 border-r bg-card flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b font-bold text-lg shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Bot size={16} className="text-primary-foreground" />
        </div>
        AgentOS
      </div>

      {/* Business info */}
      {business && (
        <div className="px-4 py-3 border-b shrink-0">
          <p className="text-xs text-muted-foreground">Your business</p>
          <p className="text-sm font-semibold truncate">{business.business_name}</p>
          {business.slug && (
            <Link
              href={`/b/${business.slug}`}
              target="_blank"
              className="text-xs text-primary flex items-center gap-1 mt-0.5 hover:underline"
            >
              /b/{business.slug} <ExternalLink size={10} />
            </Link>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV.map((item) => {
          const { label, href, icon: Icon } = item;
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t p-2 shrink-0">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}