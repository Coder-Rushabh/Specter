-- Add model name column for user-specified model (e.g. anthropic/claude-3-5-sonnet)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS llm_model_name TEXT;

-- Expand provider constraint to include openrouter
DO $$ BEGIN
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_llm_provider_check;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE projects ADD CONSTRAINT projects_llm_provider_check
    CHECK (llm_provider IN ('ollama', 'gemini', 'openai', 'openrouter'));
