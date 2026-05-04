ALTER TABLE persona_sessions
ADD COLUMN IF NOT EXISTS browser_mode TEXT DEFAULT 'browserbase' CHECK (browser_mode IN ('browserbase', 'local'));
