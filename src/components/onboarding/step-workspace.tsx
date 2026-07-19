interface OnboardingData {
  business_name: string;
  industry: string;
  bot_name: string;
  primary_color: string;
  [key: string]: unknown;
}

const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Real Estate", "Education", "Retail", "Legal", "Medical", "Hospitality", "Manufacturing", "Other"];

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function StepWorkspace({ data, updateData }: Props) {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Business Name <span className="text-destructive">*</span></label>
        <input
          type="text"
          value={data.business_name}
          onChange={(e) => updateData({ business_name: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Acme Corp"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Industry</label>
        <select
          value={data.industry}
          onChange={(e) => updateData({ industry: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {INDUSTRIES.map((ind) => <option key={ind}>{ind}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Bot Name</label>
        <input
          type="text"
          value={data.bot_name}
          onChange={(e) => updateData({ bot_name: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Sales Assistant"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Brand Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={data.primary_color}
            onChange={(e) => updateData({ primary_color: e.target.value })}
            className="h-10 w-16 rounded border cursor-pointer bg-background p-0.5"
          />
          <span className="text-sm text-muted-foreground">{data.primary_color}</span>
          <div className="flex gap-2 ml-2">
            {["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateData({ primary_color: c })}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: data.primary_color === c ? "black" : "transparent" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
