import { createAdminClient } from '../supabase/admin';
import { LLMService } from './llm';
import { decrypt } from '../utils/vault';
import { calculateSessionScore, ALL_EMOTIONS } from '../utils/scoring';
import * as fs from 'fs';
import * as path from 'path';

export interface ReportSummary {
    personaName: string;
    goal: string;
    status: 'completed' | 'abandoned' | 'error';
    steps: number;
    summary: string;
    keyFindings: string[];
    journey: {
        step: number;
        action: string;
        emotions: string;
        monologue: string;
    }[];
}

export async function generateAndStoreReport(testRunId: string, force = false) {
    const supabase = createAdminClient();
    console.log(`Generating report for Test Run: ${testRunId} (force=${force})`);

    // ── Skip if a valid summary already exists ──────────────────────────────
    const { data: existingReport } = await (supabase.from('reports') as any)
        .select('executive_summary')
        .eq('test_run_id', testRunId)
        .maybeSingle();

    const PLACEHOLDER_MARKERS = [
        'AI synthesis unavailable',
        'AI synthesis failed',
        'Synthesis in progress'
    ];

    const summaryAlreadyExists = !force &&
        existingReport?.executive_summary &&
        existingReport.executive_summary.trim().length > 10 &&
        !PLACEHOLDER_MARKERS.some(m => existingReport.executive_summary.includes(m));

    if (summaryAlreadyExists) {
        console.log('Summary already exists — skipping. Pass force=true to regenerate.');
        return;
    }

    // ── Fetch project config ─────────────────────────────────────────────────
    const { data: testRun } = await (supabase.from('test_runs') as any)
        .select('projects(id, user_id, llm_provider, encrypted_llm_key)')
        .eq('id', testRunId)
        .maybeSingle();

    const project = testRun?.projects;

    // ── Fetch sessions ───────────────────────────────────────────────────────
    const { data, error: sError } = await supabase
        .from('persona_sessions')
        .select('id, status, persona_configs(name, goal_prompt, tech_literacy), session_logs(emotion_tag, inner_monologue, action_taken, step_number, current_url)')
        .eq('test_run_id', testRunId);

    const sessions = data as any[];
    if (sError || !sessions?.length) {
        console.error('Failed to fetch sessions:', sError);
        return;
    }

    // ── Save raw logs to /tmp/specter/{userId}/{testRunId}.json ─────────────
    try {
        const userId = testRun?.projects?.user_id || 'unknown';
        const dir = path.join('/tmp', 'specter', userId);
        fs.mkdirSync(dir, { recursive: true });
        const output = {
            testRunId,
            userId,
            savedAt: new Date().toISOString(),
            sessions: sessions.map((session: any) => ({
                sessionId: session.id,
                personaName: session.persona_configs?.name || 'Unknown',
                goal: session.persona_configs?.goal_prompt || '',
                status: session.status,
                logs: (session.session_logs || [])
                    .sort((a: any, b: any) => a.step_number - b.step_number)
                    .map((log: any) => ({
                        step: log.step_number,
                        emotion: log.emotion_tag,
                        url: log.current_url,
                        monologue: log.inner_monologue || null,
                        uxFeedback: log.action_taken?.ux_feedback || null,
                        actionType: log.action_taken?.type || null,
                    }))
            }))
        };
        fs.writeFileSync(path.join(dir, `${testRunId}.json`), JSON.stringify(output, null, 2));
        console.log(`Logs saved → /tmp/specter/${userId}/${testRunId}.json`);
    } catch (err: any) {
        console.warn('Failed to save local logs:', err.message);
    }

    // ── Aggregate ────────────────────────────────────────────────────────────
    let totalScore = 0;
    let completedCount = 0;
    const sessionScores: number[] = [];
    // Initialize counters for ALL 9 emotions — not just the original 4
    const emotionStats: Record<string, number> = Object.fromEntries(ALL_EMOTIONS.map(e => [e, 0]));
    const allFeedback = new Set<string>();
    const qualitativeData: string[] = [];
    const knownEmotions = new Set<string>(ALL_EMOTIONS);

    for (const session of sessions) {
        if (session.status === 'completed') completedCount++;

        const personaName = session.persona_configs?.name || 'Unknown';
        const goal = session.persona_configs?.goal_prompt || '';
        const logs = (session.session_logs || []).sort((a: any, b: any) => a.step_number - b.step_number);

        const { mainScore } = calculateSessionScore({ ...session, persona: { tech_literacy: session.persona_configs?.tech_literacy } });
        totalScore += mainScore;
        sessionScores.push(mainScore);

        // Emotion stats — count every known emotion tag
        for (const log of logs) {
            const tag = (log.emotion_tag || 'neutral').toLowerCase();
            if (knownEmotions.has(tag)) {
                emotionStats[tag] = (emotionStats[tag] || 0) + 1;
            }
        }

        // Collect unique, meaningful UX feedback
        // ux_feedback in action_taken is only populated for autonomous-mode click actions;
        // for page_section logs (the majority) the feedback lives in inner_monologue.
        for (const log of logs) {
            const f = log.action_taken?.ux_feedback || log.inner_monologue;
            if (f && typeof f === 'string' && f.length > 10 && f !== 'undefined'
                && log.action_taken?.type !== 'system') {
                allFeedback.add(f.slice(0, 200));
            }
        }

        // Key logs for LLM context: first 2 + last 2 + all friction steps + up to 5 positive steps
        const keyLogIndices = new Set<number>();
        logs.forEach((_: any, i: number) => { if (i < 2 || i >= logs.length - 2) keyLogIndices.add(i); });
        logs.forEach((log: any, i: number) => {
            if (log.emotion_tag === 'frustration' || log.emotion_tag === 'confusion' || log.emotion_tag === 'disappointment') {
                keyLogIndices.add(i);
            }
        });
        // Also include positive moments so the synthesis sees a balanced picture
        let positiveCount = 0;
        logs.forEach((log: any, i: number) => {
            if (positiveCount < 5 && (log.emotion_tag === 'delight' || log.emotion_tag === 'satisfaction' || log.emotion_tag === 'curiosity')) {
                keyLogIndices.add(i);
                positiveCount++;
            }
        });

        qualitativeData.push(`\n### ${personaName} — ${session.status}\nGoal: ${goal}`);
        logs.filter((_: any, i: number) => keyLogIndices.has(i)).forEach((log: any) => {
            const uxNote = log.action_taken?.ux_feedback
                ? ` | ${String(log.action_taken.ux_feedback).slice(0, 120)}`
                : '';
            // Format: [PersonaName]S{step} so the LLM can reference steps by persona
            qualitativeData.push(`  [${personaName}]S${log.step_number}[${log.emotion_tag}] ${log.current_url}: ${String(log.inner_monologue || '').slice(0, 150)}${uxNote}`);
        });
    }

    const averageScore = sessions.length > 0 ? Math.round(totalScore / sessions.length) : 0;
    const funnelRate = sessions.length > 0 ? (completedCount / sessions.length) * 100 : 0;

    // ── AI synthesis ─────────────────────────────────────────────────────────
    // Uses text-only model (mini/flash) — no vision needed for report synthesis
    let aiSynthesis = `### Summary\n${sessions.length} personas tested. ${completedCount} completed. Score: **${averageScore}/100**, funnel: **${funnelRate.toFixed(1)}%**.\n\n*AI synthesis unavailable.*`;
    let actionItems: any[] = [];
    let feedbackSummary: string | null = null;

    // Report synthesis always uses Gemini (free, text-only) with the env key.
    // We never use the project's OpenRouter/custom key here — it may be a
    // vision-only budget key that fails on text-only synthesis endpoints.
    const geminiEnvKey = process.env.GEMINI_API_KEY;
    if (geminiEnvKey || project?.llm_provider === 'openai') {
        let apiKey: string | undefined = geminiEnvKey;
        const synthProvider: 'gemini' | 'openai' = project?.llm_provider === 'openai' ? 'openai' : 'gemini';

        // For OpenAI projects, fall back to their stored key if no Gemini env key
        if (synthProvider === 'openai' && !apiKey && project?.encrypted_llm_key) {
            try { apiKey = decrypt(project.encrypted_llm_key); } catch (_) { }
        }

        const llm = new LLMService({ provider: synthProvider, apiKey });

        // Main synthesis
        const synthesisPrompt = `You are a senior UX strategist. Your output will be rendered directly in a Markdown viewer.

CRITICAL: Your ENTIRE response must be valid Markdown. No plain prose paragraphs. Every sentence must be inside a Markdown structure (heading, bullet, bold, etc.). Never output a wall of unformatted text.

Stats: ${sessions.length} personas tested | ${funnelRate.toFixed(1)}% completion | Usability score: ${averageScore}/100

UX feedback collected:
${Array.from(allFeedback).map(f => `- ${f}`).join('\n')}

Session details:
${qualitativeData.join('\n')}

Output the following Markdown document EXACTLY — no deviations, no extra sections, no plain text outside these elements:

## Strategic UX Audit

[3–5 sentences as a normal paragraph here — this is the only place plain prose is allowed]

## What's Working

- [strength 1]
- [strength 2]
- [strength 3 if applicable]

## Key Friction Points

- **[issue title]** — [one-sentence description of impact]
- **[issue title]** — [one-sentence description of impact]

Be balanced and evidence-based. Credit genuine strengths. Focus on patterns that affected multiple steps, not isolated incidents. Only call something a problem if multiple personas experienced it.

Then output action items in EXACTLY this format (outside the markdown above):
[ACTION_ITEMS]
- (Priority: High/Medium/Low) | Fix: [title] | Detail: [specific recommendation] | Steps: PersonaName#3, OtherPersona#7
[/ACTION_ITEMS]
Max 5 items, ordered by user impact. Only flag High for issues causing task failure or repeated frustration. Omit Steps if no specific step applies.`;

        try {
            console.log(`Synthesizing report with ${synthProvider}...`);
            aiSynthesis = await llm.generateSummary(synthesisPrompt);
            console.log('Synthesis complete.');
        } catch (err: any) {
            console.error('Synthesis failed:', err?.message ?? err);
            aiSynthesis = `### Summary\n${sessions.length} personas tested. ${completedCount} completed. Score: **${averageScore}/100**, funnel: **${funnelRate.toFixed(1)}%**.\n\n*AI synthesis failed: ${err?.message ?? 'unknown error'}*`;
        }

        // Parse action items
        const actionMatch = aiSynthesis.match(/\[ACTION_ITEMS\]([\s\S]*?)\[\/ACTION_ITEMS\]/i);
        if (actionMatch) {
            actionItems = actionMatch[1].trim()
                .split('\n')
                .filter(l => l.trim().startsWith('-'))
                .map(item => {
                    const clean = item.replace(/^- /, '').trim();
                    const parts = clean.split('|').map(p => p.trim());
                    const stepsRaw = parts.find(p => /^Steps:/i.test(p));
                    const stepRefs: { personaName: string; stepNumber: number }[] = [];
                    if (stepsRaw) {
                        const refsStr = stepsRaw.replace(/^Steps:\s*/i, '');
                        refsStr.split(',').forEach(ref => {
                            const match = ref.trim().match(/^(.+?)#(\d+)$/);
                            if (match) {
                                stepRefs.push({ personaName: match[1].trim(), stepNumber: parseInt(match[2], 10) });
                            }
                        });
                    }
                    return {
                        priority: parts[0]?.replace(/^Priority:\s*/i, '') || 'Medium',
                        title: parts[1]?.replace(/^Fix:\s*/i, '') || 'Improve Flow',
                        detail: parts[2]?.replace(/^Detail:\s*/i, '') || clean,
                        stepRefs: stepRefs.length > 0 ? stepRefs : undefined,
                    };
                })
                .slice(0, 5);
        }

        // Strip action items block from display text
        aiSynthesis = aiSynthesis
            .replace(/\[ACTION_ITEMS\][\s\S]*?\[\/ACTION_ITEMS\]/gi, '')
            .replace(/^#+\s*STRATEGIC\s*(UX\s*)?(AUDIT|SUMMARY)\s*\n+/i, '')
            .trim();

        // Feedback summary (brief characterization — reuse the same cheap model)
        if (allFeedback.size > 0) {
            try {
                feedbackSummary = await llm.generateSummary(
                    `Summarize these UX feedback points in 2–3 concise professional sentences. Output plain text only — no markdown, no bullet points, no headings. Focus on recurring themes and overall sentiment:\n\n${Array.from(allFeedback).join('\n')}`
                );
                console.log('Feedback summary complete.');
            } catch (_) { }
        }
    }

    // ── Drop-off and technical audit ─────────────────────────────────────────
    const dropOffStats: Record<string, number> = {};
    const brokenLinksMap = new Map<string, string>();
    const slowPagesMap = new Map<string, number>();
    const frictionPoints: any[] = [];

    for (const session of sessions) {
        if (session.status !== 'completed') {
            const lastLog = (session.session_logs || [])
                .sort((a: any, b: any) => b.step_number - a.step_number)[0];
            if (lastLog?.current_url) {
                dropOffStats[lastLog.current_url] = (dropOffStats[lastLog.current_url] || 0) + 1;
            }
        }

        for (const log of session.session_logs || []) {
            const tech = log.action_taken?.technical_metrics;
            if (tech?.broken_links_count > 0 && log.current_url) {
                brokenLinksMap.set(log.current_url, `${tech.broken_links_count} broken link(s)`);
            }
            if (tech?.latency_ms > 3000) {
                const existing = slowPagesMap.get(log.current_url) || 0;
                slowPagesMap.set(log.current_url, Math.max(existing, tech.latency_ms));
            }
            if (log.action_taken?.heuristic_finding?.includes('Rage click')) {
                frictionPoints.push({ url: log.current_url, issue: log.action_taken.heuristic_finding });
            }
        }
    }

    // ── Persist report ───────────────────────────────────────────────────────
    const { error: rError } = await (supabase.from('reports') as any).upsert({
        test_run_id: testRunId,
        product_opportunity_score: averageScore,
        executive_summary: aiSynthesis,
        funnel_completion_rate: funnelRate,
        report_data: {
            emotionStats,
            sessionScores,
            actionItems,
            feedbackSummary,
            totalFeedbackPoints: allFeedback.size,
            dropOffStats,
            technicalAudit: {
                brokenLinks: [...brokenLinksMap.entries()].map(([url, error]) => ({ url, error })),
                slowPages: [...slowPagesMap.entries()].map(([url, latency]) => ({ url, latency })),
                frictionPoints
            }
        },
        heatmap_data_url: null,
        created_at: new Date().toISOString()
    }, { onConflict: 'test_run_id' });

    if (rError) {
        console.error('Error storing report:', rError);
        return;
    }

    // ── Finalize test run ────────────────────────────────────────────────────
    const wasManuallyStopped = sessions.some((s: any) => s.exit_reason === 'Manually stopped by user');
    await (supabase.from('test_runs') as any).update({
        status: wasManuallyStopped ? 'stopped' : 'completed',
        completed_at: new Date().toISOString()
    }).eq('id', testRunId);

    console.log(`Report stored for test run ${testRunId}`);
}

export async function checkAndFinalizeTestRun(testRunId: string) {
    const supabase = createAdminClient();
    const { data: sessions, error } = await supabase
        .from('persona_sessions')
        .select('id, status, created_at')
        .eq('test_run_id', testRunId);

    if (error || !sessions) {
        console.error('Error checking sessions:', error);
        return;
    }

    const STALE_THRESHOLD_MS = 15 * 60 * 1000;
    const now = Date.now();

    let hasStale = false;
    for (const session of sessions as any[]) {
        if (session.status === 'running' || session.status === 'queued') {
            const lastUpdate = new Date(session.updated_at || session.created_at).getTime();
            if (now - lastUpdate > STALE_THRESHOLD_MS) {
                console.warn(`Session ${session.id} stale — abandoning.`);
                await (supabase.from('persona_sessions') as any)
                    .update({ status: 'abandoned', exit_reason: 'Stale — auto abandoned' })
                    .eq('id', session.id);
                hasStale = true;
            }
        }
    }

    const { data: refreshed } = hasStale
        ? await supabase.from('persona_sessions').select('status').eq('test_run_id', testRunId)
        : { data: sessions };

    const active = (refreshed as any[]).filter(s => s.status === 'running' || s.status === 'queued');

    if (active.length === 0) {
        console.log(`All sessions done for ${testRunId}. Generating report...`);
        await generateAndStoreReport(testRunId);
    } else {
        console.log(`${active.length} session(s) still active for ${testRunId}.`);
    }
}