'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

const TOTAL_FRAMES = 240;
const SECTION_VH = 500;

function frameSrc(i: number) {
  return `/frames/ezgif-frame-${String(i + 1).padStart(3, '0')}.jpg`;
}

/** Returns opacity 0→1→0 for a scroll beat with configurable fade duration */
function beatOp(p: number, enter: number, exit: number, fade = 0.04): number {
  if (p <= enter || p >= exit) return 0;
  return Math.min((p - enter) / fade, (exit - p) / fade, 1);
}

export default function ScrollyHero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(Array(TOTAL_FRAMES).fill(null));
  const loadedRef = useRef<boolean[]>(Array(TOTAL_FRAMES).fill(false));

  // Text overlay refs — updated via direct DOM writes for 60fps perf
  const b1 = useRef<HTMLDivElement>(null);
  const b2 = useRef<HTMLDivElement>(null);
  const b3 = useRef<HTMLDivElement>(null);
  const b4 = useRef<HTMLDivElement>(null);
  const b5 = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  // ── Canvas setup & resize ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ctxRef.current = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ── Preload all frames ─────────────────────────────────────────────
  useEffect(() => {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      framesRef.current[i] = img;
      img.onload = () => {
        loadedRef.current[i] = true;
        // Draw frame 0 the moment it arrives
        if (i === 0) drawAt(0);
      };
      img.src = frameSrc(i);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw helpers ───────────────────────────────────────────────────
  function drawAt(index: number) {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // Walk backward to find nearest loaded frame
    let fi = index;
    if (!loadedRef.current[fi]) {
      for (let d = 1; d < 30; d++) {
        if (fi - d >= 0 && loadedRef.current[fi - d]) { fi = fi - d; break; }
        if (fi + d < TOTAL_FRAMES && loadedRef.current[fi + d]) { fi = fi + d; break; }
      }
    }
    const img = framesRef.current[fi];
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || 1920;
    const ih = img.naturalHeight || 1080;
    const s = Math.max(cw / iw, ch / ih); // cover
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - iw * s) / 2, (ch - ih * s) / 2, iw * s, ih * s);
  }

  function setOp(ref: React.RefObject<HTMLDivElement | null>, op: number, interactive = false) {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = String(op);
    el.style.pointerEvents = interactive && op > 0.05 ? 'auto' : 'none';
  }

  // ── rAF scroll loop ────────────────────────────────────────────────
  useEffect(() => {
    let raf: number;
    let lastP = -1;

    const tick = () => {
      const section = sectionRef.current;
      if (section) {
        const scrollable = section.offsetHeight - window.innerHeight;
        const raw = -section.getBoundingClientRect().top / scrollable;
        const p = Math.max(0, Math.min(1, raw));

        if (Math.abs(p - lastP) > 0.00005) {
          lastP = p;
          drawAt(Math.round(p * (TOTAL_FRAMES - 1)));

          setOp(b1, beatOp(p, -0.5, 0.18));
          setOp(b2, beatOp(p, 0.13, 0.42));
          setOp(b3, beatOp(p, 0.38, 0.67));
          setOp(b4, beatOp(p, 0.62, 0.80));
          setOp(b5, beatOp(p, 0.75, 1.0, 0.06), true);

          if (hintRef.current) {
            hintRef.current.style.opacity = String(Math.max(0, 1 - p / 0.04));
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gradient text style helper ─────────────────────────────────────
  const gradientText = (from: string, to: string): React.CSSProperties => ({
    backgroundImage: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  });

  return (
    <div ref={sectionRef} style={{ height: `${SECTION_VH}vh` }} className="relative">
      {/*
       * Sticky viewport — bg matches frame-001 so image floats seamlessly.
       * Canvas draws over it; overlays sit on top of canvas.
       */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#b8d4e8]">

        {/* ── Canvas ── */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Subtle vignette — keeps text legible on both light and dark frames */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.22) 100%), linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.28) 100%)',
          }}
        />

        {/* ════════════════════════════════════════════════════════════
            BEAT 1 — HERO  (0 → 15%)
        ════════════════════════════════════════════════════════════ */}
        <div
          ref={b1}
          style={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-start justify-center text-left px-8 md:px-24 lg:px-32 max-w-[1600px] mx-auto pointer-events-none"
        >
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-600/20 bg-indigo-600/10 backdrop-blur-sm px-4 py-2 mb-8 pointer-events-auto shadow-sm">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-bold text-indigo-900 tracking-wider">AI-Powered UX Testing</span>
            </div>

            <h1
              className="text-6xl md:text-[5.5rem] font-extrabold tracking-tight leading-[1.02] mb-6"
              style={gradientText('#0f172a', '#312e81')}
            >
              Find UX issues <br /> before launch.
            </h1>

            <p className="text-xl text-slate-700 max-w-lg leading-relaxed font-medium">
              The UX testing platform that thinks like your users.
            </p>


            <div ref={hintRef} className="mt-14 flex flex-col items-start gap-3 pointer-events-none ml-2">
              <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-slate-400">
                Scroll to explore
              </span>
              <div className="h-10 w-px bg-gradient-to-b from-slate-400/80 to-transparent ml-12" />
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            BEAT 2 — DESIGN ANATOMY  (13 → 42%)
        ════════════════════════════════════════════════════════════ */}
        <div
          ref={b2}
          style={{ opacity: 0 }}
          className="absolute inset-0 flex items-center pl-16 md:pl-28 pointer-events-none"
        >
          <div className="max-w-lg space-y-6">
            <div className="h-px w-16 bg-indigo-600/40" />
            <h2
              className="text-5xl md:text-6xl font-bold tracking-tight"
              style={gradientText('#0f172a', '#312e81')}
            >
              Every pixel<br />has a story.
            </h2>
            <p className="text-lg text-slate-700 leading-relaxed font-medium">
              Behind every interface is a structure — layouts, components, flows, and decisions that either guide users forward or leave them behind.
            </p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Specter reads that structure so you don't have to guess.
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            BEAT 3 — BLUEPRINT LAYERS  (38 → 67%)
        ════════════════════════════════════════════════════════════ */}
        <div
          ref={b3}
          style={{ opacity: 0 }}
          className="absolute inset-0 flex items-center justify-start pl-8 md:pl-28 max-w-[1600px] mx-auto pointer-events-none"
        >
          <div className="max-w-xl space-y-6 text-left">
            <div className="h-px w-16 bg-cyan-600/60" />
            <h2
              className="text-5xl md:text-6xl font-bold tracking-tight"
              style={gradientText('#0f172a', '#312e81')}
            >
              We go deeper<br />than screenshots.
            </h2>
            <div className="space-y-3">
              <p className="text-lg text-slate-700 leading-relaxed font-medium">
                Specter doesn't just record clicks — it understands intent.
              </p>

            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            BEAT 4 — AI PERSONAS  (62 → 87%)
        ════════════════════════════════════════════════════════════ */}
        <div
          ref={b4}
          style={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pointer-events-none"
        >
          {/* Floating emotion hotspots — positioned over approximate UI element locations */}


          <div className="relative z-10 space-y-5 max-w-2xl mt-8">


            <h2
              className="text-4xl md:text-5xl font-bold tracking-tight"
              style={gradientText('#0f172a', '#312e81')}
            >

            </h2>
            <p className="text-base text-slate-700 leading-relaxed font-medium">

            </p>
            <p className="text-sm text-slate-500 font-medium">

            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            BEAT 5 — CTA / REASSEMBLY  (83 → 100%)
        ════════════════════════════════════════════════════════════ */}
        <div
          ref={b5}
          style={{ opacity: 0 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pointer-events-none"
        >
          {/* Soft white radial glow behind text — same light-BG feel as other beats */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(255,255,255,0.45) 0%, transparent 70%)',
            }}
          />

          <div className="relative space-y-5 max-w-3xl">
            <h2
              className="text-[2.2rem] sm:text-[3.2rem] md:text-[4.2rem] font-extrabold tracking-tight leading-[1.08]"
              style={{
                ...gradientText('#0f172a', '#312e81'),
                filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.7))',
              }}
            >
              Ship with confidence.<br />Launch with proof.
            </h2>



            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 pointer-events-auto">
              <Link
                href="/product"
                className="px-7 py-3.5 rounded-xl text-sm font-semibold text-slate-800 hover:text-slate-900 transition-all hover:scale-105 active:scale-95 pointer-events-auto"
                style={{
                  background: 'rgba(255,255,255,0.88)',
                  border: '1px solid rgba(15,23,42,0.12)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.28), 0 1px 4px rgba(0,0,0,0.18)',
                }}
              >
                Start your first test →
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Hotspot sub-component ──────────────────────────────────────────────────
type HotspotColor = 'emerald' | 'amber' | 'red';

const HOTSPOT_STYLES: Record<HotspotColor, { ping: string; glow: string; badge: string; text: string }> = {
  emerald: {
    ping: 'bg-emerald-400',
    glow: 'bg-emerald-400',
    badge: 'bg-emerald-950/65 border-emerald-500/45 text-emerald-300',
    text: '',
  },
  amber: {
    ping: 'bg-amber-400',
    glow: 'bg-amber-400',
    badge: 'bg-amber-950/65 border-amber-500/45 text-amber-300',
    text: '',
  },
  red: {
    ping: 'bg-red-400',
    glow: 'bg-red-400',
    badge: 'bg-red-950/65 border-red-500/45 text-red-300',
    text: '',
  },
};

function Hotspot({ top, left, color, label }: { top: string; left: string; color: HotspotColor; label: string }) {
  const s = HOTSPOT_STYLES[color];
  return (
    <div style={{ position: 'absolute', top, left }}>
      <div className={`h-3 w-3 rounded-full ${s.ping} animate-ping opacity-80`} />
      <div className={`absolute -inset-2 rounded-full ${s.glow} opacity-15`} />
      <div
        className={`absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-lg text-[10px] font-semibold border backdrop-blur-sm ${s.badge}`}
      >
        {label}
      </div>
    </div>
  );
}
