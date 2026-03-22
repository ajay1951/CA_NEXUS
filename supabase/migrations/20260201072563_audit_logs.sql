-- CA Nexus Hub - Audit Logs for ICAI Compliance
-- This creates an immutable audit trail of all important actions

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_email text,
  action_type text NOT NULL,
  -- Action types: LEAD_ACCESS, LEAD_PURCHASE, LEAD_VIEW_DETAILS, LEAD_UNLOCK, 
  --               USER_LOGIN, USER_LOGOUT, DATA_EXPORT, ADMIN_ACTION
  lead_id uuid,
  resource_type text,
  resource_id text,
  description text,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_lead ON audit_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all audit logs" 
ON audit_logs FOR SELECT TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Policy: Users can view their own logs
CREATE POLICY "Users can view own audit logs" 
ON audit_logs FOR SELECT TO authenticated 
USING (user_id = auth.uid()::text);

-- Policy: Anonymous can insert (for tracking without auth)
CREATE POLICY "Anon can insert audit logs" 
ON audit_logs FOR INSERT TO anon 
WITH CHECK (true);

-- Policy: Authenticated can insert
CREATE POLICY "Authenticated can insert audit logs" 
ON audit_logs FOR INSERT TO authenticated 
WITH CHECK (true);

-- Drop existing trigger if any and create function to prevent updates/deletes
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs cannot be modified or deleted. This action is logged.';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent updates
DROP TRIGGER IF EXISTS prevent_audit_update ON audit_logs;
CREATE TRIGGER prevent_audit_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_modification();

-- Create trigger to prevent deletes
DROP TRIGGER IF EXISTS prevent_audit_delete ON audit_logs;
CREATE TRIGGER prevent_audit_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_modification();

-- Create view for admin dashboard
CREATE OR REPLACE VIEW audit_logs_summary AS
SELECT 
  DATE(created_at) as date,
  action_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
GROUP BY DATE(created_at), action_type
ORDER BY date DESC, action_type;
