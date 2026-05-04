"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  TrendingDown, FileText, Lightbulb, AlertTriangle,
  MousePointer2, Users, CheckCircle2, Activity,
} from "lucide-react";

function useCounter(to: number, inView: boolean, duration = 900, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * to));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [inView, to, duration, delay]);
  return val;
}

const EMOTIONS = [
  { label: "Delight", pct: 28, color: "#10b981" },
  { label: "Neutral", pct: 34, color: "#94a3b8" },
  { label: "Confusion", pct: 22, color: "#3b82f6" },
  { label: "Frustration", pct: 16, color: "#ef4444" },
];

const ACTION_ITEMS = [
  { priority: "High", color: "#ef4444", bg: "#fef2f2", border: "#fecaca", text: "Pricing CTA is unclear — 78% of users hesitated before clicking." },
  { priority: "Medium", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", text: "Sign-up form asks for phone number too early — causes drop-off." },
  { priority: "Low", color: "#10b981", bg: "#f0fdf4", border: "#a7f3d0", text: "Feature tab is not discoverable in the main nav for new users." },
];

const FEATURES = [
  { icon: Activity, color: "#6366f1", bg: "#eef2ff", title: "UX Health Score", body: "Every session produces a 0–100 UX score based on emotion signals and interaction patterns." },
  { icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", title: "Prioritised action items", body: "AI generates ranked fixes — High, Medium, Low — so you always know what to tackle first." },
  { icon: Lightbulb, color: "#f59e0b", bg: "#fffbeb", title: "Emotion breakdown", body: "See the exact split of delight, confusion, frustration, and neutrality across all persona sessions." },
  { icon: FileText, color: "#22c55e", bg: "#f0fdf4", title: "Shareable in one click", body: "Export or share the full report with your team instantly. No logins or dashboards to navigate." },
];

function ScoreRing({ score, inView }: { score: number; inView: boolean }) {
  const count = useCounter(score, inView, 1000, 300);
  const color = count >= 75 ? "#10b981" : count >= 50 ? "#f59e0b" : "#ef4444";
  const label = count >= 75 ? "Good" : count >= 50 ? "Needs work" : "Poor";
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#f1f5f9" strokeWidth="5" />
          <motion.circle
            cx="28" cy="28" r="24" fill="none"
            stroke={color} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 24}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
            animate={inView ? { strokeDashoffset: 2 * Math.PI * 24 * (1 - score / 100) } : {}}
            transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-black text-slate-900">{count}</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">UX Health Score</p>
        <p className="text-sm font-bold" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

export default function ReportInsightSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const problems = useCounter(9, inView, 800, 400);
  const personas = useCounter(5, inView, 700, 450);
  const steps = useCounter(143, inView, 900, 500);
  const moments = useCounter(23, inView, 800, 550);

  return (
    <section ref={ref} className="relative py-16 bg-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 80% 50%, rgba(99,102,241,0.05) 0%, transparent 60%)" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* LEFT — heading + feature cards */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55 }}
              className="mb-6"
            >

              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.08] mb-3">
                Reports that tell you<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-500">
                  exactly what to fix.
                </span>
              </h2>
              <p className="text-slate-500 text-base leading-relaxed max-w-lg">
                After each AI session, Specter generates a full report — UX score, emotion breakdown, and prioritised action items — in minutes.
              </p>
            </motion.div>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -16 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.45, delay: 0.1 + i * 0.1 }}
                className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: f.bg }}>
                  <f.icon className="w-4 h-4" style={{ color: f.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-0.5">{f.title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.body}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* RIGHT — real report mockup */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 overflow-hidden"
          >
            {/* Report header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <p className="text-[11px] text-slate-400 font-mono">yourapp.com · 5 personas · just now</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">Full UX Report</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-700">Completed</span>
              </div>
            </div>

            {/* UX Score + stat row */}
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <ScoreRing score={64} inView={inView} />
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { icon: AlertTriangle, label: "Problems", value: problems, color: "#ef4444" },
                  { icon: Users, label: "AI Users", value: personas, color: "#6366f1" },
                  { icon: MousePointer2, label: "Steps", value: steps, color: "#0ea5e9" },
                  { icon: Activity, label: "Friction", value: moments, color: "#f59e0b" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 px-2 py-2.5 text-center">
                    <s.icon className="w-3.5 h-3.5 mx-auto mb-1" style={{ color: s.color }} />
                    <p className="text-base font-black text-slate-900">{s.value}</p>
                    <p className="text-[10px] text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Emotion breakdown */}
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Emotion breakdown</p>
              <div className="space-y-2">
                {EMOTIONS.map((e, i) => (
                  <div key={e.label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-20 flex-shrink-0">{e.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: e.color }}
                        initial={{ width: 0 }}
                        animate={inView ? { width: `${e.pct}%` } : { width: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-8 text-right">{e.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action items */}
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Action items</p>
              <div className="space-y-2">
                {ACTION_ITEMS.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.35, delay: 0.7 + i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl border"
                    style={{ background: item.bg, borderColor: item.border }}
                  >
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ background: item.color, color: "white" }}>
                      {item.priority}
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
