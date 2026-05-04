import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { BarChart3 } from 'lucide-react';
import { ReportsList } from '@/components/reports/ReportsList';

export default async function ReportsPage() {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = createAdminClient();

    const { data: reportsRaw } = await supabase
        .from('reports')
        .select(`
            id,
            score:product_opportunity_score,
            funnel_rate:funnel_completion_rate,
            created_at,
            test_run:test_runs!inner (
                id,
                status,
                completed_at,
                project:projects!inner (
                    name,
                    target_url,
                    user_id
                ),
                persona_sessions(count)
            )
        `)
        .eq('test_runs.projects.user_id', userId)
        .order('created_at', { ascending: false });

    const reports = (reportsRaw || []).map((r: any) => {
        const testRun = Array.isArray(r.test_run) ? r.test_run[0] : r.test_run;
        const project = Array.isArray(testRun?.project) ? testRun.project[0] : testRun?.project;
        const sessions = Array.isArray(testRun?.persona_sessions) ? testRun.persona_sessions : [testRun?.persona_sessions];
        const sessionCount = sessions?.[0]?.count || 0;
        const usabilityScore = Number(r.score || 0);

        return {
            id: testRun?.id || r.id,
            projectName: project?.name || 'Untitled Project',
            url: project?.target_url || '',
            completedAt: testRun?.completed_at
                ? new Date(testRun.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            usabilityScore,
            frictionLevel: usabilityScore >= 75 ? 'Low' : usabilityScore >= 50 ? 'Medium' : 'High',
            funnelRate: r.funnel_rate || 0,
            sessionCount,
        };
    });

    return (
        <div className="animate-in fade-in space-y-8 duration-500">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        UX test results for all your projects — scores, problems found, and AI recommendations.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-4 py-3 flex-shrink-0">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <div>
                        <p className="text-lg font-bold text-slate-900 leading-none">{reports.length}</p>
                        <p className="text-xs text-slate-400 mt-0.5">total reports</p>
                    </div>
                </div>
            </div>

            <ReportsList initialReports={reports} />
        </div>
    );
}
