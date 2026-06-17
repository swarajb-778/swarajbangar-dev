'use client';

// ═══════════════════════════════════════════════════════════════
// DemoModeToast — a single, unobtrusive notice the first time any backend
// call falls back to mock data (fires the `swarajos:demo-mode` event).
// Slides up from the bottom, auto-dismisses after 5s, and shows at most
// once per page load. Mounted globally in the root layout so it covers
// every route (landing, /portfolio, /lab/*).
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';

// Module flag: survives re-renders, resets on a full page load.
let shownThisLoad = false;

export function DemoModeToast() {
  const [active, setActive] = useState(false); // triggered at least once
  const [visible, setVisible] = useState(false); // currently on-screen

  useEffect(() => {
    const onDemo = () => {
      if (shownThisLoad) return;
      shownThisLoad = true;
      setActive(true);
      // Mount at the off-screen state, then slide in on the next frame.
      requestAnimationFrame(() => setVisible(true));
    };
    window.addEventListener('swarajos:demo-mode', onDemo);
    return () => window.removeEventListener('swarajos:demo-mode', onDemo);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-bg-elevated px-4 py-2.5 text-sm text-text-secondary shadow-lg">
        <span className="size-2 rounded-full bg-accent-gold shadow-[0_0_8px_var(--accent-gold)]" />
        Running in demo mode — backend offline
      </div>
    </div>
  );
}
