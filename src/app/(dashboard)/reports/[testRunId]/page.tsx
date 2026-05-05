import { createAdminClient } from '@/lib/supabase/admin';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { calculateSessionScore } from '@/lib/utils/scoring';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, Brain, CheckCircle2,
  Frown, Meh, Smile, Sparkles, Users
} from 'lucide-react';
import { RefreshButton } from '@/components/reports/RefreshButton';
import { AuditTrail } from '@/components/reports/AuditTrail';
import { FeedbackSummary } from '@/components/reports/FeedbackSummary';
import { ActionItems } from '@/components/reports/ActionItems';
import { ReportActions } from '@/components/reports/ReportActions';
import { TechnicalAudit } from '@/components/reports/TechnicalAudit';
import { MetricTooltip } from '@/components/reports/MetricTooltip';
import { ScrollToTop } from '@/components/reports/ScrollToTop';

export default async function ReportPage({ params }: { params: Promise<{ testRunId: string }> }) {
  const { testRunId } = await params;
  const { userId } = await auth().catch(() => ({ userId: null })) as { userId: string | null };

  const supabase = createAdminClient();

  const [runRes, reportRes, sessionsRes] = await Promise.all([
    userId
      ? supabase.from('test_runs').select(`*, projects!inner(*)`).eq('id', testRunId).eq('projects.user_id', userId).single()
      : supabase.from('test_runs').select(`*, projects(*)`).eq('id', testRunId).single(),
    supabase.from('reports').select('*').eq('test_run_id', testRunId).maybeSingle(),
    supabase.from('persona_sessions').select(`
      *,
      persona_configs(name, goal_prompt, tech_literacy),
      session_logs(id, step_number, emotion_tag, emotion_score, inner_monologue, current_url, screenshot_url, action_taken, created_at)
    `).eq('test_run_id', testRunId)
  ]);

  const run = runRes.data as any;
  const report = reportRes.data as any;
  const sessions = sessionsRes.data as any[] | null;

  if (runRes.error || !run) {
    if (userId) redirect('/reports');
    return <div className="flex items-center justify-center min-h-screen text-slate-500 text-sm">Report not found or access denied.</div>;
  }

  const totalLogs = sessions?.reduce((acc: number, s: any) => acc + (s.session_logs?.length || 0), 0) || 0;
  const reportData = (report as any)?.report_data || {};

  const emotionStats = reportData.emotionStats || { delight: 0, neutral: 0, confusion: 0, frustration: 0 };
  if (!reportData.emotionStats) {
    sessions?.forEach(s => {
      s.session_logs?.forEach((l: any) => {
        if (l.emotion_tag in emotionStats) emotionStats[l.emotion_tag as keyof typeof emotionStats]++;
      });
    });
  }

  const sessionScores = reportData.sessionScores || (sessions || []).map((s: any) => calculateSessionScore(s).mainScore);
  const totalFrictionEvents = (emotionStats.frustration || 0) + (emotionStats.confusion || 0);
  const uxScore = report?.product_opportunity_score || 0;
  const hasReport = !!report;
  const frictionLevel = !hasReport ? 'N/A' : uxScore >= 75 ? 'Low' : uxScore >= 50 ? 'Medium' : 'High';

  return (
    <div className="report-container animate-in fade-in duration-500 max-w-[1200px] mx-auto px-4 sm:px-6 md:px-8 pb-16 space-y-6 md:space-y-8">

      {/* ── Top bar ── */}
      <div className="pt-2 flex items-center justify-between">
        <Link href="/dashboard" className="no-print inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors">

        </Link>
        <div className="no-print">
          <ReportActions />
        </div>
      </div>

      {/* ── Header card ── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="p-5 md:p-7">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            {/* Left: identity */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-indigo-500" />
                </div>
                <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center ${run.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <a
                  href={run.projects?.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl md:text-2xl font-bold text-slate-900 hover:text-indigo-600 transition-colors break-all"
                >
                  {run.projects?.name}
                </a>
                <div className="mt-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${run.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    {run.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: UX score */}
            <div className="flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-6 py-4">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs font-medium text-slate-500">UX Score</p>
                <MetricTooltip text="A 0–100 score based on how positive vs negative your users felt across every page they visited. Above 75 is healthy, below 50 means users are struggling." direction="left" />
              </div>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-bold tracking-tight leading-none" style={{ color: uxScore >= 75 ? '#10b981' : uxScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                  {uxScore}
                </span>
                <span className="text-slate-400 font-medium text-xl mb-1">/100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Problems found',
            value: frictionLevel,
            color: frictionLevel === 'Low' ? '#10b981' : frictionLevel === 'Medium' ? '#f59e0b' : frictionLevel === 'N/A' ? '#64748b' : '#ef4444',
            bgClass: frictionLevel === 'Low' ? 'bg-emerald-50 border-emerald-100' : frictionLevel === 'Medium' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-200',
            isStatus: true,
            tip: 'Derived from your UX Score — Low means users felt mostly positive (75+), Medium means mixed (50–74), High means significant struggles (below 50).'
          },
          {
            label: 'AI users tested',
            value: sessions?.length || 0,
            color: '#6366f1',
            bgClass: 'bg-indigo-50 border-indigo-100',
            tip: 'The number of AI users that independently tested your website in this run.'
          },
          {
            label: 'Total steps',
            value: totalLogs,
            color: '#f59e0b',
            bgClass: 'bg-amber-50 border-amber-100',
            tip: 'Every page visit, click, and interaction recorded across all test sessions combined.'
          },
          {
            label: 'Problem moments',
            value: totalFrictionEvents,
            color: '#ef4444',
            bgClass: 'bg-red-50 border-red-100',
            tip: 'Total moments where a user felt confused or frustrated. Each step tagged with those emotions counts as one.'
          },
        ].map((stat, i) => (
          <div key={i} className={`relative rounded-xl border p-4 md:p-5 ${stat.bgClass}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <MetricTooltip text={stat.tip} />
            </div>
            <span className={`${stat.isStatus ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight leading-none`} style={{ color: stat.color }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── AI Analysis ── */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">AI Analysis</h2>
              <p className="text-xs text-slate-400">What your users actually experience — problems, wins, and what to fix first.</p>
            </div>
          </div>
          <div className="no-print flex-shrink-0 pt-0.5">
            <RefreshButton testRunId={testRunId} variant="regenerate-only" />
          </div>
        </div>

        {report?.executive_summary ? (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-5 md:px-8 py-6 prose prose-slate prose-sm md:prose-base max-w-none break-words
              prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-slate-900
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2
              prose-h3:text-sm prose-h3:text-indigo-600 prose-h3:mt-4 prose-h3:mb-1.5
              prose-p:text-slate-600 prose-p:leading-relaxed prose-p:my-2
              prose-li:text-slate-600 prose-li:marker:text-indigo-400 prose-ul:my-2 prose-ol:my-2
              prose-strong:text-slate-900 prose-strong:font-semibold
              prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
              prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:whitespace-pre-wrap
              prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-code:text-[85%] prose-code:font-normal">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.executive_summary.replace(/^#+\s*STRATEGIC\s*SUMMARY\s*\n+/i, '')}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 rounded-xl border border-dashed border-slate-300 bg-white">
            <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center animate-pulse">
              <Sparkles className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">Analysis in progress...</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">AI is reviewing session data to generate your insights. Refresh in a few moments.</p>
            </div>
          </div>
        )}

        <ActionItems items={reportData.actionItems || []} />
        <TechnicalAudit data={reportData.technicalAudit || null} />
      </div>

      {/* ── Results by User Type ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-7 space-y-6 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Results by user type</h2>
          <p className="text-xs text-slate-400 mt-0.5">Performance broken down by tech skill level.</p>
        </div>

        {['High', 'Medium', 'Low'].map((literacy) => {
          const literacySessions = (sessions || []).filter((s: any) =>
            s.persona_configs?.tech_literacy?.toLowerCase() === literacy.toLowerCase()
          );
          if (literacySessions.length === 0) return null;

          const groupScores = literacySessions.map(s => {
            const sIdx = sessions?.findIndex(ss => ss.id === s.id) ?? 0;
            return sessionScores[sIdx];
          });
          const avgScore = Math.round(groupScores.reduce((a, b) => a + b, 0) / groupScores.length);
          const scoreColor = avgScore >= 70 ? 'text-emerald-600' : avgScore >= 40 ? 'text-amber-600' : 'text-red-600';

          return (
            <div key={literacy} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`h-2 w-2 rounded-full ${literacy === 'High' ? 'bg-emerald-500' : literacy === 'Medium' ? 'bg-blue-500' : 'bg-red-500'}`} />
                  <h3 className="text-sm font-medium text-slate-600">{literacy} tech skill</h3>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-bold ${scoreColor}`}>{avgScore}<span className="text-xs text-slate-400 ml-0.5">/100</span></p>
                  <p className="text-xs text-slate-400">avg score</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {literacySessions.map((session: any) => {
                  const sIdx = sessions?.findIndex((s: any) => s.id === session.id) ?? 0;
                  const score = sessionScores[sIdx];
                  const scoreColor = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={session.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{session.persona_configs?.name}</p>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded mt-1 inline-block border ${session.status === 'completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                          {session.status}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-2xl font-bold" style={{ color: scoreColor }}>{score}</p>
                        <p className="text-xs text-slate-400">score</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Per-persona sections ── */}
      <div className="space-y-8">
        {sessions?.map((session: any) => {
          const scoreResult = calculateSessionScore({
            ...session,
            persona: { tech_literacy: session.persona_configs?.tech_literacy }
          });
          const score = scoreResult.mainScore;
          const logs = [...(session.session_logs || [])].sort((a: any, b: any) => a.step_number - b.step_number);
          const personaName = (session.persona_configs?.name ?? '').replace(/</g, '&lt;');
          const literacy = (session.persona_configs?.tech_literacy ?? '').replace(/</g, '&lt;');
          const goalPrompt = (session.persona_configs?.goal_prompt ?? '').replace(/</g, '&lt;');

          // Merge all 9 emotions into 4 display buckets so nothing is silently dropped.
          // Without grouping, steps tagged satisfaction/curiosity/surprise/boredom/disappointment
          // would show as 0% in every card even though they're counted in the score.
          const es = scoreResult.emotionScores;
          const grouped = {
            // Positive: any emotion the user enjoyed or found engaging
            delight: (es.delight || 0) + (es.satisfaction || 0) + (es.surprise || 0) + (es.curiosity || 0),
            // No reaction either way
            neutral: es.neutral || 0,
            // Mild–moderate friction: user was lost or disengaged
            confusion: (es.confusion || 0) + (es.boredom || 0),
            // Hard friction: user was blocked or let down
            frustration: (es.frustration || 0) + (es.disappointment || 0),
          };
          // Re-normalise to 100% (grouped values are already percentages but rounding can drift)
          const groupedTotal = Object.values(grouped).reduce((a, b) => a + b, 0) || 1;
          const groupedPct = {
            delight: Math.round((grouped.delight / groupedTotal) * 100),
            neutral: Math.round((grouped.neutral / groupedTotal) * 100),
            confusion: Math.round((grouped.confusion / groupedTotal) * 100),
            frustration: Math.round((grouped.frustration / groupedTotal) * 100),
          };

          return (
            <div key={session.id} className="space-y-4">
              {/* Persona header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{personaName}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{literacy} tech skill</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-slate-500">User score</p>
                      <MetricTooltip text="How smoothly this user completed their goal. Combines emotion distribution, number of friction events, and whether the session completed." />
                    </div>
                    <p className="text-3xl font-bold mt-0.5" style={{ color: score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444' }}>{score}<span className="text-sm text-slate-400">/100</span></p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-500">&ldquo;{goalPrompt}&rdquo;</p>

              {/* Emotion breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    key: 'delight' as const,
                    label: 'Positive',
                    sub: 'delight · satisfaction · curiosity · surprise',
                    icon: Smile, color: '#10b981', bgClass: 'bg-emerald-50 border-emerald-100',
                    tip: 'Steps where the user felt happy, satisfied, curious, or pleasantly surprised. Includes delight, satisfaction, curiosity, and surprise — all the emotions that keep users engaged.'
                  },
                  {
                    key: 'neutral' as const,
                    label: 'Neutral',
                    sub: 'no strong reaction',
                    icon: Meh, color: '#64748b', bgClass: 'bg-slate-50 border-slate-200',
                    tip: 'Steps with no strong reaction — the user got through without any notable feeling. High neutral is fine, but you want positive to be higher.'
                  },
                  {
                    key: 'confusion' as const,
                    label: 'Confusion',
                    sub: 'confusion · boredom',
                    icon: Activity, color: '#3b82f6', bgClass: 'bg-blue-50 border-blue-100',
                    tip: 'Steps where the user felt lost, unsure, or disengaged. Includes confusion (unclear design) and boredom (disengagement). These are mid-priority issues to fix.'
                  },
                  {
                    key: 'frustration' as const,
                    label: 'Frustration',
                    sub: 'frustration · disappointment',
                    icon: Frown, color: '#ef4444', bgClass: 'bg-red-50 border-red-100',
                    tip: 'Steps where the user felt blocked, annoyed, or let down. Includes frustration and disappointment — these are your highest-priority issues and the biggest drag on your UX score.'
                  },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl border p-4 ${s.bgClass}`}>
                    <div className="flex items-center justify-between mb-2">
                      <s.icon className="h-4 w-4" style={{ color: s.color }} />
                      <MetricTooltip text={s.tip} />
                    </div>
                    <p className="text-xl font-bold text-slate-900">{groupedPct[s.key]}%</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{s.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{s.sub}</p>
                  </div>
                ))}
              </div>

              <FeedbackSummary id={session.id} logs={logs} summary={undefined} personaName={session.persona_configs?.name} />
              <AuditTrail logs={logs} personaName={session.persona_configs?.name} />
            </div>
          );
        })}
      </div>

      <ScrollToTop />
    </div>
  );
}
