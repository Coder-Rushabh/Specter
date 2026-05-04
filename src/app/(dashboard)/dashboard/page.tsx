import Link from 'next/link';
import { Plus, Zap, History, ArrowUpRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { LiveDashboardStats } from '@/components/engine/LiveDashboardStats';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createClient();

  const [projectsRes, runsRes, personasRes, recentRunsRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),

    supabase
      .from('test_runs')
      .select('*, projects!inner(*)', { count: 'exact', head: true })
      .eq('projects.user_id', userId),

    supabase
      .from('persona_sessions')
      .select('*, test_runs!inner(*, projects!inner(*))', { count: 'exact', head: true })
      .eq('test_runs.projects.user_id', userId),

    supabase
      .from('test_runs')
      .select(`
        id,
        status,
        created_at,
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
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const projectsCount = projectsRes.count;
  const runsCount = runsRes.count;
  const personasCount = personasRes.count;
  const recentRunsRaw = recentRunsRes.data;

  const recentRuns = (recentRunsRaw || []).map((run: any) => {
    const totalSessions = run.persona_sessions?.length || 0;
    const completedSessions = run.persona_sessions?.filter((s: any) => s.status === 'completed').length || 0;
    const status = run.status || 'unknown';

    return {
      id: run.id,
      name: run.projects?.name || run.projects?.target_url || 'Unnamed project',
      url: run.projects?.target_url || '',
      date: new Date(run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status,
      totalSessions,
      completedSessions,
    };
  });

  return (
    <div className="animate-in fade-in space-y-10 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Run AI-powered tests on your website to see how users experience it.
          </p>
        </div>
        <Link
          href="/projects/new/setup"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white transition-all active:scale-95 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Run New Test
        </Link>
      </div>

      {/* ── Stats ── */}
      <LiveDashboardStats
        initialStats={{
          projectsCount: projectsCount || 0,
          runsCount: runsCount || 0,
          personasCount: personasCount || 0,
        }}
        userId={userId}
      />

      {/* ── Recent Runs ── */}
      {recentRuns.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <History className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Recent Test Runs</h2>
            </div>
            <Link
              href="/test-runs"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {recentRuns.map((run) => {
              const isCompleted = run.status === 'completed';
              const isFailed = run.status === 'failed';
              const StatusIcon = isCompleted ? CheckCircle2 : isFailed ? XCircle : Clock;
              const statusColor = isCompleted ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : isFailed ? 'text-red-600 bg-red-50 border-red-200' : 'text-amber-600 bg-amber-50 border-amber-200';
              const statusLabel = isCompleted ? 'Completed' : isFailed ? 'Failed' : run.status.charAt(0).toUpperCase() + run.status.slice(1);

              return (
                <Link
                  key={run.id}
                  href={`/test-runs/${run.id}`}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 transition-all hover:border-indigo-200 hover:shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[360px]">
                        {run.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{run.date}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 sm:mt-0">
                    <p className="text-xs text-slate-400">
                      {run.completedSessions}/{run.totalSessions} users done
                    </p>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${statusColor}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusLabel}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Empty State ── */}
      {recentRuns.length === 0 && (
        <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <Zap className="h-6 w-6 text-indigo-500" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900">No test runs yet</h3>
            <p className="text-sm text-slate-500 max-w-[260px] mx-auto leading-relaxed">
              Create a project and run your first AI test to see results here.
            </p>
          </div>
          <Link
            href="/projects/new/setup"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Start your first test →
          </Link>
        </div>
      )}
    </div>
  );
}
