import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, AlertCircle, BarChart3 } from 'lucide-react';
import { RerunButton } from '@/components/engine/RerunButton';
import { StopButton } from '@/components/engine/StopButton';
import { LiveSessionList } from '@/components/engine/LiveSessionList';

export default async function TestRunPage({ params }: { params: Promise<{ runId: string }> }) {
    const { runId } = await params;
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await createClient();

    const [runRes, sessionsRes] = await Promise.all([
        supabase
            .from('test_runs')
            .select(`*, projects(name, target_url, llm_provider)`)
            .eq('id', runId)
            .single(),
        supabase
            .from('persona_sessions')
            .select(`*, persona_configs(name, goal_prompt)`)
            .eq('test_run_id', runId)
            .order('created_at', { ascending: true })
    ]);

    const run = runRes.data as any;
    const sessions = sessionsRes.data as any[] | null;

    if (runRes.error || !run) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <AlertCircle className="h-10 w-10 text-red-400" />
                <h2 className="text-base font-semibold text-slate-900">Test run not found</h2>
                <Link href="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    const isCompleted = run.status === 'completed';
    const provider = run.projects?.llm_provider || 'Gemini';

    return (
        <div className="animate-in fade-in space-y-6 duration-500">

            {/* ── Breadcrumb ── */}
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
                <Link href="/dashboard" className="hover:text-slate-700 transition-colors">Dashboard</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href="/test-runs" className="hover:text-slate-700 transition-colors">Test Runs</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-slate-600 truncate max-w-[200px]">{run.projects?.name}</span>
            </div>

            {/* ── Header ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                        <h1 className="text-lg font-semibold text-slate-900 leading-snug">{run.projects?.name}</h1>
                        <a
                            href={run.projects?.target_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                        >
                            {run.projects?.target_url}
                        </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                        <StopButton runId={run.id} status={run.status} />
                        <RerunButton runId={run.id} />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                            <span className="text-xs font-medium text-slate-600">
                                AI Model: {provider}
                            </span>
                        </div>
                        {isCompleted && (
                            <Link
                                href={`/reports/${run.id}`}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-all shadow-sm"
                            >
                                <BarChart3 className="h-4 w-4" />
                                View Report
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Sessions ── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">AI User Sessions</h2>
                    <span className="text-xs text-slate-400">
                        {sessions?.length || 0} {sessions?.length === 1 ? 'user' : 'users'} ran
                    </span>
                </div>
                <LiveSessionList initialSessions={sessions || []} testRunId={run.id} />
            </div>
        </div>
    );
}
