import OpenAI from "openai";
import type { ToolDefinition, SourceCitation, Personality } from "@/types";

// ─── Personality system prompts ──────────────────────────────────
const PERSONALITY_PROMPTS: Record<Personality, string> = {
  professional: "You are a professional AI assistant. Be concise, accurate, and helpful.",
  friendly:     "You are a warm, friendly AI assistant. Use conversational language and show enthusiasm.",
  corporate:    "You are a formal corporate AI assistant. Maintain a business tone and use formal language.",
  luxury:       "You are an exclusive high-end AI assistant. Speak with elegance and sophistication.",
  medical:      "You are a professional medical AI assistant. Be precise, empathetic, and always recommend consulting a doctor.",
  legal:        "You are a professional legal AI assistant. Be precise, use clear language, and always recommend consulting a lawyer.",
  custom:       "You are a helpful AI assistant.",
};

// ─── Build the right OpenAI-compatible client ────────────────────
function buildClient(): { client: OpenAI; model: string } {
  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();

  if (provider === "groq") {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY ?? "",
        baseURL: "https://api.groq.com/openai/v1",
      }),
      model: process.env.AI_MODEL ?? "llama-3.3-70b-versatile",
    };
  }

  if (provider === "gemini") {
    return {
      client: new OpenAI({
        apiKey: process.env.GEMINI_API_KEY ?? "",
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      }),
      model: process.env.AI_MODEL ?? "gemini-2.0-flash",
    };
  }

  // Default: OpenAI
  return {
    client: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
    }),
    model: process.env.AI_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  };
}

// ─── AI Provider Manager ─────────────────────────────────────────
class AIProviderManager {
  private client: OpenAI;
  private model: string;

  constructor() {
    const { client, model } = buildClient();
    this.client = client;
    this.model  = model;
  }

  getSystemPrompt(businessName: string, personality: Personality | string, extraContext?: string): string {
    const base = PERSONALITY_PROMPTS[personality as Personality] ?? PERSONALITY_PROMPTS.professional;
    return [
      base,
      `You are the AI assistant for ${businessName}.`,
      "Your role is to help customers with questions, bookings, product information, and general assistance.",
      "Always be helpful and stay on topic. If you don't know something, say so honestly.",
      "When booking appointments, always confirm the date, time, and customer details.",
      extraContext ?? "",
    ].filter(Boolean).join("\n");
  }

  async generateResponse(
    messages: { role: "user" | "assistant" | "system"; content: string }[],
    businessName: string,
    personality: string,
    extraContext?: string
  ): Promise<string> {
    const systemPrompt = this.getSystemPrompt(businessName, personality as Personality, extraContext);

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content ?? "I'm here to help. Could you rephrase your question?";
  }

  async generateChatCompletion(
    messages: { role: "user" | "assistant" | "system"; content: string }[],
    tools: ToolDefinition[],
    businessName: string,
    personality: string,
    extraContext?: string
  ): Promise<{
    content: string | null;
    toolCalls: { name: string; arguments: Record<string, unknown> }[];
  }> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: this.getSystemPrompt(businessName, personality as Personality, extraContext) },
        ...messages,
      ],
      tools: tools.length > 0
        ? tools.map((t) => ({ type: "function" as const, function: t }))
        : undefined,
      tool_choice: tools.length > 0 ? "auto" : undefined,
      max_tokens: 800,
    });

    const msg = completion.choices[0]?.message;

    // Parse tool calls — handle both {function: {name, arguments}} and direct {name, arguments}
    const toolCalls = (msg?.tool_calls ?? []).map((tc: any) => {
      const fn = tc.function ?? tc;
      const args = typeof fn.arguments === "string"
        ? JSON.parse(fn.arguments)
        : (fn.arguments ?? {});
      return { name: fn.name as string, arguments: args as Record<string, unknown> };
    });

    return { content: msg?.content ?? null, toolCalls };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Embeddings always use OpenAI (Groq doesn't support embeddings)
    const embeddingClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "",
    });
    const response = await embeddingClient.embeddings.create({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    });
    return response.data[0].embedding;
  }

  async generateVoiceResponse(
    transcript: { role: "user" | "assistant"; content: string }[],
    businessName: string,
    personality: string,
    context?: string
  ): Promise<string> {
    const systemPrompt = [
      this.getSystemPrompt(businessName, personality as Personality),
      "IMPORTANT: You are responding via voice/audio. Keep replies SHORT (1-3 sentences max).",
      "Speak naturally as if on a phone call. Avoid bullet points, markdown, or long lists.",
      context ?? "",
    ].filter(Boolean).join("\n");

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: systemPrompt },
        ...transcript,
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content ?? "I'm here to help. What can I do for you?";
  }
}

export const aiProvider = new AIProviderManager();

// ─── Standalone helpers ──────────────────────────────────────────
export async function generateChatCompletion(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  tools: ToolDefinition[],
  businessName: string,
  personality: string,
  extraContext?: string
) {
  return aiProvider.generateChatCompletion(messages, tools, businessName, personality, extraContext);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return aiProvider.generateEmbedding(text);
}

export async function generateResponse(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  businessName: string,
  personality: string,
  context?: string
): Promise<string> {
  return aiProvider.generateResponse(messages, businessName, personality, context);
}

// ─── RAG context builder ─────────────────────────────────────────
export function buildRAGContext(sources: SourceCitation[], maxLength = 3000): string {
  if (!sources.length) return "";
  let ctx = "RELEVANT BUSINESS INFORMATION:\n\n";
  for (const s of sources) {
    const block = `[${s.document_title}]\n${s.content}\n\n`;
    if (ctx.length + block.length > maxLength) break;
    ctx += block;
  }
  return ctx;
}
