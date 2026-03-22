-- Universal Inbox - Communication Hub for CA Nexus Hub
-- Centralized communication tracking for Email, WhatsApp, and more

-- Create communication_channels table
CREATE TABLE IF NOT EXISTS communication_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL, -- 'email', 'whatsapp', 'sms', 'call'
  icon text,
  color text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create client_threads table - unified conversation threads
CREATE TABLE IF NOT EXISTS client_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL, -- CA who owns this thread
  lead_id uuid REFERENCES leads(id),
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  channel text NOT NULL, -- primary channel
  external_thread_id text, -- ID from external service (WhatsApp, etc.)
  status text DEFAULT 'active', -- 'active', 'archived', 'closed'
  last_message_at timestamptz,
  last_message_preview text,
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES client_threads(id) ON DELETE CASCADE,
  direction text NOT NULL, -- 'inbound', 'outbound'
  channel text NOT NULL, -- 'email', 'whatsapp', 'sms', 'call'
  content text NOT NULL,
  sender_name text,
  sender_identifier text, -- email, phone number
  recipient_name text,
  recipient_identifier text,
  metadata jsonb DEFAULT '{}', -- extra data like attachments, read status
  external_message_id text, -- ID from external service
  status text DEFAULT 'sent', -- 'pending', 'sent', 'delivered', 'read', 'failed'
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

-- Create templates for quick responses
CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  name text NOT NULL,
  content text NOT NULL,
  channel text DEFAULT 'email',
  category text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE communication_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_threads_user ON client_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_lead ON client_threads(lead_id);
CREATE INDEX idx_threads_status ON client_threads(status);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_direction ON messages(direction);

-- RLS Policies
-- Communication channels (public read)
CREATE POLICY "Anyone can view channels" ON communication_channels FOR SELECT TO authenticated USING (true);

-- Client threads
CREATE POLICY "Users can view own threads" ON client_threads FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "Users can create threads" ON client_threads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update own threads" ON client_threads FOR UPDATE TO authenticated USING (user_id = auth.uid()::text);

-- Messages
CREATE POLICY "Users can view messages in own threads" ON messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM client_threads WHERE id = messages.thread_id AND user_id = auth.uid()::text)
);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update messages" ON messages FOR UPDATE TO authenticated USING (true);

-- Message templates
CREATE POLICY "Users can view own templates" ON message_templates FOR SELECT TO authenticated USING (user_id = auth.uid()::text OR is_public = true);
CREATE POLICY "Users can create templates" ON message_templates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text OR is_public = true);

-- Insert default channels
INSERT INTO communication_channels (name, type, icon, color) VALUES
  ('Email', 'email', 'mail', '#EA4335'),
  ('WhatsApp', 'whatsapp', 'message-circle', '#25D366'),
  ('SMS', 'sms', 'message-square', '#FF6B00'),
  ('Phone Call', 'call', 'phone', '#4CAF50')
ON CONFLICT DO NOTHING;

-- Insert default templates
INSERT INTO message_templates (name, content, channel, category, is_public) VALUES
  ('Initial Outreach', 'Dear [Client Name],\n\nI hope this email finds you well. I am reaching out regarding [Lead Title] that might be of interest to your organization.\n\nPlease let me know if you would like to discuss further.\n\nBest regards', 'email', 'outreach', true),
  ('Follow Up', 'Dear [Client Name],\n\nI wanted to follow up on my previous email regarding [Lead Title]. Please let me know if you have any questions.\n\nBest regards', 'email', 'followup', true),
  ('Thank You', 'Dear [Client Name],\n\nThank you for your interest. Please feel free to reach out if you need any further information.\n\nBest regards', 'email', 'general', true)
ON CONFLICT DO NOTHING;
