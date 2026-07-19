import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { AgentType, ToolDefinition, SourceCitation } from "@/types";
import { aiProvider, buildRAGContext } from "@/lib/ai-provider";
import { semanticSearch } from "@/lib/rag";

const getSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

interface AgentContext {
  businessId: string;
  businessName: string;
  personality: string;
  conversationHistory: { role: "user" | "assistant" | "system"; content: string }[];
  brandSettings?: { primary_color?: string; greeting_message?: string; bot_name?: string };
}

interface AgentResult {
  response: string;
  agent: AgentType;
  sources?: SourceCitation[];
  suggestedActions?: string[];
  shouldEscalate?: boolean;
  toolCalls?: unknown[];
}

// ─── Tool definitions (used only for booking/lead actions) ───────
const ACTION_TOOLS: ToolDefinition[] = [
  {
    name: "get_available_slots",
    description: "Get available appointment slots for a specific date",
    parameters: {
      type: "object",
      properties: { date: { type: "string", description: "Date in YYYY-MM-DD format" } },
      required: ["date"],
    },
  },
  {
    name: "book_appointment",
    description: "Book an appointment after confirming all details with the customer",
    parameters: {
      type: "object",
      properties: {
        customer_name:    { type: "string" },
        customer_email:   { type: "string" },
        customer_phone:   { type: "string" },
        appointment_time: { type: "string", description: "ISO 8601 datetime" },
        service:          { type: "string" },
        duration_minutes: { type: "number" },
      },
      required: ["customer_name", "customer_email", "appointment_time"],
    },
  },
  {
    name: "create_lead",
    description: "Save a lead when a customer provides contact details or shows buying intent",
    parameters: {
      type: "object",
      properties: {
        customer_name:  { type: "string" },
        customer_email: { type: "string" },
        customer_phone: { type: "string" },
        score:          { type: "number", description: "0-100" },
        requirements:   { type: "string" },
        budget_range:   { type: "string" },
        source:         { type: "string" },
      },
      required: ["customer_name", "customer_email", "score"],
    },
  },
  {
    name: "create_support_ticket",
    description: "Create a support ticket when customer has an issue needing human attention",
    parameters: {
      type: "object",
      properties: {
        customer_name:     { type: "string" },
        customer_email:    { type: "string" },
        issue_description: { type: "string" },
        priority:          { type: "string", enum: ["low", "medium", "high", "urgent"] },
      },
      required: ["customer_name", "customer_email", "issue_description"],
    },
  },
];

// ─── Tool executor ────────────────────────────────────────────────
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  businessId: string
): Promise<string> {
  const supabase = getSupabase();

  switch (toolName) {
    case "get_available_slots": {
      try {
        const { data: slots } = await supabase.rpc("get_available_slots", {
          p_business_id: businessId,
          p_date: args.date,
        });
        const available = (slots ?? []).filter((s: { is_available: boolean }) => s.is_available);
        if (!available.length) return `No available slots on ${args.date}.`;
        const times = available.slice(0, 6).map((s: { slot_time: string }) =>
          new Date(s.slot_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
        );
        return `Available slots on ${args.date}: ${times.join(", ")}`;
      } catch (e: any) {
        return `Could not fetch slots: ${e.message}`;
      }
    }

    case "book_appointment": {
      try {
        const { data: id, error } = await supabase.rpc("book_appointment_rpc", {
          p_business_id:      businessId,
          p_customer_name:    args.customer_name,
          p_customer_email:   args.customer_email,
          p_customer_phone:   (args.customer_phone as string) || null,
          p_appointment_time: args.appointment_time,
          p_duration_minutes: (args.duration_minutes as number) ?? 30,
          p_service:          (args.service as string) || null,
        });
        if (error) return `Booking failed: ${error.message}`;
        return `✅ Appointment confirmed! ID: ${id}. Confirmation noted for ${args.customer_email}.`;
      } catch (e: any) {
        return `Booking error: ${e.message}`;
      }
    }

    case "create_lead": {
      try {
        const score = typeof args.score === "number" ? Math.min(100, Math.max(0, args.score)) : 50;
        const status = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
        await supabase.from("leads").insert({
          business_id:   businessId,
          customer_name:  args.customer_name,
          customer_email: args.customer_email,
          customer_phone: args.customer_phone || null,
          score,
          status,
          requirements:  args.requirements || null,
          budget_range:  args.budget_range  || null,
          source:        (args.source as string) || "chat",
        });
        return `Lead captured for ${args.customer_name}.`;
      } catch (e: any) {
        return `Lead save error: ${e.message}`;
      }
    }

    case "create_support_ticket": {
      try {
        await supabase.from("support_tickets").insert({
          business_id:   businessId,
          customer_name:  args.customer_name,
          customer_email: args.customer_email,
          priority:       args.priority || "medium",
          status:         "open",
          summary:        args.issue_description,
          conversation_snapshot: [],
        });
        return `Support ticket created for ${args.customer_name}. The team will reach out to ${args.customer_email} shortly.`;
      } catch (e: any) {
        return `Ticket error: ${e.message}`;
      }
    }

    default:
      return "Tool not available.";
  }
}

// ─── Intent detection ─────────────────────────────────────────────
function detectIntent(message: string): AgentType {
  const t = message.toLowerCase();
  if (/book|schedule|appointment|slot|available|reschedule|cancel appt/i.test(t)) return "appointment";
  if (/price|cost|how much|₹|\$|inr|usd|quote|discount|package|fee|charge/i.test(t)) return "pricing";
  if (/complaint|issue|problem|refund|speak.*human|manager|escalat/i.test(t)) return "escalation";
  return "knowledge"; // default — RAG will handle it
}

// ─── Fetch business services as formatted text ────────────────────
async function getServicesText(businessId: string): Promise<string> {
  try {
    const supabase = getSupabase();
    const { data: services } = await supabase
      .from("services")
      .select("name, description, price, currency, duration_minutes")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("sort_order")
      .limit(15);
    if (!services?.length) return "";
    return "SERVICES OFFERED:\n" + services.map((s) =>
      `• ${s.name}${s.price != null ? ` — ${s.currency} ${s.price}` : ""} (${s.duration_minutes} min)${s.description ? `: ${s.description}` : ""}`
    ).join("\n");
  } catch {
    return "";
  }
}

// ─── Agent Orchestrator ───────────────────────────────────────────
class AgentOrchestrator {
  async handleMessage(message: string, context: AgentContext): Promise<AgentResult> {
    const agent = detectIntent(message);

    // ── Step 1: Always do RAG search ─────────────────────────────
    // Lower threshold (0.3) to be inclusive, filter by relevance in prompt
    let ragSources: SourceCitation[] = [];
    let ragContext = "";

    try {
      const ragResult = await semanticSearch(context.businessId, message, 5, 0.3);
      ragSources = ragResult.sources ?? [];
      ragContext = ragResult.combinedContext ?? "";
    } catch (e) {
      console.warn("[Orchestrator] RAG search failed:", e);
    }

    // ── Step 2: Always fetch services ────────────────────────────
    const servicesText = await getServicesText(context.businessId);

    // ── Step 3: Fetch business info ───────────────────────────────
    let businessContext = "";
    try {
      const supabase = getSupabase();
      const { data: biz } = await supabase
        .from("businesses")
        .select("business_name, description, industry, phone, address")
        .eq("id", context.businessId)
        .single();
      if (biz) {
        businessContext = [
          `Business: ${biz.business_name}`,
          biz.industry ? `Industry: ${biz.industry}` : "",
          biz.description ? `About: ${biz.description}` : "",
          biz.phone ? `Phone: ${biz.phone}` : "",
          biz.address ? `Address: ${biz.address}` : "",
        ].filter(Boolean).join("\n");
      }
    } catch (e) {
      console.warn("[Orchestrator] Business fetch failed:", e);
    }

    // ── Step 4: Build rich system context ────────────────────────
    const contextParts: string[] = [];
    if (businessContext) contextParts.push(businessContext);
    if (servicesText)    contextParts.push(servicesText);
    if (ragContext) {
      contextParts.push(
        "KNOWLEDGE BASE (from uploaded documents — use this to answer questions):\n" + ragContext
      );
    }
    contextParts.push(
      "INSTRUCTIONS:\n" +
      "- Answer based on the knowledge base and services above when relevant.\n" +
      "- If the knowledge base doesn't have the answer, use your general knowledge but be honest.\n" +
      "- Be concise, helpful, and friendly.\n" +
      "- For booking requests, ask for customer name, email, preferred date/time, and service."
    );
    const fullContext = contextParts.join("\n\n");

    // ── Step 5: For appointment/escalation, use tool calls ────────
    if (agent === "appointment" || agent === "escalation") {
      const tools = ACTION_TOOLS.filter((t) =>
        agent === "appointment"
          ? ["get_available_slots", "book_appointment"].includes(t.name)
          : ["create_support_ticket", "create_lead"].includes(t.name)
      );

      try {
        const result = await aiProvider.generateChatCompletion(
          [
            ...context.conversationHistory,
            { role: "user", content: message },
          ],
          tools,
          context.businessName,
          context.personality,
          fullContext
        );

        if (result.toolCalls.length > 0) {
          const toolResults: string[] = [];
          for (const tc of result.toolCalls) {
            const output = await executeTool(tc.name, tc.arguments, context.businessId);
            toolResults.push(output);
          }

          // Final pass with tool results injected
          const finalResp = await aiProvider.generateResponse(
            [
              ...context.conversationHistory,
              { role: "user", content: message },
              { role: "assistant", content: result.content ?? "" },
              { role: "assistant", content: `Tool results:\n${toolResults.join("\n")}` },
            ],
            context.businessName,
            context.personality,
            fullContext + "\n\nUse the tool results above to give a helpful response."
          );

          return { response: finalResp, agent, sources: ragSources, suggestedActions: this.getSuggestions(agent) };
        }

        // No tool calls — answer from context
        const response = result.content ?? await aiProvider.generateResponse(
          [...context.conversationHistory, { role: "user", content: message }],
          context.businessName,
          context.personality,
          fullContext
        );
        return { response, agent, sources: ragSources, suggestedActions: this.getSuggestions(agent) };
      } catch (e) {
        console.warn("[Orchestrator] Tool call failed, falling back:", e);
      }
    }

    // ── Step 6: Knowledge / pricing / qualification — plain RAG ──
    try {
      const response = await aiProvider.generateResponse(
        [...context.conversationHistory, { role: "user", content: message }],
        context.businessName,
        context.personality,
        fullContext
      );
      return {
        response,
        agent,
        sources: ragSources.length > 0 ? ragSources : undefined,
        suggestedActions: this.getSuggestions(agent),
      };
    } catch (e: any) {
      console.error("[Orchestrator] LLM failed:", e);
      return {
        response: "I'm sorry, I'm having trouble responding right now. Please try again.",
        agent,
        suggestedActions: this.getSuggestions(agent),
      };
    }
  }

  private getSuggestions(agent: AgentType): string[] {
    const map: Record<AgentType, string[]> = {
      knowledge:     ["What services do you offer?", "What are your prices?", "How do I book?"],
      appointment:   ["Book for tomorrow", "See available slots", "Cancel my appointment"],
      qualification: ["Tell me your budget", "Describe your requirements", "Talk to a person"],
      pricing:       ["See all services", "Get a custom quote", "Compare packages"],
      escalation:    ["Speak to a person", "Check ticket status", "Continue with AI"],
      brand:         ["Learn more", "Get started", "Contact us"],
    };
    return map[agent] ?? [];
  }
}

export const agentOrchestrator = new AgentOrchestrator();
