'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChevronDown, ChevronUp, Terminal, ShieldAlert, Zap, Activity } from 'lucide-react';

interface SessionLogAccordionProps {
    sessionId: string;
}

export function SessionLogAccordion({ sessionId }: SessionLogAccordionProps) {
    const [isOpen, setIsOpen]   = useState(false);
    const [logs, setLogs]       = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!isOpen) return;
        fetchLogs();

        const channel = supabase
            .channel(`accordion_logs_${sessionId}`)
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public',
                table: 'session_logs',
                filter: `session_id=eq.${sessionId}`
            }, (payload) => {
                setLogs(prev => {
                    if (prev.some(l => l.id === payload.new.id)) return prev;
                    return [...prev, payload.new].sort((a, b) => a.step_number - b.step_number);
                });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [isOpen, sessionId, supabase]);

    async function fetchLogs() {
        setLoading(true);
        const { data } = await supabase
            .from('session_logs')
            .select('*')
            .eq('session_id', sessionId)
            .order('step_number', { ascending: true });
        setLogs(data || []);
        setLoading(false);
    }

    const getIcon = (type: string) => {
        if (type === 'system') return <Terminal className="h-3 w-3 text-indigo-500" />;
        if (type === 'error')  return <ShieldAlert className="h-3 w-3 text-red-500" />;
        return <Zap className="h-3 w-3 text-slate-400" />;
    };

    return (
        <div className="mt-4 border-t border-slate-100 pt-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
            >
                {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {isOpen ? 'Hide' : 'Show'} step logs
            </button>

            {isOpen && (
                <div className="mt-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
                    {loading ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                            <Activity className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                            <span className="text-xs text-slate-400">Loading logs...</span>
                        </div>
                    ) : logs.length > 0 ? (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            {logs.filter((log) => !(log.action_taken as any)?.info?.startsWith('scan_')).map((log) => {
                                const actionType = ((log.action_taken as any)?.type || 'action').replace(/_/g, ' ');
                                const uxFeedback = (log.action_taken as any)?.ux_feedback;
                                const selector   = (log.action_taken as any)?.selector;
                                const paths      = (log.action_taken as any)?.possible_paths;

                                return (
                                    <div key={log.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {getIcon((log.action_taken as any)?.type || 'action')}
                                                <span className="text-xs font-semibold text-slate-700">
                                                    Step {log.step_number}
                                                </span>
                                                <span className="text-[10px] text-slate-400 capitalize">{actionType}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>

                                        {log.inner_monologue && (
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                {log.inner_monologue}
                                            </p>
                                        )}

                                        {uxFeedback && (
                                            <p className="text-xs text-indigo-600 italic border-l-2 border-indigo-200 pl-2 py-0.5 bg-indigo-50 rounded-r">
                                                &ldquo;{uxFeedback}&rdquo;
                                            </p>
                                        )}

                                        {selector && (
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 w-fit">
                                                <span className="text-[10px] font-semibold text-indigo-500">Target</span>
                                                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">{selector}</span>
                                            </div>
                                        )}

                                        {paths && paths.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {paths.map((p: string, i: number) => (
                                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-500 font-mono">
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-4">
                            No logs recorded for this session yet.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
