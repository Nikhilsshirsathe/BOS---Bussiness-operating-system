-- ============================================================
-- AgentOS — Full Database Schema v2 (idempotent — safe to re-run)
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
  DROP TRIGGER IF EXISTS services_updated_at ON services;
  DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
  DROP TRIGGER IF EXISTS leads_updated_at ON leads;
  DROP TRIGGER IF EXISTS chats_updated_at ON chats;
  DROP TRIGGER IF EXISTS voice_calls_updated_at ON voice_calls;
  DROP TRIGGER IF EXISTS support_tickets_updated_at ON support_tickets;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================
-- DROP POLICIES (idempotent)
-- ============================================================
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS user_owns_business(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS match_documents(vector, float, int, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_available_slots(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS book_appointment_rpc(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS log_analytics_event(UUID, TEXT, TEXT, UUID, TEXT, JSONB) CASCADE;

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE,                        -- agentos.ai/slug
  industry TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website_url TEXT,
  social_links JSONB NOT NULL DEFAULT '{}',   -- { instagram, twitter, facebook, linkedin }
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_idx ON businesses(slug) WHERE slug IS NOT NULL;

-- ============================================================
-- FEATURE TOGGLES  (chat, voice, booking — per business)
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_toggles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  chat_enabled BOOLEAN NOT NULL DEFAULT true,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  booking_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BRAND / AI SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#818cf8',
  accent_color TEXT NOT NULL DEFAULT '#e0e7ff',
  greeting_message TEXT NOT NULL DEFAULT 'Hi! How can I help you today?',
  bot_name TEXT NOT NULL DEFAULT 'AI Assistant',
  languages TEXT[] NOT NULL DEFAULT ARRAY['English'],
  personality TEXT NOT NULL DEFAULT 'professional'
    CHECK (personality IN ('professional','friendly','corporate','luxury','medical','legal','custom')),
  custom_personality_prompt TEXT,
  tone TEXT NOT NULL DEFAULT 'Helpful and professional',
  chat_position TEXT NOT NULL DEFAULT 'right' CHECK (chat_position IN ('left','right')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICES (what the business offers — shown on public page)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'INR',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  currency TEXT NOT NULL DEFAULT 'INR',
  features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
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
  document_type TEXT NOT NULL DEFAULT 'pdf'
    CHECK (document_type IN ('pdf','docx','txt','faq','catalog','brochure','website')),
  file_size INTEGER,
  page_count INTEGER,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','indexed','failed')),
  chunk_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE CHUNKS (pgvector)
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

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS knowledge_chunks_business_idx ON knowledge_chunks(business_id);

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
-- APPOINTMENT CONFIG (per business)
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  buffer_minutes INTEGER NOT NULL DEFAULT 10,
  max_daily_appointments INTEGER NOT NULL DEFAULT 20,
  advance_booking_days INTEGER NOT NULL DEFAULT 30,   -- how far ahead customers can book
  cancellation_hours INTEGER NOT NULL DEFAULT 24,     -- min hours before appointment to cancel
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  chat_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  appointment_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  service TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','cancelled','completed','no-show')),
  notes TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_business_time_idx ON appointments(business_id, appointment_time);

-- ============================================================
-- CHATS / CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  current_agent TEXT NOT NULL DEFAULT 'knowledge'
    CHECK (current_agent IN ('knowledge','appointment','qualification','pricing','escalation','brand')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','resolved','pending','escalated')),
  summary TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
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
-- VOICE CALLS
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_phone TEXT,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated','active','completed','failed')),
  transcript JSONB NOT NULL DEFAULT '[]',    -- [{role, content, ts}]
  summary TEXT,
  appointment_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_calls_business_idx ON voice_calls(business_id, created_at DESC);

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
  status TEXT NOT NULL DEFAULT 'warm'
    CHECK (status IN ('hot','warm','cold','converted','lost')),
  budget_range TEXT,
  requirements TEXT,
  source TEXT NOT NULL DEFAULT 'chat',   -- chat | voice | booking
  notes TEXT,
  chat_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,    -- page_view | chat_start | voice_start | booking | lead
  agent_type TEXT,
  chat_id UUID,
  visitor_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_business_date_idx
  ON analytics_events(business_id, created_at DESC);

-- ============================================================
-- SUPPORT TICKETS (escalations)
-- ============================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES chats(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  summary TEXT NOT NULL,
  conversation_snapshot JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTION: update_updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER businesses_updated_at    BEFORE UPDATE ON businesses    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brand_settings_updated_at BEFORE UPDATE ON brand_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER services_updated_at      BEFORE UPDATE ON services      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated_at      BEFORE UPDATE ON products      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER knowledge_documents_updated_at BEFORE UPDATE ON knowledge_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at  BEFORE UPDATE ON appointments  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER chats_updated_at         BEFORE UPDATE ON chats         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER voice_calls_updated_at   BEFORE UPDATE ON voice_calls   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at         BEFORE UPDATE ON leads         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNCTION: user_owns_business (RLS helper)
-- ============================================================
CREATE OR REPLACE FUNCTION user_owns_business(p_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = auth.uid()
  );
$$;

-- ============================================================
-- FUNCTION: match_documents (pgvector semantic search)
-- ============================================================
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INT,
  p_business_id UUID
)
RETURNS TABLE (
  id UUID, document_id UUID, business_id UUID,
  content TEXT, metadata JSONB, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id, kc.document_id, kc.business_id,
    kc.content, kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.business_id = p_business_id
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- FUNCTION: get_available_slots
-- Returns available time slots for a given business & date
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_slots(
  p_business_id UUID,
  p_date DATE
)
RETURNS TABLE(slot_time TIMESTAMPTZ, is_available BOOLEAN)
LANGUAGE plpgsql AS $$
DECLARE
  v_day_of_week INTEGER;
  v_start_time TIME;
  v_end_time TIME;
  v_slot_duration INTEGER;
  v_buffer INTEGER;
  v_current_time TIMESTAMPTZ;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);

  SELECT start_time, end_time
  INTO v_start_time, v_end_time
  FROM business_hours
  WHERE business_id = p_business_id
    AND day_of_week = v_day_of_week
    AND is_available = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(slot_duration_minutes, 30), COALESCE(buffer_minutes, 10)
  INTO v_slot_duration, v_buffer
  FROM appointment_config
  WHERE business_id = p_business_id;

  IF v_slot_duration IS NULL THEN
    v_slot_duration := 30;
    v_buffer := 10;
  END IF;

  v_current_time := (p_date + v_start_time)::TIMESTAMPTZ;

  WHILE v_current_time + (v_slot_duration || ' minutes')::INTERVAL
        <= (p_date + v_end_time)::TIMESTAMPTZ LOOP

    RETURN QUERY
    SELECT
      v_current_time,
      NOT EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.business_id = p_business_id
          AND a.status NOT IN ('cancelled')
          AND a.appointment_time < v_current_time + ((v_slot_duration + v_buffer) || ' minutes')::INTERVAL
          AND a.appointment_time + (a.duration_minutes || ' minutes')::INTERVAL > v_current_time
      );

    v_current_time := v_current_time + ((v_slot_duration + v_buffer) || ' minutes')::INTERVAL;
  END LOOP;
END;
$$;

-- ============================================================
-- FUNCTION: book_appointment_rpc
-- ============================================================
CREATE OR REPLACE FUNCTION book_appointment_rpc(
  p_business_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_appointment_time TIMESTAMPTZ,
  p_duration_minutes INTEGER DEFAULT 30,
  p_service TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO appointments(
    business_id, customer_name, customer_email, customer_phone,
    appointment_time, duration_minutes, service, status
  ) VALUES (
    p_business_id, p_customer_name, p_customer_email, p_customer_phone,
    p_appointment_time, p_duration_minutes, p_service, 'scheduled'
  )
  RETURNING id INTO v_id;

  -- Log analytics event
  INSERT INTO analytics_events(business_id, event_type, metadata)
  VALUES (p_business_id, 'booking', jsonb_build_object(
    'customer_name', p_customer_name,
    'appointment_time', p_appointment_time
  ));

  RETURN v_id;
END;
$$;

-- ============================================================
-- FUNCTION: log_analytics_event
-- ============================================================
CREATE OR REPLACE FUNCTION log_analytics_event(
  p_business_id UUID,
  p_event_type TEXT,
  p_agent_type TEXT DEFAULT NULL,
  p_chat_id UUID DEFAULT NULL,
  p_visitor_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO analytics_events(business_id, event_type, agent_type, chat_id, visitor_id, metadata)
  VALUES (p_business_id, p_event_type, p_agent_type, p_chat_id, p_visitor_id, p_metadata);
END;
$$;

-- ============================================================
-- FUNCTION: get_dashboard_stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_business_id UUID)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_leads',           (SELECT COUNT(*) FROM leads WHERE business_id = p_business_id),
    'hot_leads',             (SELECT COUNT(*) FROM leads WHERE business_id = p_business_id AND status = 'hot'),
    'warm_leads',            (SELECT COUNT(*) FROM leads WHERE business_id = p_business_id AND status = 'warm'),
    'cold_leads',            (SELECT COUNT(*) FROM leads WHERE business_id = p_business_id AND status = 'cold'),
    'total_appointments',    (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id),
    'appointments_today',    (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id AND DATE(appointment_time AT TIME ZONE 'UTC') = CURRENT_DATE),
    'total_conversations',   (SELECT COUNT(*) FROM chats WHERE business_id = p_business_id),
    'active_conversations',  (SELECT COUNT(*) FROM chats WHERE business_id = p_business_id AND is_active = true),
    'total_voice_calls',     (SELECT COUNT(*) FROM voice_calls WHERE business_id = p_business_id),
    'total_documents',       (SELECT COUNT(*) FROM knowledge_documents WHERE business_id = p_business_id AND status = 'indexed'),
    'total_visitors',        (SELECT COUNT(DISTINCT visitor_id) FROM analytics_events WHERE business_id = p_business_id AND event_type = 'page_view')
  ) INTO result;
  RETURN result;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE businesses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_toggles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours      ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads               ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets     ENABLE ROW LEVEL SECURITY;

-- businesses
CREATE POLICY "owners_select_businesses"  ON businesses FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "owners_insert_businesses"  ON businesses FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners_update_businesses"  ON businesses FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "owners_delete_businesses"  ON businesses FOR DELETE USING (owner_id = auth.uid());
-- Public read of slug/name for the public page
CREATE POLICY "public_read_business_profile" ON businesses FOR SELECT USING (is_active = true);

-- feature_toggles
CREATE POLICY "owners_manage_feature_toggles" ON feature_toggles FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_read_feature_toggles"   ON feature_toggles FOR SELECT USING (true);

-- brand_settings
CREATE POLICY "owners_manage_brand_settings" ON brand_settings FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_read_published_brand"  ON brand_settings FOR SELECT USING (is_published = true);

-- services (public read so customer page can display them)
CREATE POLICY "owners_manage_services" ON services FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_read_services"   ON services FOR SELECT USING (is_active = true);

-- products
CREATE POLICY "owners_manage_products" ON products FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_read_products"   ON products FOR SELECT USING (is_active = true);

-- knowledge
CREATE POLICY "owners_manage_knowledge_documents" ON knowledge_documents FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "owners_manage_knowledge_chunks"    ON knowledge_chunks    FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- business_hours
CREATE POLICY "owners_manage_business_hours" ON business_hours FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_read_business_hours"   ON business_hours FOR SELECT USING (true);

-- appointment_config
CREATE POLICY "owners_manage_appointment_config" ON appointment_config FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_read_appointment_config"   ON appointment_config FOR SELECT USING (true);

-- staff_members
CREATE POLICY "owners_manage_staff" ON staff_members FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));

-- appointments
CREATE POLICY "owners_manage_appointments" ON appointments FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_insert_appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_appointments"   ON appointments FOR SELECT USING (true);

-- chats
CREATE POLICY "owners_manage_chats" ON chats FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_insert_chats" ON chats FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_chats"   ON chats FOR SELECT USING (true);

-- chat_messages
CREATE POLICY "owners_manage_chat_messages" ON chat_messages FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_insert_chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "public_read_chat_messages"   ON chat_messages FOR SELECT USING (true);

-- voice_calls
CREATE POLICY "owners_manage_voice_calls" ON voice_calls FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_insert_voice_calls" ON voice_calls FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_voice_calls" ON voice_calls FOR UPDATE USING (true);

-- leads
CREATE POLICY "owners_manage_leads" ON leads FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_insert_leads" ON leads FOR INSERT WITH CHECK (true);

-- analytics_events
CREATE POLICY "owners_read_analytics"    ON analytics_events FOR SELECT USING (user_owns_business(business_id));
CREATE POLICY "public_insert_analytics"  ON analytics_events FOR INSERT WITH CHECK (true);

-- support_tickets
CREATE POLICY "owners_manage_support_tickets" ON support_tickets FOR ALL USING (user_owns_business(business_id)) WITH CHECK (user_owns_business(business_id));
CREATE POLICY "public_insert_support_tickets" ON support_tickets FOR INSERT WITH CHECK (true);
