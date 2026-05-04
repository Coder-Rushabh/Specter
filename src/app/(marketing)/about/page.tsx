"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Zap, Globe, Shield, Heart } from "lucide-react";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

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
const PILLARS = [
  { icon: Zap, title: "Fast feedback", body: "First results in minutes — no recruiting, no scheduling, no waiting.", accent: "#6366f1", bg: "#eef2ff" },
  { icon: Globe, title: "Runs anywhere", body: "Cloud via Gemini or local via Ollama. Your call, your infra.", accent: "#0ea5e9", bg: "#f0f9ff" },
  { icon: Shield, title: "Privacy first", body: "Run entirely on your own machine. Your data never leaves your hands.", accent: "#10b981", bg: "#f0fdf4" },
  { icon: Heart, title: "Built for builders", body: "Designed for developers and PMs who ship fast and need real answers.", accent: "#f59e0b", bg: "#fffbeb" },
];

const IS = [
  "A fast way to spot UX problems before users do",
  "AI personas that browse like real people",
  "Plain-English reports with ranked action items",
  "Runs in the cloud or on your own machine",
];

const ISNT = [
  "A replacement for talking to real users",
  "A load testing or performance tool",
  "An analytics or heatmap platform",
  "A black box — every step is visible",
];

/* ═══════════════════════════════════════════════════════════════════════ */
export default function AboutPage() {
  return (
    <div className="flex flex-col text-slate-900 overflow-hidden" style={{
      background: "linear-gradient(180deg, #fafbff 0%, #ffffff 40%, #f7f8ff 80%, #ffffff 100%)",
    }}>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative px-6 pt-36 pb-24 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.11) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold uppercase tracking-widest">
              <Zap className="w-3 h-3 fill-indigo-500" /> About Specter
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] text-slate-900"
          >
            Built to make<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500">
              testing honest.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="text-slate-500 text-lg leading-relaxed max-w-lg mx-auto"
          >
            Specter gives you AI personas that experience your product the way real users do — before you ship, before you guess.
          </motion.p>
        </div>
      </section>

      {/* ── WHY I BUILT THIS ──────────────────────────────────────────── */}
      <section className="px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

            {/* left: story */}
            <FadeUp>
              <div className="space-y-5">
                <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">The story</span>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-[1.1]">
                  Why Specter exists.
                </h2>
                <div className="space-y-4 text-slate-500 leading-relaxed text-base">
                  <p>
                    Most developers ship features and hope they work. Real user testing is slow, expensive, and hard to set up — so it usually gets skipped.
                  </p>
                  <p>
                    I built Specter to close that gap. Paste a URL, get AI personas browsing your product in minutes, thinking out loud, flagging every friction point.
                  </p>
                  <p>
                    No setup. No waiting. Just feedback you can actually act on.
                  </p>
                </div>
              </div>
            </FadeUp>

            {/* right: pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PILLARS.map((p, i) => (
                <FadeUp key={p.title} delay={0.08 * i}>
                  <motion.div
                    whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(99,102,241,0.1)" }}
                    transition={{ duration: 0.2 }}
                    className="p-5 rounded-2xl border border-slate-100 bg-white h-full"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: p.bg }}>
                      <p.icon className="w-4 h-4" style={{ color: p.accent }} />
                    </div>
                    <p className="text-sm font-black text-slate-900 mb-1">{p.title}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{p.body}</p>
                  </motion.div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BUILDER ───────────────────────────────────────────────────── */}
      <section className="px-6 py-16 border-y border-slate-100" style={{
        background: "linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)",
      }}>
        <div className="max-w-5xl mx-auto">
          <FadeUp className="mb-8">
            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Who built it</span>
          </FadeUp>

          <FadeUp delay={0.1}>
            <motion.div
              whileHover={{ boxShadow: "0 16px 48px rgba(99,102,241,0.1)" }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-slate-100 bg-white p-8 flex flex-col sm:flex-row gap-8 items-start"
            >
              {/* avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black select-none"
                  style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}>
                  R
                </div>
                <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Rushabh Dabhade</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Full Stack Developer · Bhusawal, India</p>
                </div>
                <div className="space-y-3 text-sm text-slate-500 leading-relaxed">
                  <p>
                    I build things across the stack — React, Node.js, Next.js, cloud infra. Specter started as a side project: I wanted a faster way to know if the thing I just built made sense to people who weren&apos;t me.
                  </p>
                  <p>
                    I&apos;m available for freelance work and always happy to talk about what you&apos;re building.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      href="https://github.com/Coder-Rushabh"
                      target="_blank"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    >
                      <GithubIcon className="w-4 h-4" />
                      GitHub
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link
                      href="https://www.linkedin.com/in/rushabh-dabhade/"
                      target="_blank"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                    >
                      <LinkedinIcon className="w-4 h-4" />
                      LinkedIn
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </FadeUp>
        </div>
      </section>

      {/* ── WHAT SPECTER IS / ISN'T ───────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="mb-12">
            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Clarity</span>
            <h2 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-[1.1]">
              What Specter is (and isn&apos;t).
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IS */}
            <FadeUp delay={0.08}>
              <div className="p-7 rounded-2xl border border-emerald-100 bg-white h-full"
                style={{ boxShadow: "0 4px 24px rgba(16,185,129,0.06)" }}>
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">What it is</p>
                </div>
                <ul className="space-y-4">
                  {IS.map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.08 * i }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-4 h-4 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-sm text-slate-600 leading-relaxed">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </FadeUp>

            {/* ISN'T */}
            <FadeUp delay={0.14}>
              <div className="p-7 rounded-2xl border border-slate-100 bg-white h-full">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">What it isn&apos;t</p>
                </div>
                <ul className="space-y-4">
                  {ISNT.map((item, i) => (
                    <motion.li
                      key={item}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.08 * i }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      </div>
                      <span className="text-sm text-slate-500 leading-relaxed">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
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
                  Want to try it?<br />

                </h2>
                <p className="text-slate-500 text-base leading-relaxed max-w-sm mx-auto">
                  Paste a URL and see what your users actually experience.
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
                    See pricing →
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
