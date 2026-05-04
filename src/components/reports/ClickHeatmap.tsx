'use client';

import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, TrendingDown, Minus } from 'lucide-react';

interface HeatmapStep {
    step_number: number;
    emotion_tag: 'neutral' | 'confusion' | 'frustration' | 'delight';
    action_taken?: {
        type?: string;
        selector?: string;
    };
    screenshot_url?: string;
    current_url: string;
}

interface PageGroup {
    url: string;
    steps: HeatmapStep[];
    screenshot?: string;
    frictionScore: number;
}

interface ClickHeatmapProps {
    steps: HeatmapStep[];
}

const EMOTION_HEAT: Record<string, string> = {
    frustration: 'rgba(239,68,68,0.75)',
    confusion: 'rgba(59,130,246,0.65)',
    delight: 'rgba(16,185,129,0.60)',
    neutral: 'rgba(100,116,139,0.35)',
};

const EMOTION_BORDER: Record<string, string> = {
    frustration: '#ef4444',
    confusion: '#3b82f6',
    delight: '#10b981',
    neutral: '#475569',
};

/** Stable pseudo-random position from a string seed */
function hashPos(seed: string, salt: number): { x: number; y: number } {
    let h = salt;
    for (let i = 0; i < seed.length; i++) {
        h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
    }
    const x = 10 + Math.abs((h * 2654435761) >>> 0) % 80;
    const y = 10 + Math.abs((h * 2246822519) >>> 0) % 80;
    return { x, y };
}

function PageHeatmapCard({ group }: { group: PageGroup }) {
    const [showScreenshot, setShowScreenshot] = useState(false);

    const frictionPercent = Math.min(100, group.frictionScore);
    const frictionLabel = frictionPercent === 0 ? 'No friction' : frictionPercent < 30 ? 'Low' : frictionPercent < 60 ? 'Medium' : 'High';
    const frictionColor = frictionPercent === 0 ? '#10b981' : frictionPercent < 30 ? '#f59e0b' : frictionPercent < 60 ? '#f97316' : '#ef4444';

    const actionSteps = group.steps.filter(s => s.action_taken?.type === 'click' || s.action_taken?.type === 'type');
    const hostname = (() => { try { return new URL(group.url).pathname || '/'; } catch { return group.url; } })();

    return (
        <div className="rounded-3xl border border-white/5 bg-[#0a0a0a] overflow-hidden">
            {/* Page header */}
            <div className="flex items-start justify-between gap-4 p-6 border-b border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <Globe className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{hostname}</p>
                        <p className="text-[9px] text-slate-600 font-mono truncate">{group.url}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Friction</p>
                        <p className="text-sm font-black" style={{ color: frictionColor }}>{frictionLabel}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Interactions</p>
                        <p className="text-sm font-black text-white">{group.steps.length}</p>
                    </div>
                </div>
            </div>

            {/* Heatmap visualization */}
            <div className="p-6 space-y-4">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/5">

                    {/* Screenshot background */}
                    {group.screenshot ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={group.screenshot}
                            alt={`Screenshot of ${group.url}`}
                            className="absolute inset-0 w-full h-full object-cover opacity-30"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-[9px] text-slate-700 uppercase tracking-widest font-bold">No screenshot</p>
                        </div>
                    )}

                    {/* Interaction dots */}
                    {actionSteps.map((step, i) => {
                        const pos = hashPos((step.action_taken?.selector || '') + step.step_number, i);
                        const color = EMOTION_HEAT[step.emotion_tag] || EMOTION_HEAT.neutral;
                        const borderColor = EMOTION_BORDER[step.emotion_tag] || EMOTION_BORDER.neutral;
                        const size = step.emotion_tag === 'frustration' ? 36 : step.emotion_tag === 'confusion' ? 30 : 24;

                        return (
                            <div
                                key={step.step_number}
                                className="absolute flex items-center justify-center rounded-full cursor-pointer group/dot"
                                style={{
                                    left: `${pos.x}%`,
                                    top: `${pos.y}%`,
                                    width: size,
                                    height: size,
                                    background: color,
                                    border: `1.5px solid ${borderColor}`,
                                    transform: 'translate(-50%, -50%)',
                                    boxShadow: `0 0 12px ${color}`,
                                }}
                                title={`Step ${step.step_number}: ${step.emotion_tag}`}
                            >
                                <span className="text-[8px] font-black text-white">{step.step_number}</span>

                                {/* Ripple for frustration */}
                                {step.emotion_tag === 'frustration' && (
                                    <span
                                        className="absolute inset-0 rounded-full animate-ping opacity-40"
                                        style={{ background: color }}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {/* Friction bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: frictionColor + '60' }}>
                        <div
                            className="h-full transition-all duration-1000"
                            style={{ width: `${frictionPercent}%`, background: frictionColor }}
                        />
                    </div>
                </div>

                {/* Emotion breakdown for this page */}
                <div className="flex gap-2 flex-wrap">
                    {(['frustration', 'confusion', 'delight', 'neutral'] as const).map(tag => {
                        const count = group.steps.filter(s => s.emotion_tag === tag).length;
                        if (!count) return null;
                        return (
                            <span
                                key={tag}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                                style={{ background: EMOTION_HEAT[tag], color: EMOTION_BORDER[tag] }}
                            >
                                {tag}: {count}
                            </span>
                        );
                    })}
                </div>

                {/* Screenshot toggle */}
                {group.screenshot && (
                    <div>
                        <button
                            onClick={() => setShowScreenshot(!showScreenshot)}
                            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-300 transition-colors"
                        >
                            {showScreenshot ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {showScreenshot ? 'Hide' : 'View'} Full Screenshot
                        </button>
                        {showScreenshot && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-white/5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={group.screenshot} alt="" className="w-full object-contain max-h-[500px]" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function ClickHeatmap({ steps }: ClickHeatmapProps) {
    // Group steps by URL
    const pageGroups = steps.reduce<Record<string, PageGroup>>((acc, step) => {
        const key = step.current_url;
        if (!acc[key]) {
            acc[key] = {
                url: key,
                steps: [],
                screenshot: step.screenshot_url,
                frictionScore: 0,
            };
        }
        acc[key].steps.push(step);

        // Use first available screenshot for this page
        if (!acc[key].screenshot && step.screenshot_url) {
            acc[key].screenshot = step.screenshot_url;
        }

        // Score friction
        if (step.emotion_tag === 'frustration') acc[key].frictionScore += 20;
        else if (step.emotion_tag === 'confusion') acc[key].frictionScore += 10;

        return acc;
    }, {});

    const groups = Object.values(pageGroups).sort((a, b) => b.frictionScore - a.frictionScore);

    if (groups.length === 0) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-700 text-xs uppercase tracking-widest font-bold">
                No interaction data available
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {groups.map((group) => (
                <PageHeatmapCard key={group.url} group={group} />
            ))}
        </div>
    );
}
