'use client';

import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Center } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Target, ShieldCheck, BrainCircuit, Sparkles } from 'lucide-react';
import { useScroll, useTransform } from 'framer-motion';
import { GoogleGeminiEffect } from '../ui/google-gemini-effect';

const scrollState = { progress: 0, scrollY: 0 };

function LegoModel() {
  const obj = useLoader(OBJLoader, '/lego-man/source/mrletsgo.obj');
  const [colorMap, normalMap, metalnessMap] = useLoader(THREE.TextureLoader, [
    '/lego-man/textures/mrletsgo_Albedo.tga.png',
    '/lego-man/textures/mrletsgo_Normal.tga.png',
    '/lego-man/textures/mrletsgo_Metallic.tga.png',
  ]);

  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    let cloned = obj.clone(true);
    colorMap.colorSpace = THREE.SRGBColorSpace;

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          map: colorMap,
          normalMap: normalMap,
          roughnessMap: metalnessMap,
          metalnessMap: metalnessMap,
          roughness: 0.8,
        });
      }
    });

    return cloned;
  }, [obj, colorMap, normalMap, metalnessMap]);

  const rotationState = useRef({
    base: 0,
    target: 0,
    isTransitioning: false,
  });

  useFrame(() => {
    if (groupRef.current) {
      const p = scrollState.progress;
      const scrollY = scrollState.scrollY || window.scrollY;

      if (p < 0.4) {
        groupRef.current.rotation.y = scrollY * 0.004;
        rotationState.current.isTransitioning = false;
      } else {
        if (!rotationState.current.isTransitioning) {
          rotationState.current.isTransitioning = true;
          const currentAngle = groupRef.current.rotation.y;
          rotationState.current.base = currentAngle;
          // Shortest path to nearest front-facing angle (n * 2π + π, model front is at 180°)
          const twoPi = Math.PI * 2;
          const frontOffset = Math.PI;
          const shifted = currentAngle - frontOffset;
          const remainder = ((shifted % twoPi) + twoPi) % twoPi;
          const distForward = twoPi - remainder;
          const distBackward = remainder;
          rotationState.current.target = distForward <= distBackward
            ? currentAngle + distForward
            : currentAngle - distBackward;
        }

        // Slow ease-out over full phase 2 duration
        const transitionProgress = Math.min((p - 0.4) / 0.6, 1);
        const easeOut = 1 - Math.pow(1 - transitionProgress, 4);

        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          rotationState.current.base,
          rotationState.current.target,
          easeOut
        );
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.2, 0]}>
      <Center scale={1.2}>
        <primitive object={geometry} />
      </Center>
    </group>
  );
}

export default function LegoModelSection() {
  const containerRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<(HTMLDivElement | null)[]>([]);

  const stickyContainerRef = useRef<HTMLDivElement>(null);
  const bgCircleRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef as any,
    offset: ["start start", "end start"],
  });

  // Calculate path lengths for the Gemini effect based on scroll progress (completes at 0.8)
  const pathLength1 = useTransform(scrollYProgress, [0.4, 0.82], [0, 1.2]);
  const pathLength2 = useTransform(scrollYProgress, [0.4, 0.84], [0, 1.2]);
  const pathLength3 = useTransform(scrollYProgress, [0.4, 0.86], [0, 1.2]);
  const pathLength4 = useTransform(scrollYProgress, [0.4, 0.88], [0, 1.2]);
  const pathLength5 = useTransform(scrollYProgress, [0.4, 0.90], [0, 1.2]);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || !textRef.current || !canvasWrapperRef.current || !statsRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const scrollableDistance = Math.max(1, rect.height - windowHeight);
      const scrolledPast = -rect.top;
      const progress = Math.max(0, Math.min(scrolledPast / scrollableDistance, 1));

      scrollState.progress = progress;
      scrollState.scrollY = window.scrollY;

      // Phase 1 (0 -> 0.4): Move text left until offscreen
      const phase1 = Math.min(progress / 0.4, 1);
      textRef.current.style.transform = `translate3d(-${phase1 * 100}%, 0, 0)`;
      textRef.current.style.opacity = phase1 === 1 ? '0' : '0.6';

      // Phase 2 (0.4 -> 1.0): Translate model left, fade in Stats
      const phase2 = Math.max(0, (progress - 0.4) / 0.6);
      const easeOutMove = 1 - Math.pow(1 - phase2, 4);
      const easeOutGeneral = 1 - Math.pow(1 - phase2, 3);

      const isDesktop = window.innerWidth >= 1024;

      // Phase 2: slide canvas left so model (at 50%) moves to 25% = center of left half
      if (isDesktop) {
        canvasWrapperRef.current.style.transform = `translate3d(-${easeOutMove * 25}vw, 0, 0)`;
      } else {
        canvasWrapperRef.current.style.transform = `translate3d(0, -${easeOutGeneral * 20}vh, 0)`;
      }

      // Fade in Stats block dynamically
      statsRef.current.style.opacity = easeOutGeneral.toString();

      // Smoothly transition background color
      if (stickyContainerRef.current) {
        const r = 238 + phase2 * (114 - 238);
        const g = 244 + phase2 * (178 - 244);
        const b = 250 + phase2 * (204 - 250);
        stickyContainerRef.current.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      }

      // Expand background circle
      if (bgCircleRef.current) {
        const circleProgress = Math.min(phase2 * 2.5, 1);
        const circleEase = 1 - Math.pow(1 - circleProgress, 4);
        const leftOffset = isDesktop ? (easeOutMove * 25) : 0;
        bgCircleRef.current.style.transform = `translate(-50%, -50%) scale(${circleEase * 30})`;
        bgCircleRef.current.style.left = `calc(50% - ${leftOffset}vw)`;
        bgCircleRef.current.style.opacity = circleProgress > 0 ? '1' : '0';
      }

      // Animate Thought Bubbles
      bubblesRef.current.forEach((bubble, i) => {
        if (!bubble) return;

        const popStart = 0.45 + (i * 0.1);
        const popEnd = popStart + 0.15;

        if (progress <= popStart) {
          bubble.style.opacity = '0';
          bubble.style.transform = 'scale(0.8) translateY(20px)';
        } else if (progress >= popEnd) {
          bubble.style.opacity = '1';
          bubble.style.transform = 'scale(1) translateY(0px)';
        } else {
          const normalized = (progress - popStart) / (popEnd - popStart);
          const easeOut = 1 - Math.pow(1 - normalized, 3);
          bubble.style.opacity = normalized.toString();
          bubble.style.transform = `scale(${0.8 + 0.2 * easeOut}) translateY(${20 - 20 * easeOut}px)`;
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <section ref={containerRef} className="h-[400vh] relative">
      <div
        ref={stickyContainerRef}
        className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden border-t border-slate-200"
        style={{ backgroundColor: '#eef4fa' }}
      >
        <div
          ref={bgCircleRef}
          className="absolute top-1/2 left-1/2 w-[10vw] h-[10vw] rounded-full bg-gray-800 will-change-transform z-0 origin-center pointer-events-none"
          style={{ opacity: 0, transform: 'translate(-50%, -50%) scale(0)' }}
        />

        <div className="absolute inset-0 flex items-center justify-start select-none z-0 overflow-hidden pointer-events-none">
          <div
            ref={textRef}
            className="inline-block whitespace-nowrap text-[16vw] font-black tracking-tighter will-change-transform"
            style={{ color: '#4f46e5', opacity: 0.6, paddingLeft: '100vw', wordSpacing: '4vw' }}
          >
            PERSONA GETTING READY TO ANALYZE
          </div>
        </div>

        {([
          { icon: BrainCircuit, text: "Wait, where is the pricing?", top: '12%', left: '3%', bottom: undefined, right: undefined },
          { icon: Sparkles, text: "Found it! Super intuitive UI.", top: '28%', left: '30%', bottom: undefined, right: undefined },
          { icon: ShieldCheck, text: "Checkout finished in 20s!", bottom: '28%', left: '3%', top: undefined, right: undefined },
          { icon: Target, text: "Friction Point: Confusion at Step 3", bottom: '16%', left: '22%', top: undefined, right: undefined },
        ] as { icon: React.ComponentType<{ className?: string }>; text: string; top?: string; bottom?: string; left?: string; right?: string }[]).map((bubble, i) => {
          const Icon = bubble.icon;
          return (
          <div
            key={i}
            ref={(el) => { if (el) bubblesRef.current[i] = el; }}
            className="absolute z-50 hidden md:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/80 backdrop-blur-md border border-white shadow-xl shadow-indigo-500/10 text-sm font-bold text-slate-700 pointer-events-none will-change-transform"
            style={{
              top: bubble.top,
              bottom: bubble.bottom,
              left: bubble.left,
              right: bubble.right,
              opacity: 0,
              transform: 'scale(0.8) translateY(20px)'
            }}
          >
            <Icon className="h-4 w-4 text-indigo-500" />
            {bubble.text}
          </div>
          );
        })}

        <div ref={canvasWrapperRef} className="absolute inset-0 z-30 will-change-transform">
          <Canvas camera={{ position: [0, 1.5, 6], fov: 45 }} className="cursor-grab active:cursor-grabbing w-full h-full">
            <ambientLight intensity={1.8} />
            <directionalLight position={[10, 10, 5]} intensity={2.5} color="#ffffff" />
            <directionalLight position={[-10, 10, -5]} intensity={1} color="#6366f1" />
            <pointLight position={[0, -2, 2]} intensity={1.5} color="#0ea5e9" />

            <Suspense fallback={null}>
              <LegoModel />
              <Environment preset="city" />
              <ContactShadows position={[0, -1.8, 0]} opacity={0.3} scale={12} blur={2.5} far={4} color="#0f172a" />
            </Suspense>

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              minPolarAngle={Math.PI / 2.5}
              maxPolarAngle={Math.PI / 1.8}
            />
          </Canvas>
        </div>

        {/* Right Panel — Gemini waves + heading */}
        <div
          ref={statsRef}
          className="absolute right-0 top-0 w-[50%] h-full z-40 pointer-events-none overflow-hidden bg-gray-800"
          style={{ opacity: 0 }}
        >
          {/* Heading — sits entirely above the wave area */}
          <div className="absolute top-[6%] left-8 right-8 z-10">
            <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-3">Specter Intelligence</p>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              We Make Actionable<br />Insights for You!
            </h3>
            <p className="text-sm text-neutral-400 mt-4 max-w-xs leading-relaxed">
              Specter reads between the pixels to understand user intent and frustration points automatically.
            </p>
          </div>

          <GoogleGeminiEffect
            pathLengths={[
              pathLength1,
              pathLength2,
              pathLength3,
              pathLength4,
              pathLength5,
            ]}
            className="w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}
