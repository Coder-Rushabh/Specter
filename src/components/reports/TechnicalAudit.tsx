import React from 'react';
import { ShieldAlert, Zap, Link2Off, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TechnicalAuditProps {
    data: {
        brokenLinks: { url: string; error?: string }[];
        slowPages: { url: string; latency: number }[];
        frictionPoints: { url: string; issue: string }[];
    } | null;
}

export const TechnicalAudit: React.FC<TechnicalAuditProps> = ({ data }) => {
    if (!data) return null;

    const totalIssues = (data.brokenLinks?.length || 0) + (data.slowPages?.length || 0) + (data.frictionPoints?.length || 0);
    const healthScore = Math.max(0, 100 - (totalIssues * 5));
    const scoreColor  = healthScore >= 75 ? 'text-emerald-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600';
    const scoreBg     = healthScore >= 75 ? 'bg-emerald-50 border-emerald-100' : healthScore >= 50 ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100';

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Technical issues found</h2>
                    <p className="text-xs text-slate-400">Broken links, slow pages, and errors caught during the test.</p>
                </div>
            </div>

            {/* Stat row */}
            <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-xl border p-4 text-center ${scoreBg}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Usability score</p>
                    <div className="flex items-end justify-center gap-0.5">
                        <span className={`text-3xl font-bold tracking-tight leading-none ${scoreColor}`}>{healthScore}</span>
                        <span className="text-slate-400 font-medium text-sm mb-0.5">/100</span>
                    </div>
                </div>

                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Slow pages</p>
                    <div className="flex items-end justify-center gap-1">
                        <span className="text-3xl font-bold tracking-tight leading-none text-amber-600">{data.slowPages?.length || 0}</span>
                        <Zap className="h-3.5 w-3.5 text-amber-500 mb-0.5" />
                    </div>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Broken links</p>
                    <div className="flex items-end justify-center gap-1">
                        <span className="text-3xl font-bold tracking-tight leading-none text-red-600">{data.brokenLinks?.length || 0}</span>
                        <Link2Off className="h-3.5 w-3.5 text-red-500 mb-0.5" />
                    </div>
                </div>
            </div>

            {/* Slow pages detail */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-slate-600">Slow pages</span>
                </div>

                <div className="space-y-2">
                    {data.slowPages?.length > 0 ? data.slowPages.map((p, i) => {
                        if (!p) return null;
                        const isVerySlow = p.latency > 5000;
                        return (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-xs font-semibold text-slate-900">
                                            {isVerySlow ? 'Very slow page' : 'Slow page'}
                                        </p>
                                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${isVerySlow ? 'bg-red-50 border-red-200 text-red-600' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                                            {(p.latency / 1000).toFixed(1)}s to load
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{p.url}</p>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="flex items-center gap-2 py-2.5 px-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            <p className="text-xs text-emerald-700">All pages loaded within acceptable time</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Broken links detail */}
            {(data.brokenLinks?.length || 0) > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <Link2Off className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs font-semibold text-slate-600">Broken links</span>
                    </div>
                    <div className="space-y-2">
                        {data.brokenLinks.map((l, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-red-200">
                                <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-900">{l.error || 'Page not found (404)'}</p>
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{l.url}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
