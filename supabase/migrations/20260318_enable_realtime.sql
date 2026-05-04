-- Enable Realtime for live tracking tables safely and idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'persona_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE persona_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'session_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_logs;
  END IF;
END $$;
