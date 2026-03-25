-- Performance Indexes for Fast Data Loading
-- Run this in Supabase SQL Editor to significantly improve query speed

-- Leads table indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads(status, created_at DESC);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Lead requests indexes
CREATE INDEX IF NOT EXISTS idx_lead_requests_status ON lead_requests(status);
CREATE INDEX IF NOT EXISTS idx_lead_requests_user_id ON lead_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_requests_lead_id ON lead_requests(lead_id);

-- Purchased leads indexes
CREATE INDEX IF NOT EXISTS idx_purchased_leads_user_id ON purchased_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_purchased_leads_lead_id ON purchased_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_purchased_leads_payment_status ON purchased_leads(payment_status);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Client threads indexes
CREATE INDEX IF NOT EXISTS idx_client_threads_user_id ON client_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_client_threads_status ON client_threads(status);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);