"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Zap, ChevronDown } from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────────────────── */
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

/* ─── data ────────────────────────────────────────────────────────────── */
const TIERS = [
    {
        name: "Free",
        price: "$0",
        per: "forever",
        desc: "Try Specter on a personal project. No card needed.",
        features: [
            "3 test runs",
            "Up to 3 AI personas",
            "Basic UX report",
            "24-hour report history",
        ],
        cta: "Start for free",
        href: "/dashboard",
        highlight: false,
    },
    {
        name: "Pro",
        price: "$49",
        per: "/ month",
        desc: "For teams who ship fast and want insights before users complain.",
        features: [
            "Unlimited test runs",
            "Up to 10 AI personas",
            "Full UX report + action items",
            "Unlimited report history",
            "PDF export",
            "Priority support",
        ],
        cta: "Get started",
        href: "/dashboard",
        highlight: true,
    },
    {
        name: "Teams",
        price: "$199",
        per: "/ month",
        desc: "Scale testing across your whole team with shared workspaces.",
        features: [
            "Unlimited personas & runs",
            "Shared team workspace",
            "Custom AI persona library",
            "Single sign-on (SSO)",
            "Dedicated support",
        ],
        cta: "Contact us",
        href: "/about",
        highlight: false,
    },
];

const TABLE_ROWS = [
    { feature: "Test runs", free: "3", pro: "Unlimited", teams: "Unlimited" },
    { feature: "AI personas per run", free: "Up to 3", pro: "Up to 10", teams: "Unlimited" },
    { feature: "Cloud testing", free: false, pro: true, teams: true },
    { feature: "Report history", free: "24 hours", pro: "Full", teams: "Full" },
    { feature: "PDF export", free: false, pro: true, teams: true },
    { feature: "Shared workspace", free: false, pro: false, teams: true },
    { feature: "SSO", free: false, pro: false, teams: true },
    { feature: "Priority support", free: false, pro: true, teams: true },
];

const FAQS = [
    { q: "Do I need a credit card to start?", a: "No. The Free plan requires no payment details — just sign up and start testing." },
    { q: "What is an AI persona?", a: "An AI persona is a simulated user with a unique goal and mental model. They browse your product, click around, and report every moment of confusion or delight." },
    { q: "Can I cancel anytime?", a: "Yes. No contracts, no lock-ins. Cancel or downgrade at any time from your account settings." },
    { q: "What happens to my reports if I cancel?", a: "Reports stay accessible for 30 days after cancellation so you can export anything you need." },
    { q: "How accurate are the AI personas?", a: "Personas are tuned to reflect real user archetypes — first-time visitors, power users, skeptics. They surface friction that real users consistently report." },
];

/* ─── FAQ item ────────────────────────────────────────────────────────── */
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
    const [open, setOpen] = useState(false);
    return (
        <FadeUp delay={0.05 * index}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full text-left py-5 border-b border-slate-100 last:border-0 group"
            >
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{q}</p>
                    <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </motion.div>
                </div>
                <AnimatePresence initial={false}>
                    {open && (
                        <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="text-sm text-slate-500 leading-relaxed mt-3 overflow-hidden"
                        >
                            {a}
                        </motion.p>
                    )}
                </AnimatePresence>
            </button>
        </FadeUp>
    );
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function PricingPage() {
    return (
        <div className="flex flex-col text-slate-900 overflow-hidden" style={{
            background: "linear-gradient(180deg, #fafbff 0%, #ffffff 40%, #f7f8ff 80%, #ffffff 100%)",
        }}>

            {/* ── HERO ──────────────────────────────────────────────────────── */}
            <section className="relative px-6 pt-36 pb-20 text-center overflow-hidden">
                <div className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }} />
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.11) 0%, transparent 70%)" }} />

                <div className="relative z-10 max-w-2xl mx-auto space-y-5">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                    >
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold uppercase tracking-widest">
                            <Zap className="w-3 h-3 fill-indigo-500" /> Transparent pricing
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] text-slate-900"
                    >
                        Simple plans.<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500">
                            No surprises.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: 0.2 }}
                        className="text-slate-500 text-lg leading-relaxed max-w-md mx-auto"
                    >
                        Start free. Upgrade when you need more. Cancel anytime.
                    </motion.p>
                </div>
            </section>

            {/* ── PRICING CARDS ─────────────────────────────────────────────── */}
            <section className="px-6 pb-20">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                        {TIERS.map((tier, i) => (
                            <FadeUp key={tier.name} delay={0.08 * i}>
                                {tier.highlight ? (
                                    /* ── PRO (highlighted) ── */
                                    <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/25">
                                        {/* top bar */}
                                        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400" />

                                        <div className="p-8 pt-7" style={{ background: "linear-gradient(145deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%)" }}>
                                            <div className="mb-7 space-y-2">
                                                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">{tier.name}</p>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-5xl font-black text-white">{tier.price}</span>
                                                    <span className="text-indigo-300 text-sm">{tier.per}</span>
                                                </div>
                                                <p className="text-indigo-100 text-sm leading-relaxed">{tier.desc}</p>
                                            </div>
                                            <ul className="mb-7 space-y-3">
                                                {tier.features.map((f) => (
                                                    <li key={f} className="flex items-center gap-3">
                                                        <div className="w-4.5 h-4.5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                                                        </div>
                                                        <span className="text-sm text-indigo-50">{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                                                <Link
                                                    href={tier.href}
                                                    className="relative flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-indigo-600 text-sm font-bold overflow-hidden transition-colors hover:bg-indigo-50"
                                                >
                                                    <motion.span
                                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-100/60 to-transparent -skew-x-12"
                                                        initial={{ x: "-100%" }}
                                                        animate={{ x: "200%" }}
                                                        transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 2 }}
                                                    />
                                                    {tier.cta}
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </Link>
                                            </motion.div>
                                        </div>
                                    </div>
                                ) : (
                                    /* ── FREE / TEAMS ── */
                                    <motion.div
                                        whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(99,102,241,0.1)" }}
                                        transition={{ duration: 0.2 }}
                                        className="p-8 rounded-2xl border border-slate-100 bg-white"
                                    >
                                        <div className="mb-7 space-y-2">
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{tier.name}</p>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-5xl font-black text-slate-900">{tier.price}</span>
                                                <span className="text-slate-400 text-sm">{tier.per}</span>
                                            </div>
                                            <p className="text-slate-500 text-sm leading-relaxed">{tier.desc}</p>
                                        </div>
                                        <ul className="mb-7 space-y-3">
                                            {tier.features.map((f) => (
                                                <li key={f} className="flex items-center gap-3">
                                                    <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                                        <Check className="w-2.5 h-2.5 text-indigo-500" strokeWidth={3} />
                                                    </div>
                                                    <span className="text-sm text-slate-600">{f}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link
                                            href={tier.href}
                                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-bold hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                                        >
                                            {tier.cta}
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </motion.div>
                                )}
                            </FadeUp>
                        ))}
                    </div>

                    <FadeUp delay={0.3}>
                        <p className="mt-6 text-center text-sm text-slate-400">
                            All plans include a 14-day free trial on paid features. No credit card required for Free.
                        </p>
                    </FadeUp>
                </div>
            </section>

            {/* ── COMPARISON TABLE ──────────────────────────────────────────── */}
            <section className="px-6 py-16 border-y border-slate-100" style={{
                background: "linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)",
            }}>
                <div className="max-w-4xl mx-auto">
                    <FadeUp className="text-center mb-10">
                        <h2 className="text-2xl font-black text-slate-900">What&apos;s included</h2>
                    </FadeUp>
                    <FadeUp delay={0.1}>
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        <th className="text-left py-4 px-5 font-medium text-slate-400 w-1/2">Feature</th>
                                        {["Free", "Pro", "Teams"].map((name) => (
                                            <th key={name} className={`py-4 px-4 text-center font-black text-sm ${name === "Pro" ? "text-indigo-600" : "text-slate-700"}`}>
                                                {name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {TABLE_ROWS.map(({ feature, free, pro, teams }, ri) => (
                                        <tr key={feature} className={`border-b border-slate-50 last:border-0 ${ri % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                                            <td className="py-3.5 px-5 text-slate-600 font-medium">{feature}</td>
                                            {[free, pro, teams].map((val, ci) => (
                                                <td key={ci} className="py-3.5 px-4 text-center">
                                                    {typeof val === "boolean" ? (
                                                        val
                                                            ? <Check className="w-4 h-4 text-emerald-500 mx-auto" strokeWidth={2.5} />
                                                            : <span className="text-slate-200 text-xl leading-none">—</span>
                                                    ) : (
                                                        <span className={`text-sm ${ci === 1 ? "font-bold text-indigo-600" : "text-slate-500"}`}>{val}</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </FadeUp>
                </div>
            </section>

            {/* ── FAQ ───────────────────────────────────────────────────────── */}
            <section className="px-6 py-24">
                <div className="max-w-2xl mx-auto">
                    <FadeUp className="text-center mb-10">
                        <h2 className="text-3xl font-black text-slate-900">Common questions</h2>
                    </FadeUp>
                    <div>
                        {FAQS.map((faq, i) => (
                            <FaqItem key={i} q={faq.q} a={faq.a} index={i} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── BOTTOM CTA ────────────────────────────────────────────────── */}
            <section className="px-6 pb-24">
                <div className="max-w-3xl mx-auto">
                    <FadeUp>
                        <div className="relative rounded-3xl border border-slate-200 overflow-hidden text-center px-10 py-16 shadow-xl shadow-indigo-100/50"
                            style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(248,249,255,0.97) 100%)" }}
                        >
                            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400 absolute top-0 left-0" />
                            <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] rounded-full pointer-events-none"
                                style={{ background: "radial-gradient(circle, rgba(165,180,252,0.3) 0%, transparent 70%)" }} />
                            <div className="absolute bottom-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full pointer-events-none"
                                style={{ background: "radial-gradient(circle, rgba(125,211,252,0.25) 0%, transparent 70%)" }} />
                            <div className="relative z-10 space-y-4">
                                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.08] text-slate-900">
                                    Still deciding?<br />
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500">
                                        Start free today.
                                    </span>
                                </h2>
                                <p className="text-slate-500 text-base leading-relaxed max-w-sm mx-auto">
                                    No credit card. No commitment. See real results in under 60 seconds.
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
                                    <Link href="/product" className="text-sm font-semibold text-slate-400 hover:text-indigo-600 transition-colors px-4 py-3.5">
                                        See how it works →
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
