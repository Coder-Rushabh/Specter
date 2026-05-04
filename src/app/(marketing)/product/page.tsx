"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
    ArrowRight, Globe, Users, Zap, FileText,
    MousePointer2, Brain, Activity, Shield,
} from "lucide-react";

/* ─── tiny helpers ────────────────────────────────────────────────────── */
function Tag({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold uppercase tracking-widest">
            {children}
        </span>
    );
}

function FadeUp({ children, delay = 0, className = "" }: {
    children: React.ReactNode; delay?: number; className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-8% 0px" });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ─── HOW IT WORKS steps ──────────────────────────────────────────────── */
const STEPS = [
    {
        n: "01",
        icon: Globe,
        title: "Paste your URL",
        body: "Drop any live URL — product page, sign-up flow, checkout. No SDK, no code changes.",
        accent: "#6366f1",
        bg: "#eef2ff",
    },
    {
        n: "02",
        icon: Users,
        title: "AI personas browse",
        body: "Unique personas with different goals and mental models explore your product in parallel.",
        accent: "#8b5cf6",
        bg: "#f5f3ff",
    },
    {
        n: "03",
        icon: Brain,
        title: "Thoughts are recorded",
        body: "Every click, hesitation, and emotion is logged — like reading your users' minds in real time.",
        accent: "#0ea5e9",
        bg: "#f0f9ff",
    },
    {
        n: "04",
        icon: FileText,
        title: "Report in few minutes",
        body: "UX health score, emotion breakdown, and ranked action items land instantly in your dashboard.",
        accent: "#10b981",
        bg: "#f0fdf4",
    },
];

/* ─── CAPABILITY cards ────────────────────────────────────────────────── */
const CAPS = [
    {
        icon: MousePointer2,
        label: "Friction detection",
        body: "Pinpoints exactly where users slow down, mis-click, or abandon — step by step.",
        accent: "#6366f1",
        bg: "#eef2ff",
        span: "md:col-span-1",
    },
    {
        icon: Activity,
        label: "UX health score",
        body: "Every session produces a 0–100 score based on emotion signals and interaction patterns.",
        accent: "#8b5cf6",
        bg: "#f5f3ff",
        span: "md:col-span-1",
    },
    {
        icon: Brain,
        label: "Emotion mapping",
        body: "See the split of delight, confusion, frustration, and neutrality across all sessions.",
        accent: "#0ea5e9",
        bg: "#f0f9ff",
        span: "md:col-span-1",
    },
    {
        icon: Shield,
        label: "Zero PII collected",
        body: "AI personas never enter real credentials or personal data. Your users stay anonymous.",
        accent: "#10b981",
        bg: "#f0fdf4",
        span: "md:col-span-1",
    },
];

/* ═══════════════════════════════════════════════════════════════════════ */
export default function ProductPage() {
    return (
        <div className="flex flex-col text-slate-900 overflow-hidden" style={{
            background: "linear-gradient(180deg, #fafbff 0%, #ffffff 40%, #f7f8ff 80%, #ffffff 100%)",
        }}>

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <section className="relative px-6 pt-36 pb-28 text-center overflow-hidden">
                {/* subtle grid */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }} />
                {/* glow */}
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />

                <div className="relative z-10 max-w-3xl mx-auto space-y-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <Tag><Zap className="w-3 h-3 fill-indigo-500" /> How Specter works</Tag>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] text-slate-900"
                    >
                        AI users that test<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500">
                            like real ones do.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.2 }}
                        className="text-slate-500 text-lg leading-relaxed max-w-xl mx-auto"
                    >
                        AI personas browse your product, surface friction points, and deliver a full report — before your real users ever encounter the problem.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex items-center justify-center gap-3 pt-2"
                    >
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                            <Link
                                href="/dashboard"
                                className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white overflow-hidden shadow-lg shadow-indigo-500/25 transition-shadow hover:shadow-indigo-500/40"
                                style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
                            >
                                <motion.span
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                                    initial={{ x: "-100%" }}
                                    animate={{ x: "200%" }}
                                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 2 }}
                                />
                                Try it free
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </motion.div>
                        <Link href="/pricing" className="text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors px-4 py-3.5">
                            See pricing →
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
            <section className="px-6 py-10">
                <div className="max-w-5xl mx-auto">
                    <FadeUp className="text-center mb-16">
                        <Tag>The flow</Tag>
                        <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.08]">
                            From URL to insights<br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-violet-500">in four steps.</span>
                        </h2>
                    </FadeUp>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {STEPS.map((step, i) => (
                            <FadeUp key={step.n} delay={0.08 * i}>
                                <motion.div
                                    whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(99,102,241,0.12)" }}
                                    transition={{ duration: 0.2 }}
                                    className="relative h-full p-6 rounded-2xl border border-slate-100 bg-white overflow-hidden"
                                >
                                    {/* step number watermark */}
                                    <span className="absolute top-3 right-4 text-6xl font-black text-slate-50 select-none leading-none">{step.n}</span>

                                    <div className="relative z-10 space-y-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: step.bg }}>
                                            <step.icon className="w-5 h-5" style={{ color: step.accent }} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 mb-1">{step.title}</p>
                                            <p className="text-sm text-slate-500 leading-relaxed">{step.body}</p>
                                        </div>
                                    </div>

                                    {/* bottom accent line */}
                                    <motion.div
                                        className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full"
                                        style={{ backgroundColor: step.accent }}
                                        whileHover={{ width: "100%" }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </motion.div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>



            {/* ── CAPABILITIES ─────────────────────────────────────────────── */}
            <section className="px-6 py-16">
                <div className="max-w-5xl mx-auto">
                    <FadeUp className="text-center mb-16">
                        <Tag>Capabilities</Tag>
                        <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.08]">
                            What Specter surfaces
                        </h2>
                        <p className="mt-3 text-slate-500 max-w-md mx-auto text-base">
                            Every test gives you a complete picture — not just where users go, but how they feel.
                        </p>
                    </FadeUp>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {CAPS.map((cap, i) => (
                            <FadeUp key={cap.label} delay={0.08 * i}>
                                <motion.div
                                    whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(99,102,241,0.1)" }}
                                    transition={{ duration: 0.2 }}
                                    className="flex gap-5 p-6 rounded-2xl border border-slate-100 bg-white h-full"
                                >
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cap.bg }}>
                                        <cap.icon className="w-5 h-5" style={{ color: cap.accent }} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900 mb-1">{cap.label}</p>
                                        <p className="text-sm text-slate-500 leading-relaxed">{cap.body}</p>
                                    </div>
                                </motion.div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── REPORT PREVIEW STRIP ─────────────────────────────────────── */}
            <section className="px-6 py-20 overflow-hidden" style={{
                background: "linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f172a 100%)",
            }}>
                <div className="max-w-5xl mx-auto">
                    <FadeUp className="text-center mb-12">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white/70 text-[11px] font-bold uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Sample output
                        </span>
                        <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight text-white leading-[1.08]">
                            Every test, a full report.
                        </h2>
                        <p className="mt-3 text-white/50 max-w-md mx-auto text-base">
                            UX score, emotion breakdown, and ranked action items — generated automatically.
                        </p>
                    </FadeUp>

                    {/* mini report card */}
                    <FadeUp delay={0.15}>
                        <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden shadow-2xl">
                            {/* header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
                                <div>
                                    <p className="text-[11px] text-white/40 font-mono">yourapp.com · AI personas · just now</p>
                                    <p className="text-sm font-bold text-white mt-0.5">Full UX Report</p>
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs font-semibold text-emerald-400">Completed</span>
                                </div>
                            </div>

                            <div className="px-5 py-5 grid grid-cols-3 gap-4">
                                {/* score */}
                                <div className="col-span-1 flex flex-col items-center justify-center gap-1 rounded-xl bg-white/5 border border-white/10 py-5">
                                    <p className="text-4xl font-black text-white">64</p>
                                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Needs work</p>
                                    <p className="text-[10px] text-white/30">UX Score</p>
                                </div>

                                {/* emotion bars */}
                                <div className="col-span-2 space-y-3 py-2">
                                    {[
                                        { label: "Delight", pct: 28, color: "#10b981" },
                                        { label: "Neutral", pct: 34, color: "#94a3b8" },
                                        { label: "Confusion", pct: 22, color: "#3b82f6" },
                                        { label: "Frustration", pct: 16, color: "#ef4444" },
                                    ].map((e, i) => (
                                        <div key={e.label} className="flex items-center gap-3">
                                            <span className="text-[11px] text-white/40 w-18 flex-shrink-0 w-[68px]">{e.label}</span>
                                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full rounded-full"
                                                    style={{ backgroundColor: e.color }}
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${e.pct}%` }}
                                                    viewport={{ once: true }}
                                                    transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                                                />
                                            </div>
                                            <span className="text-[11px] font-bold text-white/50 w-8 text-right">{e.pct}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* action item */}
                            <div className="px-5 pb-5">
                                <div className="flex items-start gap-3 p-3.5 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5" style={{ background: "#ef4444", color: "white" }}>High</span>
                                    <p className="text-xs text-white/60 leading-relaxed">Pricing CTA is unclear — 78% of users hesitated before clicking.</p>
                                </div>
                            </div>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="px-6 py-24">
                <div className="max-w-3xl mx-auto">
                    <FadeUp>
                        <div className="relative rounded-3xl border border-slate-200 overflow-hidden text-center px-10 py-16 shadow-xl shadow-indigo-100/50"
                            style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(248,249,255,0.97) 100%)" }}
                        >
                            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400 absolute top-0 left-0" />

                            {/* blobs */}
                            <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] rounded-full pointer-events-none"
                                style={{ background: "radial-gradient(circle, rgba(165,180,252,0.3) 0%, transparent 70%)" }} />
                            <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full pointer-events-none"
                                style={{ background: "radial-gradient(circle, rgba(125,211,252,0.25) 0%, transparent 70%)" }} />

                            <div className="relative z-10 space-y-5">
                                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.08] text-slate-900">
                                    Start testing now!

                                </h2>
                                <p className="text-slate-500 text-base leading-relaxed max-w-sm mx-auto">
                                    Paste a URL and let AI users do the work.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                        <Link
                                            href="/dashboard"
                                            className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white overflow-hidden shadow-lg shadow-indigo-500/25 transition-shadow hover:shadow-indigo-500/40"
                                            style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
                                        >
                                            <motion.span
                                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                                                initial={{ x: "-100%" }}
                                                animate={{ x: "200%" }}
                                                transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 2 }}
                                            />
                                            Start for free
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </motion.div>
                                    <Link href="/pricing" className="text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors px-4 py-3.5">
                                        View pricing →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </FadeUp>
                </div>
            </section>

        </div>
    );
}
