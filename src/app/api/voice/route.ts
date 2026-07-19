import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { aiProvider } from "@/lib/ai-provider";
import { semanticSearch } from "@/lib/rag";
import type { VoiceRequest } from "@/types";

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VoiceRequest;
    const { business_id, call_id, transcript, visitor_id } = body;

    if (!business_id || !transcript?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get business + brand
    const [{ data: biz }, { data: brand }] = await Promise.all([
      supabase.from("businesses").select("business_name, description, industry").eq("id", business_id).single(),
      supabase.from("brand_settings").select("personality, greeting_message, bot_name").eq("business_id", business_id).single(),
    ]);

    if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // Get last user message for RAG
    const lastUserMsg = [...transcript].reverse().find((t) => t.role === "user");

    // RAG: search knowledge base using last user message
    let ragContext = "";
    if (lastUserMsg) {
      try {
        const ragResult = await semanticSearch(business_id, lastUserMsg.content, 3);
        if (ragResult.combinedContext) {
          ragContext = `BUSINESS KNOWLEDGE:\n${ragResult.combinedContext}`;
        }
      } catch { /* non-fatal */ }
    }

    // Get services for context
    const { data: services } = await supabase
      .from("services")
      .select("name, price, currency, duration_minutes")
      .eq("business_id", business_id)
      .eq("is_active", true)
      .limit(10);

    const servicesContext = services?.length
      ? `SERVICES OFFERED:\n${services.map((s) => `- ${s.name}: ${s.currency} ${s.price ?? "Contact for price"} (${s.duration_minutes} min)`).join("\n")}`
      : "";

    const extraContext = [ragContext, servicesContext].filter(Boolean).join("\n\n");

    // Convert transcript to OpenAI message format
    const messages = transcript.map((t) => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    }));

    // Check if we should suggest booking
    const lastMsg = lastUserMsg?.content.toLowerCase() ?? "";
    const wantsBooking = ["book", "appointment", "schedule", "slot", "when can"].some((k) => lastMsg.includes(k));

    const reply = await aiProvider.generateVoiceResponse(
      messages,
      biz.business_name,
      brand?.personality ?? "professional",
      extraContext
    );

    // Update call transcript in DB
    if (call_id) {
      await supabase
        .from("voice_calls")
        .update({ transcript, updated_at: new Date().toISOString() })
        .eq("id", call_id);
    }

    // Check if call should end (user says bye/goodbye etc.)
    const callEndKeywords = ["bye", "goodbye", "that's all", "thats all", "thank you, bye", "no more questions"];
    const callEnded = callEndKeywords.some((k) => lastMsg.includes(k));

    // Log analytics
    await supabase.from("analytics_events").insert({
      business_id,
      event_type: "voice_turn",
      visitor_id,
      metadata: { call_id, wants_booking: wantsBooking },
    });

    return NextResponse.json({
      reply,
      call_ended: callEnded,
      suggest_booking: wantsBooking,
    });
  } catch (error) {
    console.error("[Voice API]", error);
    return NextResponse.json({ error: "Voice AI error" }, { status: 500 });
  }
}
