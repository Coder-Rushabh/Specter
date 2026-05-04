import { createAdminClient } from './lib/supabase/admin';

async function checkLogs() {
    const supabase = createAdminClient();
    const sessionId = 'c8e46079-05d5-4554-b52e-fb578964d84a'; // I'll use grep to find the full ID or just run query

    const { data: session } = await (supabase.from('persona_sessions') as any)
        .select('id')
        .ilike('id', 'c8e46079%')
        .single();

    if (!session) {
        console.log('Session not found');
        return;
    }

    const { data: logs } = await (supabase.from('session_logs') as any)
        .select('*')
        .eq('session_id', session.id)
        .order('step_number', { ascending: true });

    console.log(`--- LOGS FOR SESSION ${session.id} ---`);
    logs?.forEach((log: any) => {
        const ux = log.action_taken?.ux_feedback || 'N/A';
        console.log(`[Step ${log.step_number}] [${log.emotion_tag}] ${log.inner_monologue}`);
        console.log(`   UX Feedback: ${ux}`);
        console.log('---');
    });
}

checkLogs().catch(console.error);
