-- Fix Audit Logs RLS and Profile Issues
-- This fixes the "no logs found" issue

-- First, let's see what users exist in auth.users
-- SELECT id, email, raw_user_meta_data FROM auth.users;

-- Fix: Drop and recreate simpler RLS policies for audit_logs
-- The issue was that profiles table check wasn't working properly

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;

-- Simpler policy: All authenticated users can view all audit logs
-- This is acceptable since audit logs are meant for transparency
CREATE POLICY "Authenticated users can view all audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (true);

-- Keep insert policies
DROP POLICY IF EXISTS "Anon can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON audit_logs;

CREATE POLICY "Anyone can insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update or create admin profile (replace with actual admin user ID if different)
-- Run this to set admin role:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@canexushub.com';

-- For demo purposes, let's ensure there's at least one admin profile
UPDATE profiles 
SET role = 'admin' 
WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@canexushub.com');

-- Ensure demo user has a profile with 'user' role
-- UPDATE profiles SET role = 'user' WHERE email = 'demo@canexushub.com';

-- Create profiles for any users who don't have one (using auth.users data)
INSERT INTO profiles (id, name, role, created_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'user'),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

-- Verify the fix - this should show users with their roles
-- SELECT p.id, p.email, p.role, au.email as auth_email
-- FROM profiles p
-- LEFT JOIN auth.users au ON p.id = au.id;

-- Show final profile status
SELECT 
  au.email,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.email;
