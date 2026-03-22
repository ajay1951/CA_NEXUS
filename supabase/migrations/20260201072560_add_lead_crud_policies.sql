-- Add INSERT, UPDATE, DELETE policies for leads table
-- Admins can add, edit, and delete leads

-- Allow anyone (including anon) to read leads
DROP POLICY IF EXISTS "Leads are publicly readable" ON leads;
CREATE POLICY "Anyone can read leads"
  ON leads FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to insert leads (for admin)
CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update leads (for admin)
CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete leads (for admin)
CREATE POLICY "Authenticated users can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);

-- Also add policy for anon users to insert (temporary - for demo)
CREATE POLICY "Anon users can insert leads"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Update leads table to allow more categories
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_category_check,
ADD CONSTRAINT leads_category_check 
CHECK (category IN ('gst_audit', 'tax', 'audit', 'advisory'));
