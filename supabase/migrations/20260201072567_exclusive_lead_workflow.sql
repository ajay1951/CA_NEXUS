-- Exclusive Lead Workflow: Request & Approve Model
-- Migration: 20260201072567
-- Purpose: Enable exclusive lead assignment with admin approval

-- =============================================================================
-- 1. LEAD REQUESTS TABLE - Track which CA requested which lead
-- =============================================================================
CREATE TABLE IF NOT EXISTS lead_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, user_id)
);

-- =============================================================================
-- 2. ADD STATUS COLUMNS TO LEADS TABLE
-- =============================================================================
-- Add status column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'status'
  ) THEN
    ALTER TABLE leads ADD COLUMN status text NOT NULL DEFAULT 'available' 
      CHECK (status IN ('available', 'requested', 'assigned', 'in_progress', 'completed', 'cancelled'));
  END IF;
END $$;

-- Add assigned_to column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE leads ADD COLUMN assigned_to uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add assigned_at column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'assigned_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN assigned_at timestamptz;
  END IF;
END $$;

-- =============================================================================
-- 3. LEAD TASKS TABLE - Track task state machine
-- =============================================================================
CREATE TABLE IF NOT EXISTS lead_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_request_id uuid REFERENCES lead_requests(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'approved', 'document_collection', 'filing', 'completed', 'cancelled')),
  otp_verified boolean DEFAULT false,
  documents jsonb DEFAULT '[]'::jsonb,
  current_step text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(lead_id, user_id)
);

-- =============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE lead_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5. RLS POLICIES FOR LEAD REQUESTS
-- =============================================================================
-- Users can view their own requests
CREATE POLICY "Users can view their own lead requests" 
  ON lead_requests FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Users can create requests
CREATE POLICY "Users can create lead requests" 
  ON lead_requests FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Users can update their own requests (cancel)
CREATE POLICY "Users can update their own lead requests" 
  ON lead_requests FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Admin can view all requests
CREATE POLICY "Admin can view all lead requests" 
  ON lead_requests FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update any request (approve/reject)
CREATE POLICY "Admin can update all lead requests" 
  ON lead_requests FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- 6. RLS POLICIES FOR LEAD TASKS
-- =============================================================================
-- Users can view their own tasks
CREATE POLICY "Users can view own lead tasks" 
  ON lead_tasks FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Users can update their own tasks
CREATE POLICY "Users can update own lead tasks" 
  ON lead_tasks FOR UPDATE 
  TO authenticated 
  USING (user_id = auth.uid());

-- Users can insert their own tasks
CREATE POLICY "Users can create lead tasks" 
  ON lead_tasks FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Admin can view all tasks
CREATE POLICY "Admin can view all lead tasks" 
  ON lead_tasks FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- 7. RLS POLICIES FOR LEADS (Updated for exclusive access)
-- =============================================================================
-- Anyone can view available leads (not assigned)
CREATE POLICY "Anyone can view available leads" 
  ON leads FOR SELECT 
  TO anon, authenticated 
  USING (status = 'available' OR assigned_to = auth.uid());

-- Admin can view all leads
CREATE POLICY "Admin can view all leads" 
  ON leads FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admin can update leads (for assigning)
CREATE POLICY "Admin can update leads" 
  ON leads FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================================
-- 8. INDEXES FOR PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_lead_requests_lead_id ON lead_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_requests_user_id ON lead_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_requests_status ON lead_requests(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead_id ON lead_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_user_id ON lead_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- =============================================================================
-- 9. FUNCTION: Update lead status when request is approved
-- =============================================================================
CREATE OR REPLACE FUNCTION approve_lead_request()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Update the lead to assigned status
    UPDATE leads 
    SET 
      status = 'assigned',
      assigned_to = NEW.user_id,
      assigned_at = NOW()
    WHERE id = NEW.lead_id;
    
    -- Create lead task record
    INSERT INTO lead_tasks (lead_id, user_id, lead_request_id, status, current_step)
    VALUES (NEW.lead_id, NEW.user_id, NEW.id, 'approved', 'approved')
    ON CONFLICT (lead_id, user_id) DO UPDATE
    SET status = 'approved', current_step = 'approved', updated_at = NOW();
  END IF;
  
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    -- Make lead available again if rejected
    UPDATE leads 
    SET status = 'available'
    WHERE id = NEW.lead_id AND status = 'requested';
  END IF;
  
  NEW.reviewed_at = NOW();
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_approve_lead_request ON lead_requests;
CREATE TRIGGER trigger_approve_lead_request
  AFTER UPDATE ON lead_requests
  FOR EACH ROW
  EXECUTE FUNCTION approve_lead_request();

-- =============================================================================
-- 10. FUNCTION: Handle lead task status updates
-- =============================================================================
CREATE OR REPLACE FUNCTION update_lead_task_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Update lead status based on task status
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
    UPDATE leads SET status = 'completed' WHERE id = NEW.lead_id;
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Free up the lead
    UPDATE leads 
    SET status = 'available', assigned_to = NULL, assigned_at = NULL 
    WHERE id = NEW.lead_id;
  ELSIF NEW.status IN ('document_collection', 'filing') AND OLD.status NOT IN ('document_collection', 'filing') THEN
    UPDATE leads SET status = 'in_progress' WHERE id = NEW.lead_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_lead_task_status ON lead_tasks;
CREATE TRIGGER trigger_update_lead_task_status
  BEFORE UPDATE ON lead_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_task_status();

-- =============================================================================
-- 11. COMMENT ON TABLES
-- =============================================================================
COMMENT ON TABLE lead_requests IS 'Tracks lead access requests from CAs - enables Request & Approve model';
COMMENT ON TABLE lead_tasks IS 'Tracks task state machine: requested -> approved -> document_collection -> filing -> completed';
COMMENT ON COLUMN leads.status IS 'Lead availability: available, requested, assigned, in_progress, completed, cancelled';
COMMENT ON COLUMN leads.assigned_to IS 'UUID of CA who has exclusive access to this lead';

-- =============================================================================
-- DONE!
-- =============================================================================
