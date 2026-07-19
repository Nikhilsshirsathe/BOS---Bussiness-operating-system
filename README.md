# AgentOS — AI-Powered Business Interaction Platform

> Linktree + AI Receptionist + Appointment Booking + Voice AI — for any business.

Every business gets its own AI-powered page at `agentos.ai/b/your-business`.

Customers can:
- **Chat** with an AI assistant trained on your business knowledge
- **Call** an AI voice receptionist that understands and responds in real time
- **Book appointments** with live slot availability

No customer account required. Business owners set it up in under 5 minutes.

---

## Architecture

```
Customer                    Business Owner
   │                              │
   ▼                              ▼
/b/[slug]               /dashboard, /ai-settings
   │                     /knowledge, /appointments
   ├── Chat ──────────► /api/chat ──► AgentOrchestrator
   │                                       │
   ├── Voice ─────────► /api/voice ──► AI Provider
   │                                       │
   └── Booking ───────► Supabase RPC       │
                         get_available_slots └──► RAG Pipeline
                         book_appointment_rpc     pgvector search
```

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, ShadCN UI |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions) |
| AI | OpenAI GPT-4o-mini, pgvector RAG |
| Voice | Browser Web Speech API (STT + TTS) |
| Charts | Recharts |
| State | Zustand |

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/agentos.git
cd agentos
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase and OpenAI keys
```

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Enable the **vector** extension: Database → Extensions → vector
3. Run the migrations:
   ```bash
   supabase db push
   ```
   Or paste the SQL files from `supabase/migrations/` into the SQL editor.
4. Create a storage bucket named `knowledge-documents` (enable public access)

### 4. Deploy Edge Functions

```bash
supabase functions deploy analytics-processing
supabase functions deploy rag-retrieval
supabase functions deploy agent-router
supabase functions deploy appointment-booking
supabase functions deploy crawl-website
supabase functions deploy email-notifications

# Set secrets
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set RESEND_API_KEY=re_...
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Public Business Page

Every business gets a shareable URL:
```
https://agentos.ai/b/smilecare
```

The page shows:
- Business name, description, logo
- Services list with prices
- Business hours
- Three action buttons: Chat AI / Call AI / Book Appointment

---

## Business Owner Dashboard

| Route | Purpose |
|---|---|
| `/dashboard` | Overview: KPIs, charts, quick actions |
| `/analytics` | Detailed analytics with period selector |
| `/conversations` | All chat sessions with real-time updates |
| `/voice-calls` | Voice call log with transcripts |
| `/appointments` | Appointment management |
| `/leads` | Lead pipeline with CSV export |
| `/knowledge` | Upload PDFs, DOCXs, crawl websites |
| `/ai-settings` | Feature toggles, personality, brand colour |
| `/qr-code` | QR code generator, embed widget, social share |
| `/settings` | Business info, brand, business hours |

---

## RAG Pipeline

```
Document Upload (PDF/DOCX/TXT/website)
    ↓
Text Extraction (pdf-parse, mammoth, cheerio)
    ↓
Chunking (1500 chars, 200 overlap)
    ↓
Embeddings (text-embedding-3-small)
    ↓
pgvector Storage (knowledge_chunks table)
    ↓
Semantic Search (cosine similarity)
    ↓
Context Injection into LLM prompt
```

---

## Voice AI

Uses the **Browser Web Speech API** (no third-party paid service):

1. Customer clicks "Call AI"
2. SpeechRecognition captures speech → text
3. POST to `/api/voice` with conversation transcript
4. AI generates short, voice-friendly reply
5. SpeechSynthesis speaks the reply
6. Loop continues until customer says bye

---

## AI Agent System

The agent orchestrator detects intent and routes to the right agent:

| Agent | Handles |
|---|---|
| `knowledge` | Business questions, services, pricing (RAG) |
| `appointment` | Booking, scheduling, availability |
| `qualification` | Lead capture, budget, requirements |
| `pricing` | Quotes, discounts, product catalog |
| `escalation` | Human handoff, support tickets |
| `brand` | Personality, greeting, tone |

---

## Database Schema

Key tables:
- `businesses` — business profiles with `slug` for public URL
- `feature_toggles` — chat/voice/booking on/off per business
- `brand_settings` — AI personality, colors, greeting
- `services` — services displayed on public page + used for booking
- `knowledge_documents` + `knowledge_chunks` — RAG documents
- `business_hours` + `appointment_config` — booking configuration
- `appointments` — booked sessions
- `chats` + `chat_messages` — conversation history
- `voice_calls` — voice call transcripts
- `leads` — captured leads from interactions
- `analytics_events` — page views, chat starts, bookings

---

## Deployment

### Vercel (frontend)

```bash
vercel deploy
```

Environment variables to set in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL`

### Supabase (backend)

All backend logic lives in Supabase:
- PostgreSQL + pgvector for data + vector search
- Edge Functions for AI processing
- Storage for document files
- Realtime for live conversation updates

---

## Security

- **Row Level Security** on every table — businesses are fully isolated
- **Service key** only used server-side (API routes + Edge Functions)
- **Anon key** used client-side with RLS enforcement
- No customer account required — visitor tracking by anonymous ID

---

&copy; 2026 AgentOS
