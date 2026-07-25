-- ================================================================
-- Migration: Dual Auth — Business Owner vs User/Customer roles
-- ================================================================

-- 1. Add user_role to the auth metadata (stored in user_metadata, no schema change needed)
--    But we track it in a profiles table for fast lookups.

-- 2. Create user_profiles table for customer/user accounts
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  avatar_url  TEXT,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'business')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add cover_url and extra profile fields to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS cover_url        TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tagline          TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS category         TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city             TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS state            TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS country          TEXT DEFAULT 'India';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postal_code      TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS opening_hours    JSONB DEFAULT '{}';

-- 4. Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Allow anyone to view active businesses (for /explore page)
DROP POLICY IF EXISTS "Public can view active businesses" ON businesses;
CREATE POLICY "Public can view active businesses"
  ON businesses FOR SELECT
  USING (is_active = true);

-- 6. Function: auto-create user_profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'business_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
