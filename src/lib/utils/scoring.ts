/**
 * Shared utility for calculating UX scores consistently across backend (reporter)
 * and frontend (UI).
 *
 * Score range: 0–100
 * Neutral baseline: 60  (a product users feel nothing about is mediocre, not good)
 * Positive headroom: 40 points (60→100) — rewarded by delight/satisfaction
 * Negative headroom: 60 points (60→0)  — punished by frustration/confusion
 *
 * Weighting rationale:
 *  - Frustration is the strongest negative signal  (-20) — users may churn
 *  - Disappointment is severe but recoverable      (-12)
 *  - Confusion is a hard blocker                  (-10)
 *  - Boredom signals disengagement                (-6)
 *  - Delight is the gold standard positive        (+15)
 *  - Surprise can be positive (discovery)          (+8)
 *  - Satisfaction is quiet success                 (+6)
 *  - Curiosity keeps users exploring               (+4)
 *  - Neutral is truly zero — neither good nor bad   (0)
 */

export type UXEmotionTag =
    | 'delight' | 'satisfaction' | 'curiosity' | 'surprise'
    | 'neutral'
    | 'confusion' | 'boredom' | 'frustration' | 'disappointment';

export const ALL_EMOTIONS: UXEmotionTag[] = [
    'delight', 'satisfaction', 'curiosity', 'surprise',
    'neutral',
    'confusion', 'boredom', 'frustration', 'disappointment'
];

export const EMOTION_WEIGHTS: Record<string, number> = {
    delight: 15,
    satisfaction: 6,
    curiosity: 4,
    surprise: 8,
    neutral: 0,
    confusion: -10,
    boredom: -6,
    frustration: -20,
    disappointment: -12,
};

// Score mapping constants
const NEUTRAL_BASELINE = 60;   // neutral average → 60/100
const MAX_WEIGHT = 15;         // delight weight (maps to 100)
const MIN_WEIGHT = -20;        // frustration weight (maps to 0)

export interface ScoringLog {
    emotion_tag: UXEmotionTag | string;
    action_taken?: {
        emotional_intensity?: number;
        heuristic_finding?: string | null;
        technical_metrics?: {
            latency_ms?: number;
            has_errors?: boolean;
        };
    };
}

export interface ScoringSession {
    status: 'completed' | 'abandoned' | 'error' | string;
    session_logs?: ScoringLog[];
    persona?: {
        tech_literacy: 'low' | 'medium' | 'high';
    };
}

export interface DetailedScore {
    mainScore: number;
    emotionScores: Record<string, number>;  // emotion → % of steps
}

/**
 * Normalizes emotional_intensity to the 0.0–1.0 range.
 * Handles three real-world cases:
 *   - undefined/null → 0.5 (assume moderate impact)
 *   - already 0.0–1.0 → use as-is
 *   - 0–100 scale (some LLMs emit this) → divide by 100
 *   - anything else outside bounds → clamp to [0, 1]
 */
function normalizeIntensity(raw: unknown): number {
    if (raw === undefined || raw === null || typeof raw !== 'number' || isNaN(raw)) {
        return 0.5;
    }
    if (raw > 1 && raw <= 100) return raw / 100;   // 0–100 scale
    return Math.max(0, Math.min(1, raw));            // clamp 0–1
}

/**
 * Calculates a robust UX health score (0–100).
 *
 * Algorithm:
 * 1. For each log step: contribution = EMOTION_WEIGHTS[emotion] × intensity
 * 2. Compute average contribution across all steps
 * 3. Map average linearly to 0–100 with neutral → 60
 *
 * Returns 50 for sessions with no logs (no data = unknown, not perfect).
 * Sessions with error/abandoned status get up to a -10 point penalty
 * on top of the emotion-based score.
 */
export function calculateSessionScore(session: ScoringSession): DetailedScore {
    const logs = session.session_logs || [];

    if (logs.length === 0) {
        // No data — return a neutral-ish unknown score, not 100
        return { mainScore: 50, emotionScores: {} };
    }

    let totalWeight = 0;
    const counts: Record<string, number> = {};

    for (const log of logs) {
        const emotion = (log.emotion_tag || 'neutral').toLowerCase();
        const weight = EMOTION_WEIGHTS[emotion] ?? 0;
        const intensity = normalizeIntensity(log.action_taken?.emotional_intensity);

        totalWeight += weight * intensity;
        counts[emotion] = (counts[emotion] || 0) + 1;
    }

    const totalSteps = logs.length;
    const averageWeight = totalWeight / totalSteps;

    // Linear map: averageWeight → 0..100 with NEUTRAL_BASELINE at 0
    let mainScore: number;
    if (averageWeight >= 0) {
        // 0 → NEUTRAL_BASELINE, MAX_WEIGHT → 100
        mainScore = NEUTRAL_BASELINE + (averageWeight / MAX_WEIGHT) * (100 - NEUTRAL_BASELINE);
    } else {
        // 0 → NEUTRAL_BASELINE, MIN_WEIGHT → 0
        mainScore = NEUTRAL_BASELINE + (averageWeight / Math.abs(MIN_WEIGHT)) * NEUTRAL_BASELINE;
    }

    mainScore = Math.max(0, Math.min(100, Math.round(mainScore)));

    // Build emotion breakdown: percentage of steps per emotion
    const emotionScores: Record<string, number> = {};
    for (const [emotion, count] of Object.entries(counts)) {
        emotionScores[emotion] = Math.round((count / totalSteps) * 100);
    }

    return { mainScore, emotionScores };
}

/**
 * Calculates the average score across multiple sessions.
 * Skips sessions with 'error' status that have no logs (they'd skew to 50).
 */
export function calculateAverageScore(sessions: ScoringSession[]): number {
    if (!sessions || sessions.length === 0) return 0;

    const scoreable = sessions.filter(s =>
        // Include all sessions that have logs, or non-error ones without logs
        (s.session_logs && s.session_logs.length > 0) || s.status !== 'error'
    );
    if (scoreable.length === 0) return 0;

    const total = scoreable.reduce((acc, s) => acc + calculateSessionScore(s).mainScore, 0);
    return Math.round(total / scoreable.length);
}
