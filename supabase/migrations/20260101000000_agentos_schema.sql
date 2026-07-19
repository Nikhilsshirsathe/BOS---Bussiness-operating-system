-- ============================================================
-- AgentOS - Complete Database Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- DROP existing objects (idempotent)
-- ============================================================
DO $$ BEGIN
  DROP TRIGGER IF EXISTS businesses_updated_at ON businesses;
  DROP TRIGGER IF EXISTS brand_settings_updated_at ON brand_settings;
  DROP TRIGGER IF EXISTS knowledge_documents_updated_at ON knowledge_documents;
  DROP TRIGGER IF EXISTS services_updated_at ON services;
  DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
  DROP TRIGGER IF EXISTS chats_updated_at ON chats;
  DROP TRIGGER IF EXISTS feature_toggles_updated_at ON feature_toggles;
  DROP TRIGGER IF EXISTS voice_calls_updated_at ON voice_calls;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS user_owns_business(UUID);
DROP FUNCTION IF EXISTS match_documents(vector, FLOAT, INT, UUID);
DROP FUNCTION IF EXISTS get_dashboard_stats(UUID);
DROP FUNCTION IF EXISTS get_available_slots(UUID, DATE);
DROP FUNCTION IF EXISTS book_appointment_rpc(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT);
DROP FUNCTION IF EXISTS get_sharing_analytics(UUID);
DROP FUNCTION IF EXISTS get_daily_analytics(UUID, DATE, DATE);
DROP FUNCTION IF EXISTS get_popular_queries(UUID, INT);

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  industry TEXT NOT NULL DEFAULT 'Other',
  description TEXT,
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  website_url TEXT,
  social_links JSONB NOT NULL DEFAULT '{}',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_active BOOLEAN NOT NULL DEFAULT true,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS businesses_slug_idx ON businesses(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS businesses_owner_idx ON businesses(owner_id);

-- ============================================================
-- BRAND SETTINGS (AI Configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS brand_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#818cf8',
  accent_color TEXT NOT NULL DEFAULT '#e0e7ff',
  greeting_message TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
  bot_name TEXT NOT NULL DEFAULT 'AI Assistant',
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
-- FEATURE TOGGLES
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_toggles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  chat_enabled BOOLEAN NOT NULL DEFAULT true,
  voice_enabled BOOLEAN NOT NULL DEFAULT true,
  booking_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SERVICES
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'INR',
  duration_minutes INT NOT NULL DEFAULT 30,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS services_business_idx ON services(business_id);

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

CREATE INDEX IF NOT EXISTS knowledge_documents_business_idx ON knowledge_documents(business_id);

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

CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
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
-- APPOINTMENT CONFIG
-- ============================================================
CREATE TABLE IF NOT EXISTS appointment_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  buffer_minutes INT NOT NULL DEFAULT 0,
  max_daily_appointments INT NOT NULL DEFAULT 50,
  advance_booking_days INT NOT NULL DEFAULT 30,
  cancellation_hours INT NOT NULL DEFAULT 24,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  staff_id UUID,
  chat_id UUID,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  appointment_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  service TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','cancelled','completed','no-show')),
  notes TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_business_date_idx ON appointments(business_id, appointment_time);
CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments(business_id, status);

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

CREATE INDEX IF NOT EXISTS chats_business_idx ON chats(business_id);
CREATE INDEX IF NOT EXISTS chats_visitor_idx ON chats(visitor_id);

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
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','active','completed','failed')),
  transcript JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  appointment_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_calls_business_idx ON voice_calls(business_id);

-- ============================================================
-- SHARING ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS sharing_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('qr_scan','link_click','page_visit','chat_started','voice_started','appointment_booked')),
  visitor_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sharing_analytics_business_idx ON sharing_analytics(business_id, created_at DESC);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  agent_type TEXT,
  chat_id UUID,
  voice_call_id UUID,
  visitor_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_business_date_idx ON analytics_events(business_id, created_at DESC);

-- ============================================================
-- CUSTOMER INTERACTIONS (visitor tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  page_views INT NOT NULL DEFAULT 1,
  chats_count INT NOT NULL DEFAULT 0,
  voice_calls_count INT NOT NULL DEFAULT 0,
  appointments_count INT NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, visitor_id)
);

CREATE INDEX IF NOT EXISTS customer_interactions_business_idx ON customer_interactions(business_id);

-- ============================================================
-- FUNCTION: update_updated_at()
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- FUNCTION: user_owns_business(UUID)
-- ============================================================
CREATE OR REPLACE FUNCTION user_owns_business(p_business_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM businesses WHERE id = p_business_id AND owner_id = auth.uid()
  );
$$;

-- ============================================================
-- FUNCTION: match_documents (semantic search)
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
    kc.id, kc.document_id, kc.business_id, kc.content,
    kc.embedding, kc.metadata, kc.created_at,
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
-- FUNCTION: get_available_slots(UUID, DATE)
-- ============================================================
CREATE OR REPLACE FUNCTION get_available_slots(
  p_business_id UUID,
  p_date DATE
)
RETURNS TABLE (slot_time TIMESTAMPTZ, is_available BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_of_week INT;
  v_start_time TIME;
  v_end_time TIME;
  v_slot_duration INT;
  v_current_slot TIMESTAMPTZ;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  v_slot_duration := COALESCE(
    (SELECT slot_duration_minutes FROM appointment_config WHERE business_id = p_business_id),
    30
  );

  SELECT start_time, end_time INTO v_start_time, v_end_time
  FROM business_hours
  WHERE business_id = p_business_id AND day_of_week = v_day_of_week AND is_available = true;

  IF v_start_time IS NULL THEN
    RETURN;
  END IF;

  v_current_slot := p_date + v_start_time;
  WHILE v_current_slot + (v_slot_duration || ' minutes')::INTERVAL <= p_date + v_end_time LOOP
    slot_time := v_current_slot;
    is_available := NOT EXISTS (
      SELECT 1 FROM appointments
      WHERE business_id = p_business_id
        AND appointment_time = v_current_slot
        AND status NOT IN ('cancelled', 'no-show')
    );
    RETURN NEXT;
    v_current_slot := v_current_slot + (v_slot_duration || ' minutes')::INTERVAL;
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
  p_customer_phone TEXT DEFAULT NULL,
  p_appointment_time TIMESTAMPTZ DEFAULT NULL,
  p_duration_minutes INT DEFAULT 30,
  p_service TEXT DEFAULT NULL,
  p_service_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check slot availability
  IF EXISTS (
    SELECT 1 FROM appointments
    WHERE business_id = p_business_id
      AND appointment_time = p_appointment_time
      AND status NOT IN ('cancelled', 'no-show')
  ) THEN
    RAISE EXCEPTION 'Slot is already booked';
  END IF;

  INSERT INTO appointments (
    business_id, customer_name, customer_email, customer_phone,
    appointment_time, duration_minutes, service, service_id, notes, status
  ) VALUES (
    p_business_id, p_customer_name, p_customer_email, p_customer_phone,
    p_appointment_time, p_duration_minutes, p_service, p_service_id, p_notes, 'scheduled'
  )
  RETURNING id INTO v_id;

  -- Log analytics
  INSERT INTO analytics_events (business_id, event_type, visitor_id, metadata)
  VALUES (p_business_id, 'appointment_booked', p_customer_email, jsonb_build_object(
    'appointment_id', v_id,
    'service', p_service,
    'time', p_appointment_time
  ));

  RETURN v_id;
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
    'total_visitors', (SELECT COUNT(DISTINCT visitor_id) FROM customer_interactions WHERE business_id = p_business_id),
    'total_chats', (SELECT COUNT(*) FROM chats WHERE business_id = p_business_id),
    'total_voice_calls', (SELECT COUNT(*) FROM voice_calls WHERE business_id = p_business_id),
    'total_appointments', (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id),
    'appointments_today', (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id AND DATE(appointment_time) = CURRENT_DATE),
    'appointments_scheduled', (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id AND status IN ('scheduled', 'confirmed')),
    'appointments_completed', (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id AND status = 'completed'),
    'appointments_cancelled', (SELECT COUNT(*) FROM appointments WHERE business_id = p_business_id AND status = 'cancelled'),
    'total_documents', (SELECT COUNT(*) FROM knowledge_documents WHERE business_id = p_business_id AND status = 'indexed'),
    'total_qr_scans', (SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'qr_scan'),
    'total_link_clicks', (SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'link_click'),
    'total_page_visits', (SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'page_visit'),
    'active_conversations', (SELECT COUNT(*) FROM chats WHERE business_id = p_business_id AND is_active = true AND status = 'active'),
    'total_conversations', (SELECT COUNT(*) FROM chats WHERE business_id = p_business_id),
    'conversion_rate', COALESCE(
      (SELECT ROUND(
        (SELECT COUNT(*)::FLOAT FROM appointments WHERE business_id = p_business_id) /
        NULLIF((SELECT COUNT(*)::FLOAT FROM chats WHERE business_id = p_business_id), 0) * 100
      , 1)), 0
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- FUNCTION: get_daily_analytics
-- ============================================================
CREATE OR REPLACE FUNCTION get_daily_analytics(
  p_business_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (date DATE, event_type TEXT, count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DATE(created_at) as date, event_type, COUNT(*)::BIGINT as count
  FROM analytics_events
  WHERE business_id = p_business_id
    AND DATE(created_at) BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(created_at), event_type
  ORDER BY date, event_type;
END;
$$;

-- ============================================================
-- FUNCTION: get_popular_queries
-- ============================================================
CREATE OR REPLACE FUNCTION get_popular_queries(
  p_business_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (query TEXT, count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT cm.content as query, COUNT(*)::BIGINT as count
  FROM chat_messages cm
  WHERE cm.business_id = p_business_id
    AND cm.role = 'user'
    AND LENGTH(cm.content) > 5
  GROUP BY cm.content
  ORDER BY count DESC
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- FUNCTION: get_sharing_analytics
-- ============================================================
CREATE OR REPLACE FUNCTION get_sharing_analytics(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_qr_scans', COALESCE((SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'qr_scan'), 0),
    'total_link_clicks', COALESCE((SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'link_click'), 0),
    'total_page_visits', COALESCE((SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'page_visit'), 0),
    'total_chats_started', COALESCE((SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'chat_started'), 0),
    'total_voice_started', COALESCE((SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'voice_started'), 0),
    'total_appointments_booked', COALESCE((SELECT COUNT(*) FROM sharing_analytics WHERE business_id = p_business_id AND event_type = 'appointment_booked'), 0),
    'daily_breakdown', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'date', DATE(created_at),
        'qr_scans', COUNT(*) FILTER (WHERE event_type = 'qr_scan'),
        'link_clicks', COUNT(*) FILTER (WHERE event_type = 'link_click'),
        'page_visits', COUNT(*) FILTER (WHERE event_type = 'page_visit')
      ) ORDER BY DATE(created_at) DESC)
      FROM sharing_analytics
      WHERE business_id = p_business_id
      GROUP BY DATE(created_at)
      LIMIT 30), '[]'::JSONB
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- FUNCTION: get_customer_engagement
-- ============================================================
CREATE OR REPLACE FUNCTION get_customer_engagement(p_business_id UUID)
RETURNS TABLE (
  visitor_id TEXT,
  visitor_name TEXT,
  page_views INT,
  chats_count INT,
  voice_calls_count INT,
  appointments_count INT,
  last_interaction_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT ci.visitor_id, ci.visitor_name, ci.page_views, ci.chats_count,
         ci.voice_calls_count, ci.appointments_count, ci.last_interaction_at
  FROM customer_interactions ci
  WHERE ci.business_id = p_business_id
  ORDER BY ci.last_interaction_at DESC
  LIMIT 50;
END;
$$;

-- ============================================================
-- FUNCTION: get_ai_usage_stats
-- ============================================================
CREATE OR REPLACE FUNCTION get_ai_usage_stats(p_business_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_messages', (SELECT COUNT(*) FROM chat_messages WHERE business_id = p_business_id AND role IN ('user', 'assistant')),
    'total_ai_responses', (SELECT COUNT(*) FROM chat_messages WHERE business_id = p_business_id AND role = 'assistant'),
    'knowledge_queries', (SELECT COUNT(*) FROM chat_messages WHERE business_id = p_business_id AND agent_type = 'knowledge'),
    'appointment_queries', (SELECT COUNT(*) FROM chat_messages WHERE business_id = p_business_id AND agent_type = 'appointment'),
    'pricing_queries', (SELECT COUNT(*) FROM chat_messages WHERE business_id = p_business_id AND agent_type = 'pricing'),
    'total_voice_minutes', COALESCE(
      (SELECT SUM(duration_seconds) / 60 FROM voice_calls WHERE business_id = p_business_id), 0
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE TRIGGER businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brand_settings_updated_at BEFORE UPDATE ON brand_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER knowledge_documents_updated_at BEFORE UPDATE ON knowledge_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER feature_toggles_updated_at BEFORE UPDATE ON feature_toggles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER voice_calls_updated_at BEFORE UPDATE ON voice_calls FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;

-- Businesses
CREATE POLICY "owners can see own businesses" ON businesses FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "owners can insert businesses" ON businesses FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners can update businesses" ON businesses FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "owners can delete businesses" ON businesses FOR DELETE USING (owner_id = auth.uid());
CREATE POLICY "public can read published businesses" ON businesses FOR SELECT USING (is_active = true);

-- Brand settings
CREATE POLICY "owners can manage brand_settings" ON brand_settings FOR ALL USING (user_owns_business(business_id));
CREATE POLICY "public can read published brand_settings" ON brand_settings FOR SELECT USING (is_published = true);

-- Feature toggles
CREATE POLICY "owners can manage feature_toggles" ON feature_toggles FOR ALL USING (user_owns_business(business_id));

-- Knowledge documents
CREATE POLICY "owners can manage knowledge_documents" ON knowledge_documents FOR ALL USING (user_owns_business(business_id));

-- Knowledge chunks
CREATE POLICY "owners can manage knowledge_chunks" ON knowledge_chunks FOR ALL USING (user_owns_business(business_id));

-- Services
CREATE POLICY "owners can manage services" ON services FOR ALL USING (user_owns_business(business_id));
CREATE POLICY "public can read services" ON services FOR SELECT USING (true);

-- Business hours
CREATE POLICY "owners can manage business_hours" ON business_hours FOR ALL USING (user_owns_business(business_id));
CREATE POLICY "public can read business_hours" ON business_hours FOR SELECT USING (true);

-- Appointment config
CREATE POLICY "owners can manage appointment_config" ON appointment_config FOR ALL USING (user_owns_business(business_id));

-- Appointments
CREATE POLICY "owners can manage appointments" ON appointments FOR ALL USING (user_owns_business(business_id));

-- Chats
CREATE POLICY "owners can manage chats" ON chats FOR ALL USING (user_owns_business(business_id));
CREATE POLICY "public can insert chats" ON chats FOR INSERT WITH CHECK (true);

-- Chat messages
CREATE POLICY "owners can manage chat_messages" ON chat_messages FOR ALL USING (user_owns_business(business_id));
CREATE POLICY "public can insert chat_messages" ON chat_messages FOR INSERT WITH CHECK (true);

-- Voice calls
CREATE POLICY "owners can manage voice_calls" ON voice_calls FOR ALL USING (user_owns_business(business_id));

-- Sharing analytics
CREATE POLICY "owners can read sharing_analytics" ON sharing_analytics FOR SELECT USING (user_owns_business(business_id));
CREATE POLICY "public can insert sharing_analytics" ON sharing_analytics FOR INSERT WITH CHECK (true);

-- Analytics events
CREATE POLICY "owners can read analytics_events" ON analytics_events FOR SELECT USING (user_owns_business(business_id));
CREATE POLICY "public can insert analytics_events" ON analytics_events FOR INSERT WITH CHECK (true);

-- Customer interactions
CREATE POLICY "owners can manage customer_interactions" ON customer_interactions FOR ALL USING (user_owns_business(business_id));
CREATE POLICY "public can insert customer_interactions" ON customer_interactions FOR INSERT WITH CHECK (true);