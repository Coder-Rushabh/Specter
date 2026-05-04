'use client';

import { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';

interface PageFinding {
  url: string;
  emotion: string;
  intensity: number;
  friction: string[];
  positives: string[];
  summary: string;
}

interface PageFindingsProps {
  logs: any[];
  personaName: string;
}

const EMOTION_CONFIG: Record<string, { hex: string; bg: string; text: string; border: string }> = {
  delight:        { hex: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  satisfaction:   { hex: '#34d399', bg: 'bg-emerald-50', text: 'text-emerald-500', border: 'border-emerald-200' },
  curiosity:      { hex: '#818cf8', bg: 'bg-indigo-50',  text: 'text-indigo-500',  border: 'border-indigo-200' },
  surprise:       { hex: '#fbbf24', bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200' },
  neutral:        { hex: '#64748b', bg: 'bg-slate-50',   text: 'text-slate-500',   border: 'border-slate-200' },
  confusion:      { hex: '#3b82f6', bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-200' },
  boredom:        { hex: '#94a3b8', bg: 'bg-slate-50',   text: 'text-slate-400',   border: 'border-slate-200' },
  frustration:    { hex: '#ef4444', bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200' },
  disappointment: { hex: '#f87171', bg: 'bg-red-50',     text: 'text-red-500',     border: 'border-red-200' },
};

function emotionCfg(emotion: string) {
  const key = (emotion || '').toLowerCase();
  return EMOTION_CONFIG[key] ?? EMOTION_CONFIG.neutral;
}

export function PageFindings({ logs, personaName }: PageFindingsProps) {
  const [open, setOpen] = useState(false);

  // Extract per-page summaries from logs that have friction_points or positives
  const pages: PageFinding[] = [];
  const seenUrls = new Set<string>();

  for (const log of logs) {
    const action = log.action_taken as any;
    const hasFriction  = Array.isArray(action?.friction_points) && action.friction_points.length > 0;
    const hasPositives = Array.isArray(action?.positives) && action.positives.length > 0;
    if (!hasFriction && !hasPositives) continue;
    if (seenUrls.has(log.current_url)) continue;
    seenUrls.add(log.current_url);

    pages.push({
      url:       log.current_url,
      emotion:   action?.overall_emotion || '',
      intensity: action?.overall_intensity ?? 0,
      friction:  action?.friction_points  || [],
      positives: action?.positives        || [],
      summary:   action?.page_summary || log.inner_monologue || '',
    });
  }

  if (pages.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">

      {/* Header / toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          <Globe className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Page-by-page findings</span>
          <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="divide-y divide-slate-100">
          {pages.map((page, idx) => {
            let pathname = page.url;
            try { pathname = new URL(page.url).pathname || '/'; } catch { /* keep full url */ }

            const cfg = emotionCfg(page.emotion);
            const hasFriction  = page.friction.length > 0;
            const hasPositives = page.positives.length > 0;

            return (
              <div key={idx} className="p-5 space-y-4">
                {/* Page header */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-500">
                      {idx + 1}
                    </div>
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-slate-600 hover:text-indigo-600 hover:underline truncate max-w-[420px]"
                    >
                      {pathname}
                    </a>
                  </div>

                  {page.emotion && (
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      {page.emotion}
                      {page.intensity > 0 && (
                        <span className="ml-1 opacity-60 font-normal">
                          {Math.round(page.intensity * 100)}%
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {/* Page summary */}
                {page.summary && (
                  <p className="text-xs text-slate-500 leading-relaxed pl-8 italic">
                    {page.summary}
                  </p>
                )}

                {/* Friction & Positives */}
                <div className="pl-8 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hasFriction && (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500">
                        Friction ({page.friction.length})
                      </p>
                      <ul className="space-y-1">
                        {page.friction.map((f, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                            <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {hasPositives && (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
                        What&apos;s working ({page.positives.length})
                      </p>
                      <ul className="space-y-1">
                        {page.positives.map((p, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
