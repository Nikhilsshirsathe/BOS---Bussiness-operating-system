import { Check, Code, Globe, Rocket } from "lucide-react";

interface OnboardingData {
  business_id?: string;
  business_name: string;
  selected_agents: string[];
  personality: string;
  bot_name: string;
  [key: string]: unknown;
}

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

export function StepPublish({ data }: Props) {
  const embedCode = `<script>
  window.SalesOS = { businessId: "${data.business_id || "YOUR_BUSINESS_ID"}" };
</script>
<script async src="${typeof window !== "undefined" ? window.location.origin : ""}/embed.js"></script>`;

  const previewUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/chat/${data.business_id || "preview"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shrink-0">
          <Rocket size={20} />
        </div>
        <div>
          <p className="font-semibold text-green-800 dark:text-green-200">You&apos;re almost live!</p>
          <p className="text-sm text-green-600 dark:text-green-400">Click &quot;Go Live&quot; to publish your AI Sales Bot.</p>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Check size={16} className="text-green-500" /> What&apos;s been configured</h3>
        <ul className="space-y-2">
          {[
            `Business: ${data.business_name}`,
            `${data.selected_agents.length} AI agents enabled`,
            `Personality: ${data.personality}`,
            `Bot name: ${data.bot_name}`,
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Globe size={16} /> Share your chatbot</h3>
        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
          <code className="text-xs flex-1 truncate text-muted-foreground">{previewUrl}</code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(previewUrl)}
            className="text-xs text-primary hover:underline shrink-0"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Code size={16} /> Embed on your website</h3>
        <div className="relative">
          <pre className="p-3 rounded-lg bg-muted text-xs overflow-x-auto leading-relaxed">{embedCode}</pre>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(embedCode)}
            className="absolute top-2 right-2 text-xs text-primary hover:underline bg-muted px-2 py-1 rounded"
          >
            Copy
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Paste this snippet before the closing &lt;/body&gt; tag on your website.</p>
      </div>
    </div>
  );
}
