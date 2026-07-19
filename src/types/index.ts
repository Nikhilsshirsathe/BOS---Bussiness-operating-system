// ================================================================
// AgentOS — Shared TypeScript Types
// ================================================================

// ─── Business ───────────────────────────────────────────────────
export interface Business {
  id: string;
  owner_id: string;
  business_name: string;
  slug: string | null;
  industry: string;
  description: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website_url: string | null;
  social_links: {
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
  };
  timezone: string;
  is_active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureToggles {
  id: string;
  business_id: string;
  chat_enabled: boolean;
  voice_enabled: boolean;
  booking_enabled: boolean;
  updated_at: string;
}

// ─── Brand / AI Settings ────────────────────────────────────────
export type Personality =
  | 'professional'
  | 'friendly'
  | 'corporate'
  | 'luxury'
  | 'medical'
  | 'legal'
  | 'custom';

export interface BrandSettings {
  id: string;
  business_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  greeting_message: string;
  bot_name: string;
  languages: string[];
  personality: Personality;
  custom_personality_prompt: string | null;
  tone: string;
  chat_position: 'left' | 'right';
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Services & Products ────────────────────────────────────────
export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  duration_minutes: number;
  category: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  category: string | null;
  pricing: number;
  currency: string;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Knowledge Base ─────────────────────────────────────────────
export interface KnowledgeDocument {
  id: string;
  business_id: string;
  title: string;
  document_url: string | null;
  document_type: 'pdf' | 'docx' | 'txt' | 'faq' | 'catalog' | 'brochure' | 'website';
  file_size: number | null;
  page_count: number | null;
  status: 'processing' | 'indexed' | 'failed';
  chunk_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeChunk {
  id: string;
  document_id: string;
  business_id: string;
  content: string;
  embedding: number[] | null;
  chunk_index: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Appointments ────────────────────────────────────────────────
export interface BusinessHours {
  id: string;
  business_id: string;
  day_of_week: number; // 0=Sun … 6=Sat
  start_time: string;  // HH:mm
  end_time: string;
  is_available: boolean;
}

export interface AppointmentConfig {
  id: string;
  business_id: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  max_daily_appointments: number;
  advance_booking_days: number;
  cancellation_hours: number;
  updated_at: string;
}

export interface StaffMember {
  id: string;
  business_id: string;
  name: string;
  email: string;
  specialties: string[];
  is_available: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  service_id: string | null;
  staff_id: string | null;
  chat_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  appointment_time: string;
  duration_minutes: number;
  service: string | null;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  slot_time: string;
  is_available: boolean;
}

// ─── Chat ────────────────────────────────────────────────────────
export type AgentType =
  | 'knowledge'
  | 'appointment'
  | 'qualification'
  | 'pricing'
  | 'escalation'
  | 'brand';

export interface Chat {
  id: string;
  business_id: string;
  visitor_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  current_agent: AgentType;
  status: 'active' | 'resolved' | 'pending' | 'escalated';
  summary: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  business_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  agent_type: AgentType | null;
  tool_calls: ToolCall[] | null;
  tool_results: ToolResult[] | null;
  sources: SourceCitation[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ─── Voice ────────────────────────────────────────────────────────
export interface VoiceCall {
  id: string;
  business_id: string;
  visitor_id: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  duration_seconds: number;
  status: 'initiated' | 'active' | 'completed' | 'failed';
  transcript: VoiceTurn[];
  summary: string | null;
  appointment_booked: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoiceTurn {
  role: 'user' | 'assistant';
  content: string;
  ts: string;
}

// ─── Leads ────────────────────────────────────────────────────────
export interface Lead {
  id: string;
  business_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  score: number;
  status: 'hot' | 'warm' | 'cold' | 'converted' | 'lost';
  budget_range: string | null;
  requirements: string | null;
  source: string;
  notes: string | null;
  chat_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Support ──────────────────────────────────────────────────────
export interface SupportTicket {
  id: string;
  business_id: string;
  chat_id: string | null;
  customer_name: string;
  customer_email: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  summary: string;
  conversation_snapshot: ChatMessage[];
  created_at: string;
  updated_at: string;
}

// ─── Tool Calling ─────────────────────────────────────────────────
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  output: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface SourceCitation {
  document_title: string;
  content: string;
  confidence: number;
  source_url?: string;
}

// ─── Analytics ────────────────────────────────────────────────────
export interface DashboardStats {
  total_leads: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  total_appointments: number;
  appointments_today: number;
  total_conversations: number;
  active_conversations: number;
  total_voice_calls: number;
  total_documents: number;
  total_visitors: number;
  leads_over_time: { date: string; count: number }[];
  conversations_over_time: { date: string; count: number }[];
  agent_usage: Record<string, number>;
  conversion_rate: number;
}

// ─── API shapes ───────────────────────────────────────────────────
export interface ChatRequest {
  business_id: string;
  message: string;
  conversation_id?: string;
  visitor_id: string;
  visitor_name?: string;
}

export interface ChatResponse {
  message: string;
  conversation_id: string;
  agent: AgentType;
  sources?: SourceCitation[];
  suggested_actions?: string[];
}

export interface VoiceRequest {
  business_id: string;
  call_id: string;
  transcript: VoiceTurn[];
  visitor_id: string;
}

export interface VoiceResponse {
  reply: string;
  tool_actions?: { type: string; data: unknown }[];
  call_ended?: boolean;
}

export interface UploadResponse {
  success: boolean;
  document_id?: string;
  error?: string;
}

export interface SlotsResponse {
  slots: TimeSlot[];
  date: string;
}

// ─── Onboarding ───────────────────────────────────────────────────
export interface OnboardingState {
  step: number;
  business_name: string;
  slug: string;
  industry: string;
  description: string;
  features: { chat: boolean; voice: boolean; booking: boolean };
  personality: Personality;
  greeting_message: string;
  bot_name: string;
  primary_color: string;
  completed: boolean;
}
