'use server';

import { auth } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { Orchestrator } from '@/lib/engine/orchestrator';
import { checkAndFinalizeTestRun } from '@/lib/engine/reporter';

export async function rerunTestRun(runId: string) {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const adminSupabase = createAdminClient();

    // 1. Fetch original test run and project
    const { data: originalRun, error: runError } = await (adminSupabase
        .from('test_runs') as any)
        .select(`
            *,
            projects (*)
        `)
        .eq('id', runId)
        .single();

    if (runError || !originalRun) {
        throw new Error('Original test run not found');
    }

    // 2. Fetch original persona sessions to get the configs used
    const { data: originalSessions, error: sessionError } = await (adminSupabase
        .from('persona_sessions') as any)
        .select(`
            *,
            persona_configs (*)
        `)
        .eq('test_run_id', runId);

    if (sessionError || !originalSessions || originalSessions.length === 0) {
        throw new Error('No personas found in the original run');
    }

    // 3. Create a new Test Run
    const { data: newRun, error: tError } = await (adminSupabase
        .from('test_runs') as any)
        .insert({
            project_id: originalRun.project_id,
            status: 'pending',
        })
        .select()
        .single();

    if (tError || !newRun) {
        console.error('Test run creation error:', tError);
        throw tError || new Error('Failed to create new test run');
    }

    // 4. Create new sessions using the exact same configs
    for (const s of originalSessions) {
        const { data: newSession, error: nsError } = await (adminSupabase
            .from('persona_sessions') as any)
            .insert({
                test_run_id: newRun.id,
                persona_config_id: s.persona_config_id,
                status: 'queued',
                execution_mode: s.execution_mode || 'autonomous'
            })
            .select()
            .single();

        if (nsError || !newSession) {
            console.error('Error creating new session:', nsError);
            continue;
        }

        // 5. Launch Orchestrator (Fire and forget - do NOT await here to avoid server action timeouts)
        const orchestrator = new Orchestrator();
        const personaProfile = {
            name: s.persona_configs.name,
            age_range: s.persona_configs.age_range,
            geolocation: s.persona_configs.geolocation,
            tech_literacy: s.persona_configs.tech_literacy,
            domain_familiarity: s.persona_configs.domain_familiarity,
            goal_prompt: s.persona_configs.goal_prompt,
        } as any;

        orchestrator.runSession(newSession.id, originalRun.projects.target_url, personaProfile).catch((err: any) => {
            console.error(`Rerun session ${newSession.id} failed:`, err);
        });
    }

    // 6. Delete Old Run Data (Clerical cleanup for reruns)
    const sessionIdsToDelete = originalSessions.map((s: any) => s.id);

    try {
        // Delete logs first (FK depends on session_id)
        await (adminSupabase.from('session_logs') as any)
            .delete()
            .in('session_id', sessionIdsToDelete);

        // Delete reports and persona sessions
        await Promise.all([
            (adminSupabase.from('reports') as any)
                .delete()
                .eq('test_run_id', runId),
            (adminSupabase.from('persona_sessions') as any)
                .delete()
                .eq('test_run_id', runId)
        ]);

        // Finally delete the Test Run itself
        await (adminSupabase.from('test_runs') as any)
            .delete()
            .eq('id', runId);

    } catch (err) {
        console.error('Failed to clean up old test run:', err);
        // Do not throw to avoid crashing the redirect for starting new sessions
    }

    redirect(`/test-runs/${newRun.id}`);
}

export async function stopTestRun(runId: string) {
    const { userId } = await auth();
    if (!userId) throw new Error('Unauthorized');

    const adminSupabase = createAdminClient();

    console.log(`Stopping test run ${runId}...`);

    // Update all non-finished sessions to abandoned
    const { error: sessionError } = await (adminSupabase
        .from('persona_sessions') as any)
        .update({
            status: 'abandoned',
            completed_at: new Date().toISOString(),
            exit_reason: 'Manually stopped by user'
        })
        .eq('test_run_id', runId)
        .in('status', ['queued', 'running']);

    if (sessionError) {
        console.error('Error stopping sessions:', sessionError);
        throw sessionError;
    }

    // Trigger report generation immediately
    await checkAndFinalizeTestRun(runId).catch(err => {
        console.error('Finalization after stop failed:', err);
    });

    return { success: true };
}
