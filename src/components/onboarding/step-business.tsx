const TIMEZONES = ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Subset of onboarding form data relevant to this step
interface OnboardingData {
  website_url: string;
  phone: string;
  timezone: string;
  greeting_message: string;
  personality: string;
  [key: string]: unknown;
}

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function StepBusiness({ data, updateData }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Website URL</label>
          <input
            type="url"
            value={data.website_url}
            onChange={(e) => updateData({ website_url: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="https://yoursite.com"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Phone Number</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => updateData({ phone: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="+1 (555) 000-0000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Timezone</label>
        <select
          value={data.timezone}
          onChange={(e) => updateData({ timezone: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Chatbot Greeting</label>
        <textarea
          value={data.greeting_message}
          onChange={(e) => updateData({ greeting_message: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          placeholder="Hello! How can I help you today?"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium">Personality</label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {["professional", "friendly", "corporate", "luxury", "medical", "legal"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => updateData({ personality: p })}
              className={`px-3 py-2 rounded-md border text-sm capitalize transition-colors ${
                data.personality === p ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
