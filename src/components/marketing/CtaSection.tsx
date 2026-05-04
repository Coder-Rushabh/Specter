"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";

export default function CtaSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Colour blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(165,180,252,0.35) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.3) 0%, transparent 70%)' }} />
      <div className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full pointer-events-none z-0"
        style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.25) 0%, transparent 70%)' }} />

      <BackgroundBeamsWithCollision className="py-20 pb-28 bg-transparent">

        <div className="relative z-10 w-full max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-slate-200 shadow-2xl shadow-indigo-100/60 overflow-hidden"
            style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(248,249,255,0.95) 100%)", backdropFilter: "blur(12px)" }}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400" />

            <div className="px-10 md:px-12 py-14 md:py-16 text-center">

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-7"
              >
                <motion.span
                  animate={{ rotate: [0, 15, -10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Zap className="w-3.5 h-3.5 fill-indigo-500" />
                </motion.span>
                Free to start
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.15 }}
              >
                <h2 className="text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-slate-900 mb-5">
                  Know what breaks<br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500">
                    before anyone else does.
                  </span>
                </h2>
                <p className="text-slate-500 text-lg leading-relaxed max-w-md mx-auto">
                  Drop a URL. AI personas test it. You get a full report — friction points, emotions, fixes — in under 60 seconds.
                </p>
              </motion.div>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.28 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10"
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/dashboard"
                    className="relative inline-flex items-center gap-2 px-9 py-4 rounded-xl text-sm font-bold text-white overflow-hidden shadow-xl shadow-indigo-500/30 transition-shadow hover:shadow-indigo-500/50"
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

                <Link
                  href="/pricing"
                  className="text-slate-400 text-sm font-semibold hover:text-indigo-600 transition-colors px-5 py-4"
                >
                  View pricing →
                </Link>
              </motion.div>

            </div>
          </motion.div>
        </div>

      </BackgroundBeamsWithCollision>
    </section>
  );
}
