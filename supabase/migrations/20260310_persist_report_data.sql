-- Add JSONB column to store aggregated report data (stats, scores, etc.)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN reports.report_data IS 'Pre-calculated aggregations (emotionStats, sessionScores, etc.) to avoid frontend recalculation.';
