// One-time script: fetch all session logs from DB and write to /tmp/specter/{userId}/{testRunId}.json
// Usage: node scripts/export-logs.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { readFileSync } from 'fs';

// Load .env.local
const envPath = new URL('../.env.local', import.meta.url).pathname;
const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
        .split('\n')
        .filter(l => l.includes('=') && !l.startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: testRuns, error } = await supabase
    .from('test_runs')
    .select('id, projects(user_id)');

if (error) { console.error('Failed to fetch test runs:', error.message); process.exit(1); }

console.log(`Found ${testRuns.length} test runs`);

for (const run of testRuns) {
    const testRunId = run.id;
    const userId = run.projects?.user_id || 'unknown';

    const { data: sessions, error: sErr } = await supabase
        .from('persona_sessions')
        .select('id, status, persona_configs(name, goal_prompt), session_logs(step_number, emotion_tag, current_url, inner_monologue, action_taken, created_at)')
        .eq('test_run_id', testRunId);

    if (sErr || !sessions?.length) {
        console.warn(`  [${testRunId}] No sessions — skipping`);
        continue;
    }

    const output = {
        testRunId,
        userId,
        exportedAt: new Date().toISOString(),
        sessions: sessions.map(session => ({
            sessionId: session.id,
            personaName: session.persona_configs?.name || 'Unknown',
            goal: session.persona_configs?.goal_prompt || '',
            status: session.status,
            logs: (session.session_logs || [])
                .sort((a, b) => a.step_number - b.step_number)
                .map(log => ({
                    step: log.step_number,
                    emotion: log.emotion_tag,
                    url: log.current_url,
                    monologue: log.inner_monologue || null,
                    uxFeedback: log.action_taken?.ux_feedback || (log.action_taken?.type !== 'system' ? log.inner_monologue : null) || null,
                    actionType: log.action_taken?.type || null,
                    createdAt: log.created_at,
                }))
        }))
    };

    const dir = path.join('/tmp', 'specter', userId);
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${testRunId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    const totalLogs = sessions.reduce((n, s) => n + (s.session_logs?.length || 0), 0);
    console.log(`  Saved → ${filePath} (${sessions.length} sessions, ${totalLogs} logs)`);
}

console.log('\nDone.');
