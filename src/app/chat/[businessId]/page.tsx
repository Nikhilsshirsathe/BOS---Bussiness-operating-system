"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Bot, Send, Loader2 } from "lucide-react";

interface Msg { role: "user" | "assistant"; content: string; }
interface BrandData { primary_color: string; bot_name: string; greeting_message: string; business_name: string; }

export default function PublicChatPage() {
  const params = useParams();
  const businessId = params.businessId as string;
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [visitorId] = useState(() => `visitor-${crypto.randomUUID()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const loadBrand = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("brand_settings")
          .select("primary_color, bot_name, greeting_message, businesses(business_name)")
          .eq("business_id", businessId)
          .single();

        if (data) {
          const biz = (data.businesses as unknown as { business_name: string }[])?.at(0) || null;
          setBrand({
            primary_color: data.primary_color || "#6366f1",
            bot_name: data.bot_name || "Sales Assistant",
            greeting_message: data.greeting_message || "Hello! How can I help you today?",
            business_name: biz?.business_name || "Business",
          });
          setMessages([{ role: "assistant", content: data.greeting_message || "Hello! How can I help?" }]);
        }
      } catch { /* use defaults */ }
    };
    if (businessId) loadBrand();
  }, [businessId]);

  const primaryColor = brand?.primary_color || "#6366f1";

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, message: msg, conversation_id: conversationId, visitor_id: visitorId }),
      });
      const data = await res.json();
      if (!conversationId && data.conversation_id) setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.message || "I'm here to help!" }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden bg-background">
        {/* Header */}
        <div className="p-4 flex items-center gap-3 text-white" style={{ backgroundColor: primaryColor }}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot size={22} />
          </div>
          <div>
            <p className="font-bold">{brand?.bot_name || "Sales Assistant"}</p>
            <p className="text-xs opacity-80">
              {brand?.business_name ? `${brand.business_name} · ` : ""}AI Sales Assistant
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs opacity-80">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Online
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
              {m.role === "assistant" && (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: primaryColor }}>
                  <Bot size={16} />
                </div>
              )}
              <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user" ? "text-white rounded-br-sm" : "bg-muted rounded-bl-sm"
              }`} style={m.role === "user" ? { backgroundColor: primaryColor } : {}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: primaryColor }}>
                <Bot size={16} />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t flex gap-2 bg-background">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2.5 rounded-full border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: primaryColor }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>

        <div className="px-4 py-2 border-t text-center">
          <p className="text-xs text-muted-foreground">Powered by <span className="font-semibold">SalesOS</span></p>
        </div>
      </div>
    </div>
  );
}
