-- Make leads table completely open for demo purposes
-- Anyone can do anything with leads (for testing)

DROP POLICY IF EXISTS "Anyone can read leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;

-- Open policies for all operations
CREATE POLICY "Open read leads"
  ON leads FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Open insert leads"
  ON leads FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Open update leads"
  ON leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Open delete leads"
  ON leads FOR DELETE TO anon, authenticated USING (true);
