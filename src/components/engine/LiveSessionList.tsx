'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Play, CheckCircle2, Clock, XCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import { SessionLogAccordion } from './SessionLogAccordion';

interface LiveSessionListProps {
    initialSessions: any[];
    testRunId: string;
}

export function LiveSessionList({ initialSessions, testRunId }: LiveSessionListProps) {
    const [sessions, setSessions] = useState(initialSessions);
    const [isMounted, setIsMounted] = useState(false);
    const supabase = createClient();

    useEffect(() => { setIsMounted(true); }, []);
    useEffect(() => { setSessions(initialSessions); }, [initialSessions]);

    useEffect(() => {
        const channel = supabase
            .channel(`test_run_sessions_${testRunId}`)
            .on('postgres_changes', {
                event: '*', schema: 'public',
                table: 'persona_sessions',
                filter: `test_run_id=eq.${testRunId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setSessions(prev => [...prev, payload.new]);
                } else if (payload.eventType === 'UPDATE') {
                    setSessions(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
                } else if (payload.eventType === 'DELETE') {
                    setSessions(prev => prev.filter(s => s.id !== payload.old.id));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [testRunId, supabase]);

    const statusConfig: Record<string, { label: string; classes: string; iconClass: string; Icon: any }> = {
        queued:    { label: 'Queued',    classes: 'bg-slate-50 border-slate-200 text-slate-500',    iconClass: 'text-slate-400',   Icon: Clock },
        running:   { label: 'Running',   classes: 'bg-blue-50 border-blue-200 text-blue-600',       iconClass: 'text-blue-500',    Icon: Activity },
        completed: { label: 'Completed', classes: 'bg-emerald-50 border-emerald-200 text-emerald-600', iconClass: 'text-emerald-500', Icon: CheckCircle2 },
        abandoned: { label: 'Abandoned', classes: 'bg-amber-50 border-amber-200 text-amber-600',    iconClass: 'text-amber-500',   Icon: XCircle },
        error:     { label: 'Error',     classes: 'bg-red-50 border-red-200 text-red-600',          iconClass: 'text-red-500',     Icon: XCircle },
    };

    return (
        <div className="grid gap-3">
            {sessions.map((session) => {
                const status = session.status || 'queued';
                const cfg    = statusConfig[status] || statusConfig.queued;
                const StatusIcon = cfg.Icon;

                return (
                    <div
                        key={session.id}
                        className="rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-200 hover:shadow-sm"
                    >
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.classes}`}>
                                    <User className={`h-4.5 w-4.5 ${cfg.iconClass}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {session.persona_configs?.name || 'Unnamed User'}
                                    </p>
                                    {session.persona_configs?.goal_prompt && (
                                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[420px]">
                                            Goal: {session.persona_configs.goal_prompt}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 flex-shrink-0">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${cfg.classes}`}>
                                    <StatusIcon className={`h-3.5 w-3.5 ${status === 'running' ? 'animate-pulse' : ''}`} />
                                    {cfg.label}
                                </div>
                                <Link
                                    href={`/sessions/${session.id}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                >
                                    <Play className="h-3 w-3" />
                                    View Session
                                </Link>
                            </div>
                        </div>

                        {/* Timing + exit reason */}
                        {(session.started_at || session.exit_reason) && (
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-slate-100">
                                {session.started_at && (
                                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Clock className="h-3 w-3" />
                                        Started {isMounted ? new Date(session.started_at).toLocaleTimeString() : '...'}
                                    </span>
                                )}
                                {session.completed_at && (
                                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                        Finished {isMounted ? new Date(session.completed_at).toLocaleTimeString() : '...'}
                                    </span>
                                )}
                                {session.exit_reason && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg border ${
                                        status === 'completed'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                            : 'bg-amber-50 text-amber-600 border-amber-200'
                                    }`}>
                                        {session.exit_reason.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </span>
                                )}
                                {session.execution_mode === 'manual' && status === 'running' && (
                                    <span className="text-xs text-amber-600 font-medium">
                                        ⚠ Waiting for manual approval
                                    </span>
                                )}
                            </div>
                        )}

                        <SessionLogAccordion sessionId={session.id} />
                    </div>
                );
            })}
        </div>
    );
}
