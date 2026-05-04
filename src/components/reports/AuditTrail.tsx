'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ListChecks, Globe, ExternalLink } from 'lucide-react';
import { StepFeedbackCard } from './StepFeedbackCard';

interface AuditTrailProps {
  logs: any[];
  personaName: string;
}

const EMOTION_COLORS: Record<string, string> = {
  delight:        '#10b981',
  satisfaction:   '#34d399',
  curiosity:      '#818cf8',
  surprise:       '#fbbf24',
  neutral:        '#64748b',
  confusion:      '#3b82f6',
  boredom:        '#94a3b8',
  frustration:    '#ef4444',
  disappointment: '#f87171',
};

function resolveEmotionKey(emotionTag: string, specificEmotion?: string): string {
  if (emotionTag && emotionTag !== 'neutral') return emotionTag;
  const s = (specificEmotion || '').toLowerCase();
  if (s.includes('frustrat') || s.includes('angry') || s.includes('annoy')) return 'frustration';
  if (s.includes('disappoint') || s.includes('fail')) return 'disappointment';
  if (s.includes('confus') || s.includes('skeptic') || s.includes('uncertain') || s.includes('unsure')) return 'confusion';
  if (s.includes('bore') || s.includes('uninterest')) return 'boredom';
  if (s.includes('delight') || s.includes('excit') || s.includes('happy')) return 'delight';
  if (s.includes('satisf') || s.includes('pleased') || s.includes('content')) return 'satisfaction';
  if (s.includes('curio') || s.includes('intrigu') || s.includes('interest') || s.includes('engag')) return 'curiosity';
  if (s.includes('surpris') || s.includes('wow') || s.includes('amaz')) return 'surprise';
  return 'neutral';
}

interface PageGroup {
  url: string;
  pageIndex: number;
  overallEmotion: string;
  overallIntensity: number;
  pageSummary: string;
  friction: string[];
  positives: string[];
  sections: any[];
}

function groupByPage(logs: any[]): PageGroup[] {
  const pageMap = new Map<string, PageGroup>();
  const pageOrder: string[] = [];

  for (const log of logs) {
    const action = log.action_taken as any;
    if (action?.type === 'system') continue;
    const url = log.current_url || '';
    if (!pageMap.has(url)) {
      pageMap.set(url, {
        url,
        pageIndex: pageOrder.length + 1,
        overallEmotion: '',
        overallIntensity: 0,
        pageSummary: '',
        friction: [],
        positives: [],
        sections: [],
      });
      pageOrder.push(url);
    }
    const group = pageMap.get(url)!;
    group.sections.push(log);
    // Last section of the page carries page-level data
    if (action?.overall_emotion) {
      group.overallEmotion   = action.overall_emotion;
      group.overallIntensity = action.overall_intensity ?? 0;
      group.pageSummary      = action.page_summary || '';
      group.friction         = Array.isArray(action.friction_points) ? action.friction_points : [];
      group.positives        = Array.isArray(action.positives) ? action.positives : [];
    }
  }

  return pageOrder.map(url => pageMap.get(url)!);
}

function PageGroupRow({
  group,
  filterEmotion,
  personaName,
}: {
  group: PageGroup;
  filterEmotion: string;
  personaName: string;
}) {
  const [open, setOpen] = useState(false); // closed by default

  const sections = filterEmotion === 'all'
    ? group.sections
    : group.sections.filter(l => {
        const key = resolveEmotionKey(l.emotion_tag, l.action_taken?.specific_emotion);
        return key === filterEmotion;
      });

  // Auto-open when a filter is active and this group has matching sections
  useEffect(() => {
    if (filterEmotion !== 'all' && sections.length > 0) setOpen(true);
    if (filterEmotion === 'all') setOpen(false);
  }, [filterEmotion, sections.length]);

  if (sections.length === 0) return null;

  let pathname = group.url;
  try { pathname = new URL(group.url).pathname || '/'; } catch { /* keep full */ }

  const emotionKey   = resolveEmotionKey(group.overallEmotion);
  const emotionColor = EMOTION_COLORS[emotionKey] || '#64748b';

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      {/* Page header — div so the <a> link inside is valid HTML and doesn't trigger navigation */}
      <div
        role="button"
        tabIndex={0}
        data-page-group
        data-contains-steps={group.sections.map((l: any) => l.step_number).join(',')}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(v => !v); }}
        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer select-none"
      >
        <div className="h-6 w-6 rounded-md bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-500">
          {group.pageIndex}
        </div>
        <Globe className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-xs font-mono text-slate-600 truncate flex-1 min-w-0">
          {pathname}
        </span>

        <div className="flex items-center gap-2 flex-shrink-0">
          {group.overallEmotion && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize"
              style={{
                color:       emotionColor,
                borderColor: emotionColor + '40',
                background:  emotionColor + '12',
              }}
            >
              {group.overallEmotion}
              {group.overallIntensity > 0 && (
                <span className="ml-1 opacity-60 font-normal">
                  {Math.round(group.overallIntensity * 100)}%
                </span>
              )}
            </span>
          )}
          <span className="text-[10px] text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            {group.sections.length} {group.sections.length === 1 ? 'section' : 'sections'}
          </span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          }
        </div>
      </div>

      {/* Expanded page content */}
      {open && (
        <div className="bg-white divide-y divide-slate-100">

          {/* Page-level summary: emotion, friction, positives */}
          {(group.pageSummary || group.friction.length > 0 || group.positives.length > 0) && (
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                {group.pageSummary && (
                  <p className="text-xs text-slate-500 leading-relaxed italic flex-1">
                    {group.pageSummary}
                  </p>
                )}
                <a
                  href={group.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors flex-shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open page
                </a>
              </div>

              {(group.friction.length > 0 || group.positives.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.friction.length > 0 && (
                    <div className="rounded-lg border border-red-100 bg-red-50 p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-red-500">
                        Friction ({group.friction.length})
                      </p>
                      <ul className="space-y-1">
                        {group.friction.map((f, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                            <span className="text-red-400 mt-0.5 shrink-0">✗</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {group.positives.length > 0 && (
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
                        What&apos;s working ({group.positives.length})
                      </p>
                      <ul className="space-y-1">
                        {group.positives.map((p, i) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                            <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>{p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Per-section steps */}
          <div className="p-4 space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Sections ({sections.length})
            </p>
            {sections.map((log: any) => (
              <div key={log.id} className="pl-3 border-l-2 border-slate-100">
                <StepFeedbackCard step={log} personaName={personaName} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditTrail({ logs, personaName }: AuditTrailProps) {
  const [open, setOpen]     = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const pages = groupByPage(logs);

  const emotionKeys = Array.from(new Set(
    logs
      .filter(l => (l.action_taken as any)?.type !== 'system')
      .map(l => resolveEmotionKey(l.emotion_tag, l.action_taken?.specific_emotion))
      .filter(Boolean)
  ));

  const totalSteps = logs.filter(l => (l.action_taken as any)?.type !== 'system').length;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">

      {/* Header / toggle */}
      <button
        data-audit-trail={personaName}
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          <ListChecks className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Step-by-step breakdown</span>
          <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'} · {totalSteps} steps
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="bg-white">

          {/* Emotion filters */}
          {emotionKeys.length > 1 && (
            <div className="px-5 pt-4 pb-3 flex flex-wrap gap-2 border-b border-slate-100">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                  filter === 'all'
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                All <span className="ml-1 opacity-60">{totalSteps}</span>
              </button>

              {emotionKeys.map(emo => {
                const color    = EMOTION_COLORS[emo] || '#94a3b8';
                const count    = logs.filter(l => resolveEmotionKey(l.emotion_tag, l.action_taken?.specific_emotion) === emo).length;
                const isActive = filter === emo;
                return (
                  <button
                    key={emo}
                    onClick={() => setFilter(emo)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border capitalize transition-all"
                    style={{
                      borderColor: isActive ? color : color + '40',
                      background:  isActive ? color + '15' : color + '08',
                      color:       isActive ? color : '#64748b',
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    {emo}
                    <span className="opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Page groups */}
          <div className="p-5 space-y-3">
            {pages.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No steps recorded.</p>
            ) : (
              pages.map(group => (
                <PageGroupRow
                  key={group.url}
                  group={group}
                  filterEmotion={filter}
                  personaName={personaName}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
