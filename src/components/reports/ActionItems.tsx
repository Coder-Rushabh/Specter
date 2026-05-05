'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Zap, User } from 'lucide-react';

interface StepRef {
    personaName: string;
    stepNumber: number;
}

interface ActionItem {
    priority: string;
    title: string;
    detail: string;
    stepRefs?: StepRef[];
}

interface ActionItemsProps {
    items: ActionItem[];
}

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

export function ActionItems({ items }: ActionItemsProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (!items || items.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                    <Zap className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">What to fix</h2>
                    <p className="text-xs text-slate-400">Sorted by how much they affect the user experience.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {items.map((item, i) => {
                    const priority = item.priority.toLowerCase();
                    const isHigh   = priority.includes('high');
                    const isMedium = priority.includes('medium');

                    const accentColor = isHigh ? '#ef4444' : isMedium ? '#f59e0b' : '#10b981';
                    const chipClasses = isHigh
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : isMedium
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200';
                    const iconClasses = isHigh
                        ? 'bg-red-50 border-red-200 text-red-500'
                        : isMedium
                        ? 'bg-amber-50 border-amber-200 text-amber-500'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-500';
                    const refClasses = isHigh
                        ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
                        : isMedium
                        ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-500 hover:bg-emerald-100';

                    const Icon     = isHigh ? AlertCircle : isMedium ? Zap : CheckCircle2;
                    const hasRefs  = item.stepRefs && item.stepRefs.length > 0;
                    const isHovered = hoveredIndex === i;

                    return (
                        <div
                            key={i}
                            className="group relative rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm transition-all overflow-hidden"
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Left accent bar */}
                            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: accentColor }} />

                            <div className="pl-5 pr-5 py-4 flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center border ${iconClasses}`}>
                                        <Icon className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                                                {item.title}
                                            </h4>
                                            <span className={`flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${chipClasses}`}>
                                                {item.priority}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {item.detail}
                                        </p>
                                    </div>
                                </div>

                                {/* Step reference chips — visible on hover */}
                                {hasRefs && (
                                    <div className={`flex flex-wrap items-center gap-2 ml-11 transition-all duration-200 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                        <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                            <User className="h-2.5 w-2.5" />
                                            Seen at
                                        </span>
                                        {item.stepRefs!.map((ref, j) => (
                                            <button
                                                key={j}
                                                onClick={() => scrollToStep(ref.personaName, ref.stepNumber)}
                                                className={`px-2.5 py-1 rounded-full border text-[10px] font-medium transition-all cursor-pointer ${refClasses}`}
                                                title={`Jump to ${ref.personaName} · Step ${ref.stepNumber}`}
                                            >
                                                Step {ref.stepNumber}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
