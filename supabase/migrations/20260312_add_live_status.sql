-- Add live_status column to persona_sessions
ALTER TABLE persona_sessions 
ADD COLUMN IF NOT EXISTS live_status TEXT;
