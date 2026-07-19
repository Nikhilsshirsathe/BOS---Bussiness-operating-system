"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Calendar, Target, Tag, Headphones, Palette, ArrowRight, Power, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const AGENT_META = [
  { id: "knowledge", name: "Knowledge Agent", description: "Answers questions from your documents & website using RAG", icon: BookOpen, color: "bg-blue-500", href: "/agents/knowledge" },
  { id: "appointment", name: "Appointment Agent", description: "Books, cancels & reschedules appointments automatically", icon: Calendar, color: "bg-green-500", href: "/agents/appointment" },
  { id: "qualification", name: "Sales Qualification", description: "Scores leads and gathers customer requirements", icon: Target, color: "bg-amber-500", href: "/agents/qualification" },
  { id: "pricing", name: "Product & Pricing Agent", description: "Recommends products and generates custom quotes", icon: Tag, color: "bg-purple-500", href: "/agents/pricing" },
  { id: "escalation", name: "Human Escalation Agent", description: "Transfers to humans and creates support tickets", icon: Headphones, color: "bg-red-500", href: "/agents/escalation" },
  { id: "brand", name: "Brand & Personality Agent", description: "Customizes chatbot appearance and tone of voice", icon: Palette, color: "bg-pink-500", href: "/agents/brand" },
];

export default function AgentsPage() {
  const [configs, setConfigs] = useState<Record<string, { enabled: boolean; settings: Record<string, unknown> }>>({});
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
      if (!biz) return;
      setBusinessId(biz.id);

      const { data: agentData } = await supabase.from("agent_configs").select("agent_type, enabled, settings").eq("business_id", biz.id);
      const map: Record<string, { enabled: boolean; settings: Record<string, unknown> }> = {};
      (agentData || []).forEach((a: { agent_type: string; enabled: boolean; settings: Record<string, unknown> }) => {
        map[a.agent_type] = { enabled: a.enabled, settings: a.settings };
      });
      setConfigs(map);
      setLoading(false);
    };
    load();
  }, []);

  const toggleAgent = async (agentId: string) => {
    if (!businessId) return;
    setToggling(agentId);
    const supabase = createClient();
    const current = configs[agentId];
    const newEnabled = !current?.enabled;

    await supabase.from("agent_configs").upsert(
      { business_id: businessId, agent_type: agentId, enabled: newEnabled, settings: current?.settings || {} },
      { onConflict: "business_id,agent_type" }
    );

    setConfigs((prev) => ({ ...prev, [agentId]: { ...prev[agentId], enabled: newEnabled } }));
    setToggling(null);
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
          <h1 className="text-3xl font-bold">AI Agents</h1>
          <p className="text-muted-foreground">Configure your AI sales team</p>
        </div>
        <Link href="/chatbot/preview">
          <Button variant="outline">Preview Chatbot</Button>
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {AGENT_META.map((agent) => {
          const Icon = agent.icon;
          const config = configs[agent.id];
          const enabled = config?.enabled ?? false;

          return (
            <Card key={agent.id} className={cn("transition-all", enabled ? "border-primary/30 shadow-sm" : "opacity-80")}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", agent.color)}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAgent(agent.id)}
                    disabled={toggling === agent.id}
                    className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      enabled ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" : "bg-muted text-muted-foreground border-border hover:bg-accent"
                    )}
                  >
                    {toggling === agent.id ? <Loader2 size={10} className="animate-spin" /> : <Power size={10} />}
                    {enabled ? "On" : "Off"}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <CardDescription className="text-xs leading-relaxed">{agent.description}</CardDescription>
                <Link href={agent.href}>
                  <Button variant="outline" size="sm" className="w-full">
                    Configure <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
