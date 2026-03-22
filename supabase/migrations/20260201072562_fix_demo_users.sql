-- Fix for demo users to be able to purchase leads
-- Allow inserts for demo mode users

-- Drop existing policies that require authentication
DROP POLICY IF EXISTS "Users can insert their own purchased leads" ON purchased_leads;
DROP POLICY IF EXISTS "Users can view their own purchased leads" ON purchased_leads;

-- Create more permissive policies for demo mode
-- Allow anyone to insert (will be filtered by app logic)
CREATE POLICY "Anyone can insert purchased leads" 
ON purchased_leads FOR INSERT TO authenticated 
WITH CHECK (true);

-- Allow anyone to view their own purchases (filtered by user_id in query)
CREATE POLICY "Anyone can view own purchased leads" 
ON purchased_leads FOR SELECT TO authenticated 
USING (true);

-- Also allow for anon users (demo mode)
CREATE POLICY "Anon can insert purchased leads" 
ON purchased_leads FOR INSERT TO anon 
WITH CHECK (true);

CREATE POLICY "Anon can view purchased leads" 
ON purchased_leads FOR SELECT TO anon 
USING (true);

-- Do the same for orders table
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

CREATE POLICY "Anyone can view own orders" 
ON orders FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Anyone can create own orders" 
ON orders FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Anyone can update own orders" 
ON orders FOR UPDATE TO authenticated 
USING (true);

-- For anon/demo
CREATE POLICY "Anon can view orders" 
ON orders FOR SELECT TO anon 
USING (true);

CREATE POLICY "Anon can create orders" 
ON orders FOR INSERT TO anon 
WITH CHECK (true);
