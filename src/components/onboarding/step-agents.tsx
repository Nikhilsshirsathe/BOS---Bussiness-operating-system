import { BookOpen, Calendar, Target, Tag, Headphones, Palette, Check } from "lucide-react";
interface OnboardingData {
  business_name: string;
  slug: string;
  industry: string;
  description: string;
  features: { chat: boolean; voice: boolean; booking: boolean };
  personality: string;
  greeting_message: string;
  bot_name: string;
  primary_color: string;
  completed: boolean;
  selected_agents: string[];
  agent_settings: Record<string, Record<string, unknown>>;
}
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

const AGENTS = [
  { id: "knowledge", name: "Knowledge Agent", description: "Answers questions from your documents & website", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
  { id: "appointment", name: "Appointment Agent", description: "Books, cancels & reschedules appointments", icon: Calendar, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950" },
  { id: "qualification", name: "Sales Qualification", description: "Scores leads & gathers requirements", icon: Target, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
  { id: "pricing", name: "Pricing Agent", description: "Recommends products & generates quotes", icon: Tag, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950" },
  { id: "escalation", name: "Human Escalation", description: "Transfers to humans & creates tickets", icon: Headphones, color: "text-red-500", bg: "bg-red-50 dark:bg-red-950" },
  { id: "brand", name: "Brand & Personality", description: "Custom personality & brand voice", icon: Palette, color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-950" },
];

export function StepAgents({ data, updateData }: Props) {
  const toggle = (id: string) => {
    const selected = data.selected_agents.includes(id)
      ? data.selected_agents.filter((a) => a !== id)
      : [...data.selected_agents, id];
    updateData({ selected_agents: selected });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Select the AI agents you want to enable. You can change this later.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const selected = data.selected_agents.includes(agent.id);
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => toggle(agent.id)}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all",
                selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn("p-2 rounded-lg shrink-0", agent.bg)}>
                <Icon size={18} className={agent.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{agent.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{agent.description}</p>
              </div>
              <div className={cn("w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                selected ? "bg-primary border-primary" : "border-border")}>
                {selected && <Check size={11} className="text-primary-foreground" />}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {data.selected_agents.length} of {AGENTS.length} agents selected
      </p>
    </div>
  );
}
