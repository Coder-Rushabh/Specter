'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@clerk/nextjs';
import {
    ChevronLeft,
    Terminal,
    History,
    ExternalLink,
    Target,
    Brain,
    User as UserIcon,
    Smile,
    Frown,
    Meh,
    Activity,
    BarChart3,
    Globe,
    Clock,
    CheckCircle2,
    XCircle,
    MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function SessionPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = params.sessionId as string;
    const [session, setSession] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [terminalLines, setTerminalLines] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const logsEndRef = useRef<HTMLDivElement>(null);
    const terminalEndRef = useRef<HTMLDivElement>(null);
    const { getToken } = useAuth();

    useEffect(() => {
        if (session?.status === 'completed') {
            const checkReport = async () => {
                const { data: run } = await supabase
                    .from('test_runs')
                    .select('status')
                    .eq('id', session.test_run_id)
                    .single();

                if (run?.status === 'completed') {
                    setTimeout(() => {
                        router.push(`/reports/${session.test_run_id}`);
                    }, 3000);
                }
            };
            checkReport();
        }
    }, [session?.status, session?.test_run_id, router, supabase]);

    useEffect(() => {
        async function fetchData() {
            const token = await getToken();
            const authenticatedSupabase = createClient(token || undefined);

            const [sessionRes, logsRes] = await Promise.all([
                authenticatedSupabase
                    .from('persona_sessions')
                    .select('*, persona_configs(*), test_runs(id, status, projects(name, target_url))')
                    .eq('id', sessionId)
                    .single(),

                authenticatedSupabase
                    .from('session_logs')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('step_number', { ascending: true })
            ]);

            const sessionData = sessionRes.data;
            const logData = logsRes.data;

            setSession(sessionData);
            setLogs(logData || []);

            const historyLines = (logData || []).map((log: any) => {
                const action = log.action_taken as any;
                if (action?.type === 'system') {
                    return `[SYS] ${(action.info || '').replace(/_/g, ' ').toUpperCase()}`;
                }
                const path = (() => { try { return new URL(log.current_url).pathname; } catch { return log.current_url || ''; } })();
                const raw = log.inner_monologue || '';
                const thought = raw ? ` — ${raw.length > 90 ? raw.slice(0, 90) + '...' : raw}` : '';
                return `[Step ${log.step_number}] ${(action?.type || 'action').toUpperCase()} ${path}${thought}`;
            }).filter(Boolean);
            if (sessionData?.live_status) historyLines.push(`[STATUS] ${sessionData.live_status}`);
            setTerminalLines(historyLines);

            setLoading(false);

            const sessionSub = authenticatedSupabase
                .channel(`session_${sessionId}`)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'persona_sessions',
                    filter: `id=eq.${sessionId}`
                }, (payload) => {
                    setSession((prev: any) => ({ ...prev, ...payload.new }));
                })
                .subscribe();

            const terminalSub = authenticatedSupabase
                .channel(`terminal_${sessionId}`)
                .on('broadcast', { event: 'log' }, (payload: any) => {
                    const message = payload.payload?.message;
                    if (message) {
                        setTerminalLines(prev => [...prev, `[LIVE] ${message}`]);
                    }
                })
                .subscribe();

            const logsSub = authenticatedSupabase
                .channel(`logs_${sessionId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'session_logs',
                    filter: `session_id=eq.${sessionId}`
                }, (payload) => {
                    setLogs((prev) => [...prev, payload.new]);
                    const log = payload.new as any;
                    const action = log.action_taken as any;
                    const path = (() => { try { return new URL(log.current_url).pathname; } catch { return log.current_url || ''; } })();
                    const raw2 = log.inner_monologue || '';
                    const thought = raw2 ? ` — ${raw2.length > 90 ? raw2.slice(0, 90) + '...' : raw2}` : '';
                    const line = action?.type === 'system'
                        ? `[SYS] ${(action.info || '').replace(/_/g, ' ').toUpperCase()}`
                        : `[Step ${log.step_number}] ${(action?.type || 'action').toUpperCase()} ${path}${thought}`;
                    setTerminalLines(prev => [...prev, line]);
                })
                .subscribe();

            return () => {
                authenticatedSupabase.removeChannel(sessionSub);
                authenticatedSupabase.removeChannel(terminalSub);
                authenticatedSupabase.removeChannel(logsSub);
            };
        }

        fetchData();
    }, [sessionId, getToken]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalLines]);

    const MAX_PAGES = 15;
    const MAX_ACTIONS_PAGE = 5;

    const pageMatch = session?.live_status?.match(/Page\s+(\d+)/i);
    const actionMatch = session?.live_status?.match(/Action\s+(\d+)\/(\d+)/i);
    const pagesVisited = pageMatch ? parseInt(pageMatch[1], 10) : 0;
    const currentPageAction = actionMatch ? parseInt(actionMatch[1], 10) : 0;

    const uniquePages = new Set(logs.map((l: any) => l.current_url).filter(Boolean)).size;
    const effectivePages = Math.max(pagesVisited, uniquePages);

    const stepsCompleted = logs.filter((l: any) => (l.action_taken as any)?.type !== 'system').length;

    const pageProgress = Math.min(effectivePages / MAX_PAGES, 1);
    const actionProgress = effectivePages > 0 ? currentPageAction / MAX_ACTIONS_PAGE : 0;
    const overallPct = session?.status === 'completed' ? 100
        : session?.status === 'error' ? Math.round(pageProgress * 100)
            : Math.min(Math.round((pageProgress * 0.7 + actionProgress * 0.3) * 100), 99);

    if (loading) return (
        <div className="flex items-center justify-center p-20 text-slate-400 text-sm">
            Loading session...
        </div>
    );

    const latestLog = logs[logs.length - 1];
    const latestScreenshotLog = [...logs].reverse().find((l: any) => l.screenshot_url) ?? null;
    const emotionIcons = {
        delight: <Smile className="h-4 w-4 text-emerald-500" />,
        frustration: <Frown className="h-4 w-4 text-amber-500" />,
        confusion: <Meh className="h-4 w-4 text-blue-500" />,
        neutral: <Activity className="h-4 w-4 text-slate-400" />,
    };

    const statusConfig: Record<string, { label: string; className: string; Icon: any }> = {
        queued: { label: 'Queued', className: 'text-slate-600 bg-slate-50 border-slate-200', Icon: Clock },
        running: { label: 'Running', className: 'text-blue-600 bg-blue-50 border-blue-200', Icon: Activity },
        completed: { label: 'Completed', className: 'text-emerald-600 bg-emerald-50 border-emerald-200', Icon: CheckCircle2 },
        abandoned: { label: 'Abandoned', className: 'text-amber-600 bg-amber-50 border-amber-200', Icon: XCircle },
        error: { label: 'Error', className: 'text-red-600 bg-red-50 border-red-200', Icon: XCircle },
    };
    const status = session?.status || 'queued';
    const cfg = statusConfig[status] || statusConfig.queued;
    const StatusIcon = cfg.Icon;

    return (
        <div className="animate-in fade-in space-y-5 duration-500 max-w-[1200px] mx-auto">

            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/test-runs/${session?.test_run_id}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-base font-semibold text-slate-900">{session?.persona_configs?.name}</h1>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cfg.className}`}>
                                <StatusIcon className={`h-3.5 w-3.5 ${status === 'running' ? 'animate-pulse' : ''}`} />
                                {cfg.label}
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">
                            Testing <span className="text-slate-700 font-medium">{session?.test_runs?.projects?.name}</span>
                        </p>
                        {session?.live_status && (
                            <p className="text-xs text-slate-400 mt-0.5">{session.live_status}</p>
                        )}
                    </div>
                </div>

                {session?.exit_reason && (
                    <span className={`text-xs font-medium px-3 py-1.5 rounded-lg border ${status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {session.exit_reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                )}
            </div>

            {/* ── Progress ── */}
            <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">Progress</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-400">
                            <span className="text-slate-700 font-semibold">{effectivePages}</span>/{MAX_PAGES} pages
                        </span>
                        <span className={`text-base font-bold tabular-nums ${session?.status === 'completed' ? 'text-emerald-600' :
                            session?.status === 'error' ? 'text-red-600' : 'text-indigo-600'
                            }`}>{overallPct}%</span>
                    </div>
                </div>

                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${session?.status === 'completed' ? 'bg-emerald-500' :
                            session?.status === 'error' ? 'bg-red-500' : 'bg-indigo-500'
                            }`}
                        style={{ width: `${overallPct}%` }}
                    />
                </div>

                <p className="text-xs text-slate-400">
                    {session?.status === 'completed'
                        ? `Completed — ${stepsCompleted} interactions across ${effectivePages} pages`
                        : session?.status === 'error'
                            ? 'Session ended with an error'
                            : effectivePages === 0
                                ? 'Starting up...'
                                : `On page ${effectivePages} of ${MAX_PAGES}`
                    }
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ── Left Column ── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Browser View */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-2.5">
                                <div className="flex gap-1.5">
                                    <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                </div>
                                <span className="text-xs text-slate-500">Browser View</span>
                            </div>
                            {latestLog?.current_url && (
                                <a
                                    href={latestLog.current_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-500 font-mono hover:text-slate-900 transition-all"
                                >
                                    <Globe className="h-3 w-3 text-indigo-500" />
                                    <span className="max-w-[300px] truncate">{latestLog.current_url}</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                            )}
                        </div>

                        <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden relative">
                            {latestScreenshotLog?.screenshot_url ? (
                                <img
                                    src={latestScreenshotLog.screenshot_url}
                                    alt="Browser View"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                                        <Globe className="h-5 w-5 text-indigo-400 animate-pulse" />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm font-medium text-slate-600">
                                            {session?.live_status || 'Waiting for first screenshot...'}
                                        </p>
                                        <p className="text-xs text-slate-400">The AI user is starting up</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {latestLog?.inner_monologue && (
                            <div className="p-4 border-t border-slate-100 bg-white">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-3.5 w-3.5 text-indigo-500" />
                                        <span className="text-xs font-medium text-slate-700">What the AI user is thinking</span>
                                    </div>
                                    {latestLog.emotion_tag && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200">
                                            {emotionIcons[latestLog.emotion_tag as keyof typeof emotionIcons] || emotionIcons.neutral}
                                            <span className="text-xs font-medium text-slate-600 capitalize">
                                                {latestLog.emotion_tag}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    &ldquo;{latestLog.inner_monologue}&rdquo;
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Persona Details */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">{session?.persona_configs?.name || 'AI Persona'}</h3>
                                <p className="text-xs text-slate-400">
                                    {[session?.persona_configs?.tech_literacy, session?.persona_configs?.age_range, session?.persona_configs?.geolocation]
                                        .filter(Boolean).join(' · ') || 'AI-simulated user'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="col-span-1 md:col-span-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <Target className="h-3.5 w-3.5 text-slate-400" />
                                    <p className="text-xs font-medium text-slate-500">Goal</p>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed pl-5 border-l-2 border-indigo-200">
                                    &ldquo;{session?.persona_configs?.goal_prompt}&rdquo;
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-slate-500">Tech skill level</p>
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 transition-all duration-1000 rounded-full" style={{ width: session?.persona_configs?.tech_literacy === 'high' ? '100%' : session?.persona_configs?.tech_literacy === 'medium' ? '60%' : '30%' }} />
                                        </div>
                                        <span className="text-xs text-slate-700 font-medium capitalize">{session?.persona_configs?.tech_literacy}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-3 border-y border-slate-100">
                                    <div className="space-y-0.5">
                                        <p className="text-xs text-slate-400">Age</p>
                                        <p className="text-sm text-slate-700 font-semibold">{session?.persona_configs?.age_range || '25-45'}</p>
                                    </div>
                                    <div className="h-6 w-px bg-slate-100" />
                                    <div className="space-y-0.5 text-right">
                                        <p className="text-xs text-slate-400">Location</p>
                                        <p className="text-sm text-slate-700 font-semibold">{session?.persona_configs?.geolocation || 'Global'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {session?.persona_configs?.domain_familiarity && (
                            <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5">
                                <Globe className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                <div className="space-y-0.5">
                                    <p className="text-xs font-medium text-slate-500">App familiarity</p>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        {session.persona_configs.domain_familiarity}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Right Column ── */}
                <div className="space-y-5">
                    {/* Step History */}
                    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden max-h-[600px]">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
                            <History className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Step History</span>
                            {logs.length > 0 && (
                                <span className="ml-auto text-xs text-slate-400">{logs.length} steps</span>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {logs.filter((log) => !(log.action_taken as any)?.info?.startsWith('scan_')).map((log) => {
                                const action = log.action_taken as any;
                                const isSystem = action?.type === 'system';

                                return (
                                    <div key={log.id} className="relative pl-5 pb-2 last:pb-0 border-l-2 border-slate-100">
                                        <div className={`absolute left-[-5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${isSystem ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-slate-600">Step {log.step_number}</span>
                                                    {isSystem ? (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium capitalize">
                                                            {action.info?.replace(/_/g, ' ')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 font-medium capitalize">
                                                            {action?.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</span>
                                            </div>

                                            {!isSystem && (
                                                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-2">
                                                    {log.inner_monologue && (
                                                        <p className="text-xs text-slate-600 leading-relaxed">
                                                            {log.inner_monologue}
                                                        </p>
                                                    )}

                                                    {action?.ux_feedback && (
                                                        <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <MessageSquare className="h-3 w-3 text-indigo-500" />
                                                                <span className="text-[10px] font-medium text-indigo-600">Feedback</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500">&ldquo;{action.ux_feedback}&rdquo;</p>
                                                        </div>
                                                    )}

                                                    {action?.possible_paths && Array.isArray(action.possible_paths) && action.possible_paths.length > 0 && (
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-medium text-slate-400">Options considered</span>
                                                            <div className="flex flex-wrap gap-1">
                                                                {action.possible_paths.map((path: any, idx: number) => (
                                                                    <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 font-mono">
                                                                        {typeof path === 'object'
                                                                            ? (path.path_name || path.description || JSON.stringify(path))
                                                                            : String(path)}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {action?.selector && (
                                                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                                            <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                                                                {action.selector}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {log.emotion_tag && (
                                                        <div className="flex items-center gap-1.5">
                                                            {emotionIcons[log.emotion_tag as keyof typeof emotionIcons] || emotionIcons.neutral}
                                                            <span className="text-[10px] font-medium text-slate-500 capitalize">
                                                                {log.emotion_tag}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {logs.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-sm text-slate-400">No steps recorded yet</p>
                                </div>
                            )}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Live Log Feed ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-slate-900 flex items-center justify-center">
                        <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-900">Live Log</h3>
                        <p className="text-xs text-slate-400">Real-time activity stream</p>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-emerald-400 space-y-1 h-40 overflow-y-auto custom-scrollbar">
                    {terminalLines.map((line, i) => (
                        <div key={i} className="leading-relaxed break-all animate-in fade-in duration-300">
                            {line}
                        </div>
                    ))}
                    {terminalLines.length === 0 && (
                        <p className="text-slate-500 animate-pulse">Waiting for activity...</p>
                    )}
                    <div ref={terminalEndRef} />
                </div>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.14); }
        @keyframes shimmer { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
        .animate-shimmer { animation: shimmer 1.8s ease-in-out infinite; }
      `}</style>
        </div>
    );
}
