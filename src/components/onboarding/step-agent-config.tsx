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

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

function updateAgentSetting(data: OnboardingData, updateData: Props["updateData"], agentType: string, key: string, value: unknown) {
  updateData({
    agent_settings: {
      ...data.agent_settings,
      [agentType]: { ...(data.agent_settings[agentType] || {}), [key]: value },
    },
  });
}

export function StepAgentConfig({ data, updateData }: Props) {
  const s = (agent: string, key: string, fallback: unknown) =>
    (data.agent_settings[agent]?.[key] ?? fallback) as string;

  const set = (agent: string, key: string, value: unknown) =>
    updateAgentSetting(data, updateData, agent, key, value);

  return (
    <div className="space-y-6">
      {data.selected_agents.includes("appointment") && (
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">🗓️ Appointment Agent</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Meeting Duration (minutes)</label>
              <input type="number" value={s("appointment", "duration_minutes", "30")} onChange={(e) => set("appointment", "duration_minutes", e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" min="15" step="15" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Buffer Between Meetings (min)</label>
              <input type="number" value={s("appointment", "buffer_minutes", "15")} onChange={(e) => set("appointment", "buffer_minutes", e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" min="0" step="5" />
            </div>
          </div>
        </div>
      )}

      {data.selected_agents.includes("qualification") && (
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">🎯 Sales Qualification Agent</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Target Customer Profile</label>
            <textarea value={s("qualification", "target_profile", "")} onChange={(e) => set("qualification", "target_profile", e.target.value)}
              rows={2} placeholder="e.g., B2B SaaS companies with 10-500 employees, budget $5k-$50k"
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Min Budget ($)</label>
              <input type="number" value={s("qualification", "min_budget", "")} onChange={(e) => set("qualification", "min_budget", e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="1000" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Max Budget ($)</label>
              <input type="number" value={s("qualification", "max_budget", "")} onChange={(e) => set("qualification", "max_budget", e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="100000" />
            </div>
          </div>
        </div>
      )}

      {data.selected_agents.includes("escalation") && (
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">🎧 Human Escalation Agent</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Support Email</label>
            <input type="email" value={s("escalation", "contact_email", "")} onChange={(e) => set("escalation", "contact_email", e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="support@yourcompany.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Department</label>
            <input type="text" value={s("escalation", "department", "Support")} onChange={(e) => set("escalation", "department", e.target.value)}
              className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Support" />
          </div>
        </div>
      )}

      {data.selected_agents.includes("knowledge") && (
        <div className="p-4 border rounded-lg space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">📚 Knowledge Agent</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Confidence Threshold (%)</label>
            <input type="range" min="50" max="95" step="5"
              value={parseInt(s("knowledge", "confidence_threshold", "70"))}
              onChange={(e) => set("knowledge", "confidence_threshold", e.target.value)}
              className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50% (More answers)</span>
              <span className="font-medium">{s("knowledge", "confidence_threshold", "70")}%</span>
              <span>95% (Higher accuracy)</span>
            </div>
          </div>
        </div>
      )}

      {data.selected_agents.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-4">No agents selected. Go back to Step 2 to select agents.</p>
      )}
    </div>
  );
}