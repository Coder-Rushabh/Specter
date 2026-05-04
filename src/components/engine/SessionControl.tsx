'use client';

import { useState } from 'react';
import { Play, Pause, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

interface SessionControlProps {
    sessionId: string;
    isPaused: boolean;
    status: string;
    liveStatus?: string;
    innerMonologue?: string;
    onStep?: () => void;
}

export function SessionControl({ sessionId, isPaused, status, liveStatus, innerMonologue, onStep }: SessionControlProps) {
    const [loading, setLoading] = useState(false);

    const handleNextStep = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/step`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to signal next step');
            onStep?.();
        } catch (err) {
            console.error(err);
            alert('Error advancing session. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const isRunning = status === 'running';
    const isFinished = ['completed', 'abandoned', 'error'].includes(status);

    return (
        <div className="flex flex-col gap-4 p-6 rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isRunning ? 'bg-blue-500 animate-pulse' : isFinished ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {isRunning ? 'Session Active' : isFinished ? 'Session Finished' : 'Session Inactive'}
                    </span>
                </div>
                {isPaused && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                        <Pause className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[9px] font-bold uppercase text-amber-500">Paused</span>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {isPaused ? (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-300 leading-relaxed font-medium">
                            The AI has predicted the next move. Review the monologue and click below to execute.
                        </p>
                        <button
                            onClick={handleNextStep}
                            disabled={loading}
                            className="w-full h-14 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    <Play className="h-5 w-5 fill-current" />
                                    Approve Next Step
                                </>
                            )}
                        </button>
                    </div>
                ) : isFinished ? (
                    <div className="flex flex-col items-center justify-center py-6 border border-white/10 rounded-2xl bg-white/[0.02] space-y-3">
                        <CheckCircle2 className={`h-6 w-6 ${status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`} />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-white">
                            {status === 'completed' ? 'Cohort Execution Success' : `Session ${status.charAt(0).toUpperCase() + status.slice(1)}`}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/5 rounded-2xl bg-white/[0.02] space-y-3">
                        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                        <div className="text-center px-4">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300 animate-pulse mb-1">
                                {liveStatus || (status === 'queued' ? 'Waiting in queue...' : 'AI is thinking...')}
                            </p>
                            {innerMonologue ? (
                                <p className="text-xs text-indigo-100/90 italic font-bold mt-2 border-t border-white/5 pt-2 max-w-[220px] text-center leading-relaxed">
                                    &ldquo;{innerMonologue}&rdquo;
                                </p>
                            ) : (
                                <p className="text-[9px] text-slate-600 font-medium">

                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>


        </div>
    );
}
