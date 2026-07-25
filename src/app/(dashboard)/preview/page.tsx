"use client";

import { LivePhonePreview } from "@/components/ui/live-phone-preview";
import { Smartphone } from "lucide-react";

export default function PreviewPage() {
  return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
          <Smartphone size={18} className="text-violet-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">Live Preview</h1>
          <p className="text-sm text-muted-foreground">See exactly how your customers see your page</p>
        </div>
      </div>

      {/* Preview centred */}
      <div className="flex justify-center">
        <LivePhonePreview
          label="Your Public Page"
          sublabel="— live, fully interactive"
          emptyMessage="Set your business slug in Customize Business to see a live preview here"
        />
      </div>
    </div>
  );
}
