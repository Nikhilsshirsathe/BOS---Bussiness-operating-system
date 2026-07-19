"use client";

import { useState } from "react";
import { Bot, X, Send, MessageSquare } from "lucide-react";
interface OnboardingData {
  business_id?: string;
  greeting_message?: string;
  primary_color: string;
  bot_name?: string;
  [key: string]: unknown;
}

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
}

interface Msg { role: "user" | "assistant"; content: string; }

export function StepPreview({ data }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: data.greeting_message || "Hello! How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading || !data.business_id) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: data.business_id, message: userMsg, visitor_id: "onboarding-preview" }),
      });
      const result = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: result.message || "I'm ready to help!" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Preview mode — connect your AI keys to test live responses." }]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">This is a live preview of your chatbot. Test it out!</p>
      <div className="mx-auto max-w-sm">
        <div className="border rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="p-4 flex items-center gap-2 text-white" style={{ backgroundColor: data.primary_color }}>
            <Bot size={20} />
            <span className="font-semibold">{data.bot_name || "Sales Assistant"}</span>
            <div className="ml-auto w-2 h-2 bg-green-400 rounded-full" />
          </div>

          {/* Messages */}
          <div className="h-64 overflow-y-auto p-3 space-y-3 bg-background">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-2.5 text-sm ${m.role === "user" ? "text-white" : "bg-muted"}`}
                  style={m.role === "user" ? { backgroundColor: data.primary_color } : {}}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-2.5 flex gap-1">
                  {[0, 0.1, 0.2].map((d, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..." className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-1" />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              className="p-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: data.primary_color }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
