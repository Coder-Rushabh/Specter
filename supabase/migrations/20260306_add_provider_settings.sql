-- Migration to support user-configurable LLM providers
ALTER TABLE projects ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'ollama' CHECK (llm_provider IN ('ollama', 'gemini', 'openai'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS encrypted_llm_key TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS save_llm_key BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN projects.encrypted_llm_key IS 'AES-256-CBC encrypted API key for the chosen LLM provider';
