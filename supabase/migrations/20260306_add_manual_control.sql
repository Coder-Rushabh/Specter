-- Add manual control columns to persona_sessions
ALTER TABLE persona_sessions 
ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'autonomous' CHECK (execution_mode IN ('autonomous', 'manual')),
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS step_requested BOOLEAN DEFAULT false;

-- Index for performance in manual mode
CREATE INDEX IF NOT EXISTS idx_persona_sessions_paused ON persona_sessions(is_paused) WHERE (is_paused = true);
