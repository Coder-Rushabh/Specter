'use client';

import dynamic from 'next/dynamic';

const LegoModelSection = dynamic(() => import('./LegoModelSection'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-[#060610] border-y border-white/5 py-24">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <span className="text-white/40 text-sm font-medium">Initializing 3D Engine...</span>
      </div>
    </div>
  )
});

export default function LegoModelWrapper() {
  return <LegoModelSection />;
}
