'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // The dashboard scroll container is <main>, not window
    const container = document.querySelector('main');
    if (!container) return;

    const onScroll = () => setVisible(container.scrollTop > 400);
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => {
        const container = document.querySelector('main');
        container?.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="no-print fixed bottom-6 right-6 z-50 h-10 w-10 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:bg-indigo-700 transition-colors"
      aria-label="Scroll to top"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
