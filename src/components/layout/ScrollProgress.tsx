'use client';

// ═══════════════════════════════════════════════════════════════
// ScrollProgress — 2px gradient bar at the very top of viewport
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollProgress() {
  const pathname = usePathname();
  const [scrollPercent, setScrollPercent] = useState(0);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Only render on home page
  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) return;

    function handleScroll() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0;

        setScrollPercent(percent);
        setVisible(scrollTop > 100);
      });
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isHome]);

  if (!isHome) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 300ms ease-out',
      }}
    >
      <div
        className="h-full origin-left"
        style={{
          transform: `scaleX(${scrollPercent})`,
          background: 'linear-gradient(90deg, #6C5CE7, #00CEC9)',
          transition: 'transform 50ms linear',
        }}
      />
    </div>
  );
}
