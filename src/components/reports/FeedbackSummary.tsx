'use client';

import { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    Tooltip,
} from 'recharts';
import { Sparkles, MousePointerClick } from 'lucide-react';

interface FeedbackLog {
    step_number: number;
    emotion_tag: string;
    inner_monologue: string;
    action_taken?: {
        ux_feedback?: string;
        emotional_intensity?: number;
    };
}

interface FeedbackSummaryProps {
    logs: FeedbackLog[];
    summary?: string;
    id?: string;
    personaName?: string;
}

const EMOTION_COLORS: Record<string, string> = {
    delight:        '#10b981',
    satisfaction:   '#34d399',
    curiosity:      '#818cf8',
    surprise:       '#fbbf24',
    neutral:        '#475569',
    confusion:      '#3b82f6',
    boredom:        '#94a3b8',
    frustration:    '#ef4444',
    disappointment: '#f87171',
};

import { EMOTION_WEIGHTS } from '@/lib/utils/scoring';

async function scrollToStep(personaName: string, stepNumber: number) {
    const key = `${personaName}-${stepNumber}`;
    if (!document.querySelector(`[data-step-key="${key}"]`)) {
        const toggleBtn = document.querySelector(`[data-audit-trail="${personaName}"]`) as HTMLElement | null;
        if (toggleBtn) {
            toggleBtn.click();
            await new Promise<void>(resolve => setTimeout(resolve, 350));
        }
    }
    const el = document.querySelector(`[data-step-key="${key}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.setAttribute('data-highlighted', 'true');
    setTimeout(() => el.removeAttribute('data-highlighted'), 2000);
}

/* Custom tooltip for area chart */
const HealthTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const health = payload[0]?.value;
    const emotion = payload[0]?.payload?.emotion;
    const color = health > 70 ? '#10b981' : health > 40 ? '#f59e0b' : '#ef4444';
    const emotionColor = EMOTION_COLORS[emotion] || '#94a3b8';
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
            <p className="text-slate-400">Step {label}</p>
            <p className="font-semibold" style={{ color }}>Health: {health}%</p>
            {emotion && (
                <p className="font-medium capitalize" style={{ color: emotionColor }}>{emotion}</p>
            )}
            <p className="text-slate-400 text-[10px]">Click to jump to this step</p>
        </div>
    );
};

/* Top feedback phrases */
function topPhrases(logs: FeedbackLog[], limit = 8): { phrase: string; count: number; tag: string }[] {
    const STOPWORDS = new Set([
        'the', 'a', 'an', 'is', 'it', 'of', 'to', 'and', 'in', 'on', 'for',
        'with', 'this', 'that', 'i', 'me', 'my', 'we', 'our', 'not', 'but',
        'be', 'are', 'was', 'have', 'has', 'from', 'at', 'by', 'do', 'does',
        'its', 'their', 'if', 'more', 'also', 'just', 'they', 'or', 'so',
        'can', 'there', 'what', 'about', 'he', 'she', 'which', 'all', 'very',
        'much', 'into', 'up', 'out', 'would', 'could', 'should', 'than', 'too',
        'site', 'page', 'website', 'button', 'click', 'way', 'like', 'find',
        'still', 'trying', 'really', 'don\'t', 'didn\'t', 'doesn\'t', 'i\'m',
        'it\'s', 'make', 'made', 'see', 'one', 'no', 'any',
    ]);
    const freq: Record<string, { count: number; tags: string[] }> = {};
    logs.forEach(log => {
        let text: any = log.action_taken?.ux_feedback || '';
        if (!text || text === 'undefined') return;
        if (typeof text === 'object') text = text.overall || text.feedback || JSON.stringify(text);
        if (typeof text !== 'string') return;
        const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
        for (let i = 0; i < words.length; i++) {
            const w = words[i];
            if (w.length < 4 || STOPWORDS.has(w)) continue;
            if (!freq[w]) freq[w] = { count: 0, tags: [] };
            freq[w].count++;
            if (!freq[w].tags.includes(log.emotion_tag)) freq[w].tags.push(log.emotion_tag);
        }
    });
    return Object.entries(freq)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, limit)
        .map(([phrase, data]) => ({
            phrase,
            count: data.count,
            tag: data.tags.includes('frustration') ? 'frustration'
                : data.tags.includes('confusion') ? 'confusion'
                : data.tags.includes('delight') ? 'delight' : 'neutral',
        }));
}

export function FeedbackSummary({ logs, summary, id, personaName }: FeedbackSummaryProps) {
    const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);

    const sentimentGroups = ['delight', 'satisfaction', 'curiosity', 'surprise', 'neutral', 'confusion', 'boredom', 'frustration', 'disappointment'];
    const radarData = sentimentGroups.map(emo => {
        const matchingLogs = logs.filter(l => l.emotion_tag === emo);
        const count = matchingLogs.length;
        const avgIntensity = count > 0
            ? matchingLogs.reduce((acc, l) => {
                const i = l.action_taken?.emotional_intensity;
                const intensity = typeof i === 'number' && !isNaN(i) ? i : 0.5;
                return acc + intensity;
            }, 0) / count
            : 0;
        return {
            subject: emo.charAt(0).toUpperCase() + emo.slice(1),
            A: Math.round(avgIntensity * 100 * (count > 0 ? 1 : 0)),
            fullMark: 100,
            emo,
            steps: matchingLogs.map(l => l.step_number).sort((a, b) => a - b),
        };
    });

    const activeEmotions = radarData.filter(d => d.A > 0);

    const selectedSteps = selectedEmotion
        ? logs.filter(l => l.emotion_tag === selectedEmotion).map(l => l.step_number).sort((a, b) => a - b)
        : [];

    let currentHealth = 100;
    const healthData = [...logs]
        .sort((a, b) => a.step_number - b.step_number)
        .map(l => {
            const w = EMOTION_WEIGHTS[l.emotion_tag];
            const weight = typeof w === 'number' ? w : 0;
            const i = l.action_taken?.emotional_intensity;
            const intensity = typeof i === 'number' && !isNaN(i) ? i : 0.5;
            const delta = weight * intensity;
            currentHealth = Math.max(0, Math.min(100, currentHealth + delta));
            return { step: l.step_number, health: Math.round(currentHealth), emotion: l.emotion_tag };
        });

    const worstHealth   = healthData.length > 0 ? Math.min(...healthData.map(d => d.health)) : 100;
    const currentLevel  = healthData[healthData.length - 1]?.health ?? 100;

    const feedbackQuotes = Array.from(
        new Set(
            logs
                .map(l => l.action_taken?.ux_feedback)
                .filter((f): f is string => !!f && f !== 'undefined' && f.length > 10)
        )
    ).slice(0, 12);

    return (
        <div className="space-y-5">

            {/* ── Sentiment Pulse ── */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Emotion breakdown</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        How strongly each emotion came through across this session. Larger spikes mean that emotion appeared more often. Click an emotion to see which steps triggered it.
                    </p>
                </div>

                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                            <PolarGrid stroke="rgba(148,163,184,0.25)" />
                            <PolarAngleAxis
                                dataKey="subject"
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                tickLine={false}
                            />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                            <Radar
                                name="Pulse"
                                dataKey="A"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fill="#6366f1"
                                fillOpacity={0.15}
                                dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {activeEmotions.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <MousePointerClick className="h-3 w-3" />
                            Click an emotion to see which steps
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {activeEmotions.map(({ emo, steps }) => {
                                const color = EMOTION_COLORS[emo] || '#94a3b8';
                                const isSelected = selectedEmotion === emo;
                                return (
                                    <button
                                        key={emo}
                                        onClick={() => setSelectedEmotion(isSelected ? null : emo)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all"
                                        style={{
                                            borderColor: isSelected ? color : color + '40',
                                            background:  isSelected ? color + '15' : color + '08',
                                            color:       isSelected ? color : '#64748b',
                                        }}
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                                        {emo}
                                        <span
                                            className="ml-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                                            style={{ background: color + '20', color }}
                                        >
                                            {steps.length}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {selectedEmotion && selectedSteps.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="text-[10px] text-slate-400 font-medium">Jump to:</span>
                                {selectedSteps.map(step => {
                                    const color = EMOTION_COLORS[selectedEmotion] || '#94a3b8';
                                    return (
                                        <button
                                            key={step}
                                            onClick={() => personaName && scrollToStep(personaName, step)}
                                            className="px-2.5 py-1 rounded-md border text-[10px] font-medium transition-all hover:scale-105"
                                            style={{
                                                borderColor: color + '40',
                                                background:  color + '10',
                                                color,
                                            }}
                                        >
                                            Step {step}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── UX Health Journey + Stats ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Experience over time</h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Starts at 100% and adjusts up or down with each step based on how the user felt. Drops show friction points. <span className="text-indigo-500 font-medium">Click any dot to jump to that step.</span>
                        </p>
                    </div>

                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={healthData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="healthColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                                <XAxis
                                    dataKey="step"
                                    tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                                    axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
                                    tickLine={false}
                                    label={{ value: 'Step', position: 'insideBottomRight', offset: -5, fill: '#94a3b8', fontSize: 9 }}
                                />
                                <YAxis
                                    domain={[0, 100]}
                                    tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<HealthTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="health"
                                    stroke="#6366f1"
                                    fillOpacity={1}
                                    fill="url(#healthColor)"
                                    strokeWidth={2}
                                    dot={(dotProps: any) => {
                                        const { cx, cy, payload } = dotProps;
                                        const h    = payload.health;
                                        const fill = h > 70 ? '#10b981' : h > 40 ? '#f59e0b' : '#ef4444';
                                        return (
                                            <circle
                                                key={`dot-${payload.step}`}
                                                cx={cx} cy={cy} r={5}
                                                fill={fill}
                                                stroke="#fff"
                                                strokeWidth={2}
                                                style={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (personaName) scrollToStep(personaName, payload.step);
                                                }}
                                            />
                                        );
                                    }}
                                    activeDot={(dotProps: any) => {
                                        const { cx, cy, payload } = dotProps;
                                        const h    = payload.health;
                                        const fill = h > 70 ? '#10b981' : h > 40 ? '#f59e0b' : '#ef4444';
                                        return (
                                            <circle
                                                key={`active-${payload.step}`}
                                                cx={cx} cy={cy} r={7}
                                                fill={fill}
                                                stroke="#fff"
                                                strokeWidth={2}
                                                style={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (personaName) scrollToStep(personaName, payload.step);
                                                }}
                                            />
                                        );
                                    }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stats */}
                <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-center space-y-5">
                    {[
                        {
                            label: 'Started at',
                            value: '100%',
                            color: '#6366f1',
                            sub: 'All sessions start at full health',
                        },
                        {
                            label: 'Ended at',
                            value: `${currentLevel}%`,
                            color: currentLevel > 70 ? '#10b981' : currentLevel > 40 ? '#f59e0b' : '#ef4444',
                            sub: 'Where the session ended',
                        },
                        {
                            label: 'Lowest point',
                            value: `${worstHealth}%`,
                            color: '#ef4444',
                            sub: 'The most friction the user felt',
                        },
                    ].map(({ label, value, color, sub }) => (
                        <div key={label} className="border-l-2 pl-4" style={{ borderColor: color + '60' }}>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-none">{label}</p>
                            <div className="flex items-baseline gap-2 mt-1.5">
                                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                                <p className="text-[10px] text-slate-400">{sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI summary */}
            {summary && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                            <Sparkles className="h-3 w-3 text-indigo-500" />
                        </div>
                        <h3 className="text-xs font-semibold text-indigo-600">AI observation</h3>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed italic pl-3 border-l-2 border-indigo-200">&ldquo;{summary}&rdquo;</p>
                </div>
            )}

            {/* UX Feedback quotes */}
            {feedbackQuotes.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">What the user said</h3>
                        <p className="text-xs text-slate-400 mt-0.5">All feedback observations from this session</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {feedbackQuotes.map((quote, i) => {
                            const matchedLog  = logs.find(l => l.action_taken?.ux_feedback === quote);
                            const emotion     = matchedLog?.emotion_tag || 'neutral';
                            const color       = EMOTION_COLORS[emotion];
                            return (
                                <div
                                    key={i}
                                    className="rounded-xl p-4 border text-sm italic text-slate-600 leading-relaxed"
                                    style={{ borderColor: color + '30', background: color + '06' }}
                                >
                                    <span style={{ color }} className="not-italic font-semibold mr-1">&ldquo;</span>
                                    {quote}
                                    <span style={{ color }} className="not-italic font-semibold ml-1">&rdquo;</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
