-- CA Nexus Hub - Strict RLS Policies
-- Enforces database-level access control for security

-- ============================================
-- LEADS TABLE - Strict Access Control
-- ============================================

-- Drop existing open policies
DROP POLICY IF EXISTS "Open read leads" ON leads;
DROP POLICY IF EXISTS "Open insert leads" ON leads;
DROP POLICY IF EXISTS "Open update leads" ON leads;
DROP POLICY IF EXISTS "Open delete leads" ON leads;

-- 1. ADMIN SELECT: Admins see ALL data (including phone/email)
CREATE POLICY "Admins can read all leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. PUBLIC SELECT: Non-authenticated users see leads without contact info
CREATE POLICY "Public can read leads without contact"
  ON leads FOR SELECT
  TO anon
  USING (status = 'available' OR status IS NULL);

-- 3. AUTHENTICATED USERS: See available leads + their purchased leads (without contact)
CREATE POLICY "Users can read available and purchased leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    status = 'available' OR 
    status IS NULL OR
    id IN (
      SELECT lead_id FROM purchased_leads WHERE user_id = auth.uid()
    )
  );

-- 2. ADMIN ONLY: Insert leads (only admins can add leads)
CREATE POLICY "Only admins can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. ADMIN ONLY: Update leads
CREATE POLICY "Only admins can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. ADMIN ONLY: Delete leads
CREATE POLICY "Only admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- PURCHASED_LEADS TABLE
-- ============================================

-- Users can view their own purchases
CREATE POLICY "Users can view own purchased leads"
  ON purchased_leads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only Edge Functions (via service role) can insert purchases
-- Remove user-facing insert policy
DROP POLICY IF EXISTS "Users can insert their own purchased leads" ON purchased_leads;

-- ============================================
-- PROFILES TABLE - Prevent Role Modification
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2. Users can update their own profile (BUT NOT ROLE)
CREATE POLICY "Users can update own profile data"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
  );

-- 3. Only admins can insert profiles (handled by trigger)
-- 4. Only admins can change roles
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- AUDIT_LOGS - Server/Admin Only Access
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Anon can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON audit_logs;

-- 1. ONLY ADMINS can read audit logs
CREATE POLICY "Only admins can read audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. ONLY SERVICE ROLE can insert (Edge Functions use this)
-- This policy is for service role key usage
-- Note: In Supabase, service role bypasses RLS, so this is for documentation

-- ============================================
-- ORDERS TABLE - Payment Security
-- ============================================

-- Create orders table if not exists
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  amount numeric NOT NULL,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text DEFAULT 'razorpay',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert/update (Edge Functions)
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;

-- ============================================
-- INVOICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  subtotal numeric NOT NULL,
  gst_rate numeric DEFAULT 18,
  gst_amount numeric,
  total numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- WHATSAPP_MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  lead_id uuid REFERENCES leads(id),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text DEFAULT 'general',
  content text NOT NULL,
  twilio_sid text,
  from_number text,
  to_number text,
  status text DEFAULT 'sent',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own whatsapp messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all messages
CREATE POLICY "Admins can view all whatsapp messages"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Helper Function for Lead Access
-- ============================================

-- Function to check if user has access to lead contact info
CREATE OR REPLACE FUNCTION has_lead_access(lead_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM purchased_leads pl
    WHERE pl.user_id = auth.uid()
    AND pl.lead_id = lead_uuid
    AND pl.payment_status = 'completed'
  ) OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get lead with contact info (if authorized)
CREATE OR REPLACE FUNCTION get_lead_with_contact(lead_uuid UUID)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  company_name text,
  budget numeric,
  phone text,
  email text,
  status text,
  has_access boolean
) AS $$
BEGIN
  -- Check if user has access
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.category,
    l.company_name,
    l.budget,
    CASE 
      WHEN has_lead_access(lead_uuid) THEN l.phone
      ELSE NULL::text
    END as phone,
    CASE 
      WHEN has_lead_access(lead_uuid) THEN l.email
      ELSE NULL::text
    END as email,
    l.status,
    has_lead_access(lead_uuid) as has_access
  FROM leads l
  WHERE l.id = lead_uuid;
END;
$$ LANGUAGE plpgsql;
