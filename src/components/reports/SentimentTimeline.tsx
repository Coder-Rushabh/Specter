'use client';

import { useMemo } from 'react';

interface Step {
    step_number: number;
    emotion_tag: string;
    inner_monologue: string;
    action_taken?: {
        ux_feedback?: string;
        type?: string;
        emotional_intensity?: number;
    };
}

interface SentimentTimelineProps {
    steps: Step[];
    personaName: string;
}

const EMOTION_CONFIG: Record<string, any> = {
    delight: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Delight' },
    satisfaction: { color: '#34d399', bg: 'rgba(52,211,153,0.15)', label: 'Satisfaction' },
    curiosity: { color: '#818cf8', bg: 'rgba(129,140,248,0.15)', label: 'Curiosity' },
    surprise: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', label: 'Surprise' },
    neutral: { color: '#64748b', bg: 'rgba(100,116,139,0.10)', label: 'Neutral' },
    confusion: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: 'Confusion' },
    boredom: { color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', label: 'Boredom' },
    frustration: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Frustration' },
    disappointment: { color: '#f87171', bg: 'rgba(248,113,113,0.15)', label: 'Disappointment' },
};

export function SentimentTimeline({ steps, personaName }: SentimentTimelineProps) {
    const sorted = useMemo(() => [...steps].sort((a, b) => a.step_number - b.step_number), [steps]);


    return (
        <div className="space-y-4">

            {/* Timeline track */}
            <div className="relative">
                {/* Connecting line */}
                <div className="absolute top-4 left-4 right-4 h-px bg-white/5" />

                <div className="flex items-start gap-0 overflow-x-auto pb-10 scrollbar-none px-4">
                    {sorted.map((step, i) => {
                        const cfg = EMOTION_CONFIG[step.emotion_tag] || EMOTION_CONFIG.neutral;
                        const actionType = step.action_taken?.type || 'step';
                        let uxFeedback: any = step.action_taken?.ux_feedback;
                        if (uxFeedback && typeof uxFeedback === 'object') {
                            uxFeedback = uxFeedback.overall || uxFeedback.feedback || JSON.stringify(uxFeedback);
                        }

                        return (
                            <div key={`${step.step_number}-${i}`} className="group/step relative flex flex-col items-center min-w-[72px]">
                                {/* Node */}
                                <div
                                    className={`relative z-10 h-8 w-8 rounded-full border-2 flex items-center justify-center transition-transform group-hover/step:scale-125 cursor-pointer`}
                                    style={{ borderColor: cfg.color, background: cfg.bg }}
                                    title={`Step ${step.step_number}: ${cfg.label}`}
                                >
                                    <span className="text-[9px] font-black" style={{ color: cfg.color }}>
                                        {step.step_number}
                                    </span>
                                </div>


                                {/* Tooltip on hover — moved to TOP and SCOPED to step group */}
                                <div className="hidden group-hover/step:flex absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-[100] flex-col min-w-[260px] max-w-[300px] rounded-2xl border border-white/10 bg-slate-800 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] p-5 gap-3 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2 w-2 rounded-full flex-shrink-0"
                                            style={{ background: cfg.color }}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: cfg.color }}>
                                            {cfg.label} · {actionType}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-4">
                                        {step.inner_monologue}
                                    </p>
                                    {uxFeedback && (
                                        <p className="text-[10px] text-indigo-400 italic border-l-2 border-indigo-500/30 pl-2">
                                            &ldquo;{uxFeedback}&rdquo;
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 flex-wrap">
                {Object.entries(EMOTION_CONFIG).map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ background: cfg.color }} />
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{cfg.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
