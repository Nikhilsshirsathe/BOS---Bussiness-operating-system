"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { Moon, Sun, Bell, Settings, ExternalLink, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

const LABELS: Record<string, string> = {
  "/dashboard":           "Dashboard",
  "/chatbot":             "Chatbot",
  "/voice-agent":         "Voice Agent",
  "/appointment":         "Appointment",
  "/knowledge":           "Knowledge Base",
  "/share":               "Share My Business",
  "/settings":            "Settings",
};

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const { business, fetchBusiness } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); fetchBusiness(); }, [fetchBusiness]);

  // Find current page label — longest matching prefix wins
  const label = Object.entries(LABELS)
    .filter(([route]) => pathname === route || pathname.startsWith(route + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "Dashboard";

  const publicUrl = business?.slug ? `/b/${business.slug}` : null;

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur sticky top-0 z-40 flex items-center px-4 gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
        <span className="text-muted-foreground hidden sm:block truncate max-w-[160px]">
          {business?.business_name ?? "AgentOS"}
        </span>
        <span className="text-muted-foreground hidden sm:block">/</span>
        <span className="font-medium truncate">{label}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* View public page */}
        {publicUrl && (
          <Button variant="ghost" size="sm" className="hidden sm:flex gap-1.5 text-xs h-8"
            onClick={() => window.open(publicUrl, "_blank")}>
            <ExternalLink size={13} /> View Page
          </Button>
        )}

        {/* Theme */}
        {mounted && (
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell size={16} />
        </Button>

        {/* Settings shortcut */}
        <Button variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => router.push("/settings")}>
          <Settings size={16} />
        </Button>

        {/* Business avatar */}
        <div className="ml-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold cursor-default select-none"
          title={business?.business_name}>
          {business?.business_name ? business.business_name[0].toUpperCase() : <Bot size={14} />}
        </div>
      </div>
    </header>
  );
}
