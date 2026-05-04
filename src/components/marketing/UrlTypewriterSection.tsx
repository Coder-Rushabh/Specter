'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, ArrowRight, Zap, Eye, Smartphone, MousePointer2, Users } from 'lucide-react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

const EXAMPLE_URLS = [
  'yourapp.com',
  'app.stripe.com',
  'notion.so/dashboard',
  'figma.com/files',
  'linear.app/team',
];

const PERSONAS = [
  { label: 'Power User, 28', icon: Zap, color: '#6366f1', bg: '#eef2ff', x: '-120px', y: '-32px' },
  { label: 'First-time visitor', icon: Eye, color: '#0ea5e9', bg: '#e0f2fe', x: '110px', y: '-48px' },
  { label: 'Mobile user', icon: Smartphone, color: '#8b5cf6', bg: '#f3e8ff', x: '-140px', y: '48px' },
  { label: 'Casual browser', icon: MousePointer2, color: '#ec4899', bg: '#fdf2f8', x: '130px', y: '44px' },
  { label: 'Enterprise buyer', icon: Users, color: '#f59e0b', bg: '#fffbeb', x: '-8px', y: '72px' },
];

export default function UrlTypewriterSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-15% 0px' });

  const [urlIndex, setUrlIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [blink, setBlink] = useState(true);
  const [showPersonas, setShowPersonas] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cur = EXAMPLE_URLS[urlIndex];
    if (!deleting && charIndex === cur.length) {
      setShowPersonas(true);
      const t = setTimeout(() => { setDeleting(true); setShowPersonas(false); }, 2000);
      return () => clearTimeout(t);
    }
    if (deleting && charIndex === 0) {
      setDeleting(false);
      setUrlIndex((i) => (i + 1) % EXAMPLE_URLS.length);
      return;
    }
    const speed = deleting ? 45 : 75;
    const t = setTimeout(() => setCharIndex((c) => c + (deleting ? -1 : 1)), speed);
    return () => clearTimeout(t);
  }, [charIndex, deleting, urlIndex]);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 520);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f0f4ff 0%, #fafbff 35%, #f5f0ff 65%, #eef6ff 100%)',
      }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #a5b4fc 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.2,
        }}
      />

      {/* Soft aurora blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(165,180,252,0.35) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.3) 0%, transparent 70%)' }} />
      <div className="absolute top-[30%] right-[15%] w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(196,181,253,0.25) 0%, transparent 70%)' }} />

      {/* Top + bottom edge fade to blend with neighbouring sections */}
      <div className="absolute inset-x-0 top-0 h-24 pointer-events-none bg-gradient-to-b from-white/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-t from-white/60 to-transparent" />

      <div className="relative z-10 max-w-3xl w-full px-6 flex flex-col items-center text-center gap-7">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col gap-1"
        >
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.0]">
            One URL.
          </h2>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.0] bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500">
            Multiple Personas.
          </h2>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base md:text-lg text-slate-500 max-w-xl leading-relaxed"
        >
          Paste your product URL and Specter spins up AI personas that browse, click, and break things — like real users would.
        </motion.p>

        {/* URL Input + Personas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative w-full max-w-xl mt-2"
        >


          {/* Input box */}
          <div
            className="relative flex items-center gap-3 bg-white border-2 rounded-2xl px-5 py-4 shadow-xl transition-all duration-300"
            style={{
              borderColor: showPersonas ? '#6366f1' : '#e2e8f0',
              boxShadow: showPersonas
                ? '0 0 0 4px rgba(99,102,241,0.12), 0 20px 40px rgba(99,102,241,0.1)'
                : '0 8px 30px rgba(0,0,0,0.06)',
            }}
          >
            <Globe className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <span className="flex-1 text-left font-mono text-base text-slate-400 select-none">
              https://
              <span className="text-slate-800 font-medium">
                {EXAMPLE_URLS[urlIndex].slice(0, charIndex)}
              </span>
              <span
                className="inline-block w-[2px] h-[0.9em] bg-indigo-500 align-middle ml-px"
                style={{ opacity: blink ? 1 : 0, transition: 'opacity 0.1s' }}
              />
            </span>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/dashboard')}
              className="relative flex-shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl overflow-hidden transition-colors"
            >
              {/* Shimmer */}
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'linear', repeatDelay: 1 }}
              />
              Analyze
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>


        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex items-center gap-0 mt-2"
        >
          {[
            { num: '01', label: 'Paste your URL' },
            { num: '02', label: 'AI personas are generated' },
            { num: '03', label: 'Read insights instantly' },
          ].map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -8 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.55 + i * 0.1 }}
              className="flex items-center"
            >
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-[11px] font-black text-indigo-400 tabular-nums">{step.num}</span>
                <span className="text-sm text-slate-500">{step.label}</span>
              </div>
              {i < 2 && (
                <div className="w-6 h-px bg-slate-200 flex-shrink-0" />
              )}
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
