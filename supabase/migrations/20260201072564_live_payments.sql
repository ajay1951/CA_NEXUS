-- Full Payment Gateway with Vendor Commission System
-- This enables live Razorpay payments with automated revenue splitting

-- Create vendor_accounts table for lead sellers
CREATE TABLE IF NOT EXISTS vendor_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  user_email text,
  razorpay_account_id text,
  business_name text,
  commission_rate decimal(5,2) DEFAULT 10.00,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_splits table for tracking revenue distribution
CREATE TABLE IF NOT EXISTS payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id text NOT NULL,
  vendor_id uuid REFERENCES vendor_accounts(id),
  lead_id uuid REFERENCES leads(id),
  gross_amount decimal(10,2) NOT NULL,
  commission_amount decimal(10,2) NOT NULL,
  net_amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Create transactions table for payment history
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  lead_id uuid REFERENCES leads(id),
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'INR',
  payment_method text,
  razorpay_payment_id text,
  razorpay_order_id text,
  razorpay_signature text,
  status text DEFAULT 'pending',
  type text DEFAULT 'purchase',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create invoices table for tax compliance
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  user_id text NOT NULL,
  lead_id uuid REFERENCES leads(id),
  subtotal decimal(10,2) NOT NULL,
  gst_rate decimal(5,2) DEFAULT 18.00,
  gst_amount decimal(10,2) NOT NULL,
  total decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  pdf_url text,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE vendor_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_accounts_user ON vendor_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_vendor ON payment_splits(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_payment ON payment_splits(payment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_lead ON transactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- RLS Policies for vendor_accounts
CREATE POLICY "Users can view own vendor account" 
ON vendor_accounts FOR SELECT TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create vendor account" 
ON vendor_accounts FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid()::text);

-- RLS Policies for payment_splits
CREATE POLICY "Anyone can view payment splits" 
ON payment_splits FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Service can insert payment splits" 
ON payment_splits FOR INSERT TO authenticated 
WITH CHECK (true);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" 
ON transactions FOR SELECT TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY "Service can insert transactions" 
ON transactions FOR INSERT TO authenticated 
WITH CHECK (true);

-- RLS Policies for invoices
CREATE POLICY "Users can view own invoices" 
ON invoices FOR SELECT TO authenticated 
USING (user_id = auth.uid()::text);

CREATE POLICY "Service can create invoices" 
ON invoices FOR INSERT TO authenticated 
WITH CHECK (true);
