-- Add payment tracking to purchased_leads table
ALTER TABLE purchased_leads 
ADD COLUMN IF NOT EXISTS payment_id text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS amount numeric,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_purchased_leads_user ON purchased_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_purchased_leads_status ON purchased_leads(payment_status);

-- Create orders table for tracking payment transactions
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  lead_id uuid REFERENCES leads(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own orders" 
ON orders FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- Policy: Users can insert their own orders
CREATE POLICY "Users can create own orders" 
ON orders FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own orders
CREATE POLICY "Users can update own orders" 
ON orders FOR UPDATE TO authenticated 
USING (user_id = auth.uid());
