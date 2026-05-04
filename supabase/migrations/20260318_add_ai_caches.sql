-- Create ai_caches table
CREATE TABLE IF NOT EXISTS ai_caches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key text UNIQUE NOT NULL,
    payload jsonb NOT NULL,
    cache_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE ai_caches ENABLE ROW LEVEL SECURITY;

-- Allow authenticated SELECT and INSERT
DROP POLICY IF EXISTS "Allow authenticated read" ON ai_caches;
DROP POLICY IF EXISTS "Allow authenticated insert" ON ai_caches;

CREATE POLICY "Allow authenticated read" ON ai_caches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON ai_caches FOR INSERT TO authenticated WITH CHECK (true);
