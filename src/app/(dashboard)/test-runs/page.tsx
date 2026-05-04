import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Zap, Plus } from 'lucide-react';
import { TestRunsList } from '@/components/test-runs/TestRunsList';

export default async function TestRunsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

    const { data: testRunsRaw } = await supabase
        .from('test_runs')
        .select(`
            id,
            status,
            created_at,
            started_at,
            completed_at,
            projects!inner (
                name,
                target_url,
                user_id
            ),
            persona_sessions (
                id,
                status
            )
        `)
        .eq('projects.user_id', userId)
        .order('created_at', { ascending: false });

    const testRuns = (testRunsRaw || []).map((run: any) => {
        const totalSessions = run.persona_sessions?.length || 0;
        const completedSessions = run.persona_sessions?.filter((s: any) => s.status === 'completed').length || 0;
        const status = run.status || 'pending';

        return {
            id: run.id,
            projectName: run.projects?.name || run.projects?.target_url || 'Untitled Project',
            url: run.projects?.target_url || '',
            status,
            date: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            totalSessions,
            completedSessions,
        };
    });

    return (
        <div className="animate-in fade-in space-y-8 duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Test Runs</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        All AI-powered tests run across your projects.
                    </p>
                </div>
                <Link
                    href="/projects/new/setup"
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-95 shadow-sm flex-shrink-0"
                >
                    <Plus className="h-4 w-4" />
                    New Test Run
                </Link>
            </div>

            {/* ── List ── */}
            <TestRunsList testRuns={testRuns} />
        </div>
    );
}
