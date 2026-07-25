import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { agentOrchestrator } from "@/lib/agents/agent-orchestrator";

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { business_id, message, conversation_id, visitor_id, visitor_name } = body as {
      business_id: string;
      message: string;
      conversation_id?: string;
      visitor_id: string;
      visitor_name?: string;
    };

    if (!business_id || !message || !visitor_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Get business + brand (required) ──────────────────────────
    const [{ data: biz, error: bizErr }, { data: brand }] = await Promise.all([
      supabase.from("businesses").select("business_name, industry, description").eq("id", business_id).single(),
      supabase.from("brand_settings").select("personality, greeting_message, bot_name").eq("business_id", business_id).maybeSingle(),
    ]);

    if (bizErr || !biz) {
      console.error("[Chat API] Business not found:", bizErr?.message);
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // ── Session tracking (best-effort — failures don't block LLM) ─
    let chatId = conversation_id ?? null;

    if (!chatId) {
      try {
        const { data: chat } = await supabase
          .from("chats")
          .insert({
            business_id,
            visitor_id,
            visitor_name: visitor_name ?? null,
            current_agent: "knowledge",
            status: "active",
          })
          .select("id")
          .single();
        chatId = chat?.id ?? null;
      } catch (e) {
        console.warn("[Chat API] Could not create chat session:", e);
      }
    }

    // ── Load conversation history (best-effort) ───────────────────
    let conversationHistory: { role: "user" | "assistant" | "system"; content: string }[] = [];
    if (chatId) {
      try {
        const { data: recentMessages } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: false })
          .limit(10);

        conversationHistory = (recentMessages ?? [])
          .reverse()
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      } catch (e) {
        console.warn("[Chat API] Could not load history:", e);
      }
    }

    // ── Store user message (best-effort) ──────────────────────────
    if (chatId) {
      try {
        await supabase.from("chat_messages").insert({
          chat_id: chatId,
          business_id,
          role: "user",
          content: message,
        });
      } catch (e) {
        console.warn("[Chat API] Could not save user message:", e);
      }
    }

    // ── Run LLM (required — this must succeed) ────────────────────
    const result = await agentOrchestrator.handleMessage(message, {
      businessId: business_id,
      businessName: biz.business_name,
      personality: brand?.personality ?? "professional",
      conversationHistory,
      brandSettings: brand ?? undefined,
    });

    if (!result.response) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // ── Store assistant message (best-effort) ─────────────────────
    if (chatId) {
      try {
        await supabase.from("chat_messages").insert({
          chat_id: chatId,
          business_id,
          role: "assistant",
          content: result.response,
          agent_type: result.agent,
          sources: result.sources ?? null,
        });

        await supabase.from("chats").update({
          current_agent: result.agent,
          updated_at: new Date().toISOString(),
        }).eq("id", chatId);
      } catch (e) {
        console.warn("[Chat API] Could not save assistant message:", e);
      }
    }

    // ── Analytics (fire-and-forget) ───────────────────────────────
    void supabase.from("analytics_events").insert({
      business_id,
      event_type: "chat_message",
      agent_type: result.agent,
      chat_id: chatId,
      visitor_id,
    });

    return NextResponse.json({
      message: result.response,
      conversation_id: chatId,
      agent: result.agent,
      sources: result.sources,
      suggested_actions: result.suggestedActions,
    });

  } catch (error: any) {
    console.error("[Chat API] Error:", error?.message ?? error);
    return NextResponse.json(
      { error: error?.message ?? "AI error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: "AgentOS Chat API v2" });
}
