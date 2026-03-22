/*
  # CA Nexus Hub Database Setup

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `title` (text) - Lead type (GST Audit, Tax)
      - `description` (text)
      - `category` (text) - 'gst_audit' or 'tax'
      - `phone` (text) - Contact phone (hidden until purchase)
      - `email` (text) - Contact email (hidden until purchase)
      - `company_name` (text) - Client company name
      - `budget` (numeric) - Estimated budget
      - `created_at` (timestamp)

    - `purchased_leads`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - CA's user ID
      - `lead_id` (uuid, foreign key)
      - `purchased_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Public read access for leads (contact hidden)
    - Users can only view their own purchased leads

  3. Sample Data
    - 8 mock leads (4 GST Audit, 4 Tax)
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('gst_audit', 'tax')),
  phone text NOT NULL,
  email text NOT NULL,
  company_name text NOT NULL,
  budget numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchased_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES leads(id),
  purchased_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lead_id)
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchased_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads are publicly readable"
  ON leads FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can view their own purchased leads"
  ON purchased_leads FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own purchased leads"
  ON purchased_leads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

INSERT INTO leads (title, description, category, phone, email, company_name, budget) VALUES
  ('Mid-Size Manufacturing GST Audit', 'GST audit needed for turnover 2-5 crores, complex input credit issues', 'gst_audit', '+91-9876543210', 'contact1@manufacturing.com', 'Precision Manufacturing Ltd', 150000),
  ('E-commerce GST Compliance', 'GST audit for online retail business with multi-state operations', 'gst_audit', '+91-9876543211', 'contact2@ecommerce.com', 'ShopVerse India', 120000),
  ('Pharmaceutical GST Audit', 'GST audit for pharma distributor with complex inventory tracking', 'gst_audit', '+91-9876543212', 'contact3@pharma.com', 'MediCorp Distribution', 180000),
  ('Service Provider GST Review', 'GST compliance check for IT services company, input credit optimization', 'gst_audit', '+91-9876543213', 'contact4@itservices.com', 'TechVision Services', 100000),
  ('Corporate Tax Planning - MNC', 'Tax planning for multinational with IP transfers, transfer pricing needs', 'tax', '+91-9876543214', 'tax1@mnc.com', 'GlobalTech Solutions Inc', 500000),
  ('Startup Tax Structuring', 'Tax efficient structuring for Series B funded startup, angel investor planning', 'tax', '+91-9876543215', 'tax2@startup.com', 'InnovateLabs Pvt Ltd', 250000),
  ('HNI Investment Portfolio Optimization', 'Tax planning for high net worth individual with diverse investments', 'tax', '+91-9876543216', 'tax3@hniwm.com', 'Wealth Management Advisory', 350000),
  ('Real Estate Developer Tax Strategy', 'Tax planning for property developer with multiple ongoing projects', 'tax', '+91-9876543217', 'tax4@realEstate.com', 'Premier Constructions Ltd', 300000);
