'use client';

import { useState } from 'react';
import {
    MousePointerClick, Type, ArrowDown, Clock,
    Navigation, CheckCircle2, XCircle, Quote,
    ChevronRight, ChevronDown, Sparkles
} from 'lucide-react';

interface StepFeedbackCardProps {
    step: {
        step_number: number;
        emotion_tag: 'neutral' | 'confusion' | 'frustration' | 'delight';
        inner_monologue: string;
        current_url: string;
        screenshot_url?: string;
        action_taken?: {
            type?: string;
            selector?: string;
            text?: string;
            ux_feedback?: string;
            proposed_solution?: string;
            specific_emotion?: string;
            possible_paths?: string[];
            emotional_intensity?: number;
        };
    };
    personaName?: string;
}

const EMOTION_CONFIG: Record<string, any> = {
    delight:        { label: 'Delight',        hex: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    satisfaction:   { label: 'Satisfaction',   hex: '#34d399', bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-200' },
    curiosity:      { label: 'Curiosity',      hex: '#818cf8', bg: 'bg-indigo-50',  text: 'text-indigo-500',  border: 'border-indigo-200' },
    surprise:       { label: 'Surprise',       hex: '#fbbf24', bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200' },
    neutral:        { label: 'Neutral',        hex: '#64748b', bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200' },
    confusion:      { label: 'Confusion',      hex: '#3b82f6', bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200' },
    boredom:        { label: 'Boredom',        hex: '#94a3b8', bg: 'bg-slate-50',   text: 'text-slate-400',   border: 'border-slate-200' },
    frustration:    { label: 'Frustration',    hex: '#ef4444', bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200' },
    disappointment: { label: 'Disappointment', hex: '#f87171', bg: 'bg-red-50',     text: 'text-red-500',     border: 'border-red-200' },
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
    click:    <MousePointerClick className="h-3 w-3" />,
    type:     <Type className="h-3 w-3" />,
    scroll:   <ArrowDown className="h-3 w-3" />,
    wait:     <Clock className="h-3 w-3" />,
    navigate: <Navigation className="h-3 w-3" />,
    complete: <CheckCircle2 className="h-3 w-3" />,
    fail:     <XCircle className="h-3 w-3" />,
};

export function StepFeedbackCard({ step, personaName }: StepFeedbackCardProps) {
    const [pathsOpen, setPathsOpen] = useState(false);
    const cfg        = EMOTION_CONFIG[step.emotion_tag] ?? EMOTION_CONFIG.neutral;
    const actionType = step.action_taken?.type ?? 'system';
    let uxFeedback   = step.action_taken?.ux_feedback as any;
    if (uxFeedback && typeof uxFeedback === 'object') {
        uxFeedback = uxFeedback.overall || uxFeedback.feedback || JSON.stringify(uxFeedback);
    }
    const hasFeedback  = uxFeedback && uxFeedback !== 'undefined' && String(uxFeedback).length > 5;
    const paths        = step.action_taken?.possible_paths ?? [];
    const hasScreenshot = !!step.screenshot_url;
    const stepKey      = personaName ? `${personaName}-${step.step_number}` : undefined;

    return (
        <div
            data-step-key={stepKey}
            className={`group/card rounded-xl border overflow-hidden transition-all duration-300 ${cfg.border} bg-white hover:shadow-sm data-[highlighted]:ring-2 data-[highlighted]:ring-indigo-400`}
        >
            {/* Emotion accent top bar */}
            <div className="h-0.5 w-full" style={{ background: cfg.hex }} />

            <div className={`flex flex-col ${hasScreenshot ? 'lg:flex-row' : ''}`}>

                {/* ── Screenshot panel ── */}
                {hasScreenshot && (
                    <div className="lg:w-[440px] flex-shrink-0 relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50">
                        {/* Step badge overlay */}
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                            <div
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shadow-md"
                                style={{ background: cfg.hex }}
                            >
                                {step.step_number}
                            </div>
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.label}
                            </span>
                        </div>

                        {/* Action type badge */}
                        <div className="absolute top-3 right-3 z-10">
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-medium text-slate-600 shadow-sm">
                                {ACTION_ICONS[actionType]}
                                <span className="capitalize">{actionType}</span>
                            </span>
                        </div>

                        {/* Screenshot */}
                        <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={step.screenshot_url}
                                alt={`Step ${step.step_number}`}
                                className="w-full object-cover object-top max-h-[280px] lg:max-h-none lg:h-full"
                                loading="lazy"
                            />
                        </div>

                        {/* URL footer */}
                        <div className="border-t border-slate-100 px-4 py-2.5 bg-white">
                            <a
                                href={step.current_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-1.5 hover:underline"
                            >
                                <Navigation className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                <p className="text-[10px] font-mono text-slate-400 truncate max-w-[320px]">{step.current_url}</p>
                            </a>
                        </div>
                    </div>
                )}

                {/* ── Feedback panel ── */}
                <div className="flex-1 p-6 space-y-5">

                    {/* Header — step info without screenshot */}
                    {!hasScreenshot && (
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white"
                                    style={{ background: cfg.hex }}
                                >
                                    {step.step_number}
                                </div>
                                <span className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                    {ACTION_ICONS[actionType]} <span className="capitalize">{actionType}</span>
                                </span>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                    {cfg.label}
                                </span>
                                {step.action_taken?.specific_emotion && (
                                    <span className="px-2 py-1 rounded-lg text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-200 italic">
                                        &ldquo;{step.action_taken.specific_emotion}&rdquo;
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Screenshot header row */}
                    {hasScreenshot && step.action_taken?.specific_emotion && (
                        <div className="pb-3 border-b border-slate-100">
                            <span className="text-xs text-slate-500 italic">
                                &ldquo;{step.action_taken.specific_emotion}&rdquo;
                            </span>
                        </div>
                    )}

                    {/* Inner monologue */}
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">What the user was thinking</p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                            {step.inner_monologue}
                        </p>
                    </div>

                    {/* UX Feedback */}
                    {hasFeedback && (
                        <div className={`rounded-xl border p-4 space-y-2 ${cfg.bg} ${cfg.border}`}>
                            <div className="flex items-center gap-2">
                                <Quote className="h-3.5 w-3.5 flex-shrink-0" style={{ color: cfg.hex }} />
                                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: cfg.hex }}>
                                    Feedback
                                </p>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed italic pl-3 border-l-2" style={{ borderColor: cfg.hex + '50' }}>
                                &ldquo;{uxFeedback}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* Proposed solution */}
                    {step.action_taken?.proposed_solution && (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-5 w-5 rounded-md bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                                    <Sparkles className="h-3 w-3 text-indigo-500" />
                                </div>
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-500">
                                    Suggested fix
                                </p>
                            </div>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed pl-3 border-l-2 border-indigo-200">
                                {step.action_taken.proposed_solution}
                            </p>
                        </div>
                    )}

                    {/* Details footer */}
                    {(step.action_taken?.selector || step.action_taken?.text) && (
                        <div className="flex items-center gap-4 pt-3 border-t border-slate-100 flex-wrap">
                            {step.action_taken?.selector && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Target</span>
                                    <code className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-indigo-600 font-mono">
                                        <MousePointerClick className="h-2.5 w-2.5" />
                                        <span className="max-w-[140px] truncate">{step.action_taken.selector}</span>
                                    </code>
                                </div>
                            )}
                            {step.action_taken?.text && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Typed</span>
                                    <code className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-amber-600 font-mono">
                                        {step.action_taken.text}
                                    </code>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation paths */}
                    {paths.length > 0 && (
                        <div className="pt-1">
                            <button
                                onClick={() => setPathsOpen(!pathsOpen)}
                                className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                {pathsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                {paths.length} navigation paths identified
                            </button>
                            {pathsOpen && (
                                <div className="mt-3 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    {paths.map((p, i) => (
                                        <span key={i} className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[10px] font-mono text-slate-500 hover:border-slate-300 transition-colors">
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
