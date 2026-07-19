-- ============================================================
-- SalesOS - Full Database Schema (idempotent — safe to re-run)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- DROP TRIGGERS (so they can be recreated safely)
-- ============================================================
DO $$ BEGIN
  DROP TRIGGER IF EXISTS businesses_updated_at ON businesses;
  DROP TRIGGER IF EXISTS agent_configs_updated_at ON agent_configs;
  DROP TRIGGER IF EXISTS brand_settings_updated_at ON brand_settings;
  DROP TRIGGER IF EXISTS knowledge_documents_updated_at ON knowledge_documents;
  DROP TRIGGER IF EXISTS products_updated_at ON products;
  DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
  DROP TRIGGER IF EXISTS leads_updated_at ON leads;
  DROP TRIGGER IF EXISTS chats_updated_at ON chats;
  DROP TRIGGER IF EXISTS support_tickets_updated_at ON support_tickets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- DROP POLICIES (so they can be recreated safely)
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Drop helper function if exists (will be recreated)
DROP FUNCTION IF EXISTS user_owns_business(UUID);
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'Other',
  website_url TEXT,
  description TEXT,
  phone TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUSINESS USERS (team members)
-- ============================================================
CREATE TABLE IF NOT EXISTS business_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- ============================================================
-- AGENT CONFIGS
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('knowledge','appointment','qualification','pricing','escalation','brand')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, agent_type)
);

-- ============================================================
-- BRAND SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#818cf8',
  accent_color TEXT NOT NULL DEFAULT '#e0e7ff',
  greeting_message TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
  bot_name TEXT NOT NULL DEFAULT 'Sales Assistant',
  languages TEXT[] NOT NULL DEFAULT ARRAY['English'],
  personality TEXT NOT NULL DEFAULT 'professional' CHECK (personality IN ('professional','friendly','corporate','luxury','medical','legal','custom')),
  custom_personality_prompt TEXT,
  tone TEXT NOT NULL DEFAULT 'Helpful and professional',
  chat_position TEXT NOT NULL DEFAULT 'right' CHECK (chat_position IN ('left','right')),
  chat_icon TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  document_url TEXT,
  document_type TEXT NOT NULL DEFAULT 'pdf' CHECK (document_type IN ('pdf','docx','txt','faq','catalog','brochure','website')),
  file_size INTEGER,
  page_count INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','indexed','failed')),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE CHUNKS (vector embeddings)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast vector search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS knowledge_chunks_business_idx ON knowledge_chunks(business_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  pricing NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRICING PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  interval TEXT NOT NULL DEFAULT 'monthly' CHECK (interval IN ('monthly','yearly','one-time')),
  features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DISCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage','fixed')),
  value NUMERIC(10,2) NOT NULL,
  valid_until TIMESTAMPTZ,
  max_uses INTEGER NOT NULL DEFAULT 100,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, code)
);

-- ============================================================
-- BUSINESS HOURS
-- ============================================================
CREATE TABLE IF NOT EXISTS business_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(business_id, day_of_week)
);

-- ============================================================
-- STAFF MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  appointment_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  service TEXT,
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','cancelled','completed','no-show')),
  notes TEXT,
  chat_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEADS
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  score INTEGER NOT NULL DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'warm' CHECK (status IN ('hot','warm','cold','converted','lost')),
  industry TEXT,
  budget_range TEXT,
  requirements TEXT,
  source TEXT NOT NULL DEFAULT 'chat',
  notes TEXT,
  chat_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LEAD SCORE RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_score_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('equals','contains','greater_than','less_than','in')),
  value TEXT NOT NULL,
  score INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHATS / CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  current_agent TEXT NOT NULL DEFAULT 'knowledge' CHECK (current_agent IN ('knowledge','appointment','qualification','pricing','escalation','brand')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','pending','escalated')),
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  agent_type TEXT CHECK (agent_type IN ('knowledge','appointment','qualification','pricing','escalation','brand')),
  tool_calls JSONB,
  tool_results JSONB,
  sources JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_chat_idx ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS chat_messages_business_idx ON chat_messages(business_id);

-- ============================================================
-- ESCALATION RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  trigger_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  department TEXT NOT NULL DEFAULT 'Support',
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Support',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  summary TEXT NOT NULL,
  conversation_snapshot JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  agent_type TEXT,
  chat_id UUID,
  visitor_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_business_date_idx ON analytics_events(business_id, created_at DESC);

-- ============================================================
-- FUNCTION: match_documents (semantic search via cosine similarity)
-- ============================================================
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INT,
  p_business_id UUID
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  business_id UUID,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.business_id,
    kc.content,
    kc.embedding,
    kc.metadata,
    kc.created_at,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE
    kc.business_id = p_business_id
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- FUNCTION: get_dashboard_stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_leads', (SELECT COUNT(*) FROM leads WHERE business_id = p_business_id),
    'hot_leads', (SELECT COUNT(*) FROM leads WHERE business_id = p_business_id AND status = 'hot'),
    'warm_leads', (SELECT COUNT(*) FROM leads WHERE business_id = p_business_id AND status = 'warm'),
    'cold_leads', (SELECT COUNT(*) FROM leads WHERE business_id = p_business_id AND status = 'cold'),
    'total_appointments', (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id),
    'appointments_today', (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id AND DATE(appointment_time) = CURRENT_DATE),
    'total_conversations', (SELECT COUNT(*) FROM chats WHERE business_id = p_business_id),
    'active_conversations', (SELECT COUNT(*) FROM chats WHERE business_id = p_business_id AND is_active = true),
    'total_documents', (SELECT COUNT(*) FROM knowledge_documents WHERE business_id = p_business_id AND status = 'indexed')
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- TRIGGERS: updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER agent_configs_updated_at BEFORE UPDATE ON agent_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brand_settings_updated_at BEFORE UPDATE ON brand_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER knowledge_documents_updated_at BEFORE UPDATE ON knowledge_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_score_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user owns the business
CREATE OR REPLACE FUNCTION user_owns_business(p_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM business_users WHERE business_id = p_business_id AND user_id = auth.uid()
  );
$$;

-- Businesses RLS
CREATE POLICY "owners can see own businesses" ON businesses FOR SELECT USING (owner_id = auth.uid() OR user_owns_business(id));
CREATE POLICY "owners can insert businesses" ON businesses FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners can update businesses" ON businesses FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "owners can delete businesses" ON businesses FOR DELETE USING (owner_id = auth.uid());

-- Generic business-scoped RLS macro for all child tables
-- agent_configs
CREATE POLICY "business members can manage agent_configs" ON agent_configs FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- brand_settings
CREATE POLICY "business members can manage brand_settings" ON brand_settings FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
-- Public read for published brand settings (for the chat widget)
CREATE POLICY "public can read published brand_settings" ON brand_settings FOR SELECT USING (is_published = true);

-- knowledge_documents
CREATE POLICY "business members can manage knowledge_documents" ON knowledge_documents FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- knowledge_chunks  
CREATE POLICY "business members can manage knowledge_chunks" ON knowledge_chunks FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- products
CREATE POLICY "business members can manage products" ON products FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- pricing_plans
CREATE POLICY "business members can manage pricing_plans" ON pricing_plans FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- discounts
CREATE POLICY "business members can manage discounts" ON discounts FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- business_hours
CREATE POLICY "business members can manage business_hours" ON business_hours FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public can read business_hours" ON business_hours FOR SELECT USING (true);

-- staff_members
CREATE POLICY "business members can manage staff_members" ON staff_members FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- appointments
CREATE POLICY "business members can manage appointments" ON appointments FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- leads
CREATE POLICY "business members can manage leads" ON leads FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- lead_score_rules
CREATE POLICY "business members can manage lead_score_rules" ON lead_score_rules FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- chats
CREATE POLICY "business members can manage chats" ON chats FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public can insert chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "public can read own chats" ON chats FOR SELECT USING (true);

-- chat_messages
CREATE POLICY "business members can manage chat_messages" ON chat_messages FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public can insert chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "public can read chat_messages" ON chat_messages FOR SELECT USING (true);

-- escalation_rules
CREATE POLICY "business members can manage escalation_rules" ON escalation_rules FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- support_tickets
CREATE POLICY "business members can manage support_tickets" ON support_tickets FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- analytics_events
CREATE POLICY "business members can read analytics_events" ON analytics_events FOR SELECT USING (user_owns_business(business_id));
CREATE POLICY "public can insert analytics_events" ON analytics_events FOR INSERT WITH CHECK (true);

-- business_users
CREATE POLICY "members can see their own business memberships" ON business_users FOR SELECT USING (user_id = auth.uid() OR user_owns_business(business_id));
CREATE POLICY "owners can manage business_users" ON business_users FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- ============================================================
-- SEED: Default business hours (Mon-Fri)
-- ============================================================
-- (Inserted per-business on onboarding via application logic)
