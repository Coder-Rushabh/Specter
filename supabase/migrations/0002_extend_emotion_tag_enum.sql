-- Extend the emotion_tag enum to include all 9 UXEmotion values used by the engine.
-- The original migration only defined 4: neutral, confusion, frustration, delight.
-- The engine also emits: satisfaction, curiosity, surprise, boredom, disappointment.
-- Note: ADD VALUE IF NOT EXISTS is idempotent — safe to run multiple times.

ALTER TYPE emotion_tag ADD VALUE IF NOT EXISTS 'satisfaction';
ALTER TYPE emotion_tag ADD VALUE IF NOT EXISTS 'curiosity';
ALTER TYPE emotion_tag ADD VALUE IF NOT EXISTS 'surprise';
ALTER TYPE emotion_tag ADD VALUE IF NOT EXISTS 'boredom';
ALTER TYPE emotion_tag ADD VALUE IF NOT EXISTS 'disappointment';
