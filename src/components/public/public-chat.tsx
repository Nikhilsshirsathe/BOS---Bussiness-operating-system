"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Bot, Loader2 } from "lucide-react";
import type { Business, BrandSettings } from "@/types";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string; agent?: string; }

interface Props {
  business: Business;
  brand: BrandSettings | null;
  onBack: () => void;
}

function getVisitorId() {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("agentos_visitor_id");
  if (!id) { id = `v_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; localStorage.setItem("agentos_visitor_id", id); }
  return id;
}

export default function PublicChat({ business, brand, onBack }: Props) {
  const primaryColor = brand?.primary_color ?? "#6366f1";
  const botName = brand?.bot_name ?? "AI Assistant";
  const greeting = brand?.greeting_message ?? `Hi! How can I help you with ${business.business_name}?`;

  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const suggestedQuestions = [
    "What services do you offer?",
    "What are your prices?",
    "Are you available today?",
    "How do I book an appointment?",
  ];

  const handleSend = async (msg?: string) => {
    const text = (msg ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: business.id,
          message: text,
          conversation_id: conversationId,
          visitor_id: getVisitorId(),
        }),
      });
      const data = await res.json();
      if (!conversationId && data.conversation_id) setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.message ?? "I'm here to help!",
        agent: data.agent,
      }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: primaryColor }}>
        <button onClick={onBack} className="p-1 rounded-full hover:bg-white/20 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Bot size={16} />
        </div>
        <div>
          <p className="font-semibold text-sm">{botName}</p>
          <p className="text-xs text-white/80 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 mt-0.5" style={{ backgroundColor: primaryColor }}>
                <Bot size={14} />
              </div>
            )}
            <div className={cn(
              "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
              m.role === "user" ? "text-white rounded-br-sm" : "bg-muted rounded-bl-sm"
            )} style={m.role === "user" ? { backgroundColor: primaryColor } : {}}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: primaryColor }}>
              <Bot size={14} />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (show only at start) */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestedQuestions.map((q) => (
            <button key={q} onClick={() => handleSend(q)}
              className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message…"
          className="flex-1 px-4 py-2.5 rounded-full border bg-muted text-sm focus:outline-none focus:ring-2"
          style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
        />
        <button onClick={() => handleSend()} disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40"
          style={{ backgroundColor: primaryColor }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground pb-3">
        Powered by <span className="font-semibold">AgentOS</span>
      </p>
    </div>
  );
}
