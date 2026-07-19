"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Send, ExternalLink, Copy, Check, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string; agent?: string; }

export default function ChatbotPreviewPage() {
  const { fetchBusiness, business, brand } = useAppStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  useEffect(() => {
    if (brand?.greeting_message) {
      setMessages([{ role: "assistant", content: brand.greeting_message }]);
    }
  }, [brand]);

  const primaryColor = brand?.primary_color || "#6366f1";
  const botName = brand?.bot_name || "Sales Assistant";

  const handleSend = async () => {
    if (!input.trim() || loading || !business?.id) return;
    const msg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: business.id, message: msg, conversation_id: conversationId, visitor_id: "preview-user" }),
      });
      const data = await res.json();
      if (!conversationId && data.conversation_id) setConversationId(data.conversation_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.message || "I'm here to help!", agent: data.agent }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Make sure your API keys are configured." }]);
    }
    setLoading(false);
  };

  const embedUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/chat/${business?.id || "YOUR_BUSINESS_ID"}`;
  const embedCode = `<!-- SalesOS Chat Widget -->
<script>
  window.SalesOS = {
    businessId: "${business?.id || "YOUR_BUSINESS_ID"}",
    position: "${brand ? "right" : "right"}"
  };
</script>
<script async src="${typeof window !== "undefined" ? window.location.origin : ""}/embed.js"></script>`;

  const copyEmbed = () => { navigator.clipboard?.writeText(embedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Chatbot Preview</h1>
          <p className="text-muted-foreground">Test and share your AI sales bot</p>
        </div>
        <div className="flex gap-2">
          <Button variant={viewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setViewMode("desktop")}>
            <Monitor size={14} className="mr-1.5" />Desktop
          </Button>
          <Button variant={viewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setViewMode("mobile")}>
            <Smartphone size={14} className="mr-1.5" />Mobile
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Preview panel */}
        <div className="lg:col-span-3 flex justify-center">
          <div className={cn("transition-all duration-300", viewMode === "mobile" ? "w-[375px]" : "w-full max-w-xl")}>
            <div className="border-2 border-border rounded-2xl overflow-hidden shadow-xl bg-background">
              {/* Browser chrome for desktop */}
              {viewMode === "desktop" && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b">
                  <div className="flex gap-1.5">
                    {["bg-red-400", "bg-amber-400", "bg-green-400"].map((c, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full ${c}`} />
                    ))}
                  </div>
                  <div className="flex-1 mx-3 bg-background/80 rounded px-3 py-0.5 text-xs text-muted-foreground truncate">
                    {embedUrl}
                  </div>
                </div>
              )}

              {/* Chat header */}
              <div className="p-4 flex items-center gap-3 text-white" style={{ backgroundColor: primaryColor }}>
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <p className="font-semibold">{botName}</p>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />Online
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className={cn("overflow-y-auto p-4 space-y-3 bg-background/50", viewMode === "mobile" ? "h-96" : "h-80")}>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                    {m.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 mb-0.5" style={{ backgroundColor: primaryColor }}>
                        <Bot size={14} />
                      </div>
                    )}
                    <div>
                      <div className={`max-w-[75%] rounded-2xl p-3 text-sm leading-relaxed ${m.role === "user" ? "text-white rounded-br-sm" : "bg-muted rounded-bl-sm"}`}
                        style={m.role === "user" ? { backgroundColor: primaryColor } : {}}>
                        {m.content}
                      </div>
                      {m.agent && m.role === "assistant" && (
                        <p className="text-xs text-muted-foreground mt-1 ml-1 capitalize">{m.agent} agent</p>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: primaryColor }}>
                      <Bot size={14} />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm p-3">
                      <div className="flex gap-1">
                        {[0, 0.15, 0.3].map((d, i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${d}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-background flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-full border bg-muted text-sm focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": primaryColor } as React.CSSProperties} />
                <button onClick={handleSend} disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-opacity"
                  style={{ backgroundColor: primaryColor }}>
                  <Send size={16} />
                </button>
              </div>

              <div className="px-4 py-2 border-t text-center">
                <p className="text-xs text-muted-foreground">Powered by <span className="font-semibold">SalesOS</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: embed + share */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Share Direct Link</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input readOnly value={embedUrl} className="flex-1 px-3 py-2 border rounded-md bg-muted text-xs text-muted-foreground focus:outline-none" />
                <Button size="sm" variant="outline" onClick={() => window.open(embedUrl, "_blank")}><ExternalLink size={14} /></Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Website Embed Code</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">{embedCode}</pre>
              <Button size="sm" className="w-full" variant="outline" onClick={copyEmbed}>
                {copied ? <><Check size={14} className="mr-1.5" />Copied!</> : <><Copy size={14} className="mr-1.5" />Copy Embed Code</>}
              </Button>
              <p className="text-xs text-muted-foreground">Add before the closing &lt;/body&gt; tag on your website.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Tests</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                "What services do you offer?",
                "I'd like to book an appointment",
                "What are your prices?",
                "I need to speak to someone",
              ].map((q) => (
                <button key={q} onClick={() => { setInput(q); }}
                  className="w-full text-left px-3 py-2 rounded-lg border text-xs hover:bg-muted transition-colors">
                  {q}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
