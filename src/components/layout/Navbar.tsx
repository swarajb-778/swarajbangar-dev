'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Menu, X, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/constants';
import { useFloating } from '@/lib/floating-context';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

export function Navbar() {
  const { toggleTerminal } = useFloating();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const prefersReduced = useReducedMotion();

  // Frosted glass on scroll past hero
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.85);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection observer for active section highlighting
  useEffect(() => {
    const sectionIds = NAV_ITEMS.map((item) => item.href.replace('#', ''));
    const observers: IntersectionObserver[] = [];

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (!el) continue;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id);
          }
        },
        { rootMargin: '-40% 0px -55% 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <motion.nav
        initial={prefersReduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReduced ? { duration: 0.01 } : { delay: 0.1, duration: 0.4 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 h-16 md:h-16',
          'transition-all duration-200',
          scrolled
            ? 'glass-nav border-b border-white/[0.08]'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="font-display font-bold text-lg text-accent-primary hover:text-[#7C6CF7] transition-colors duration-150"
          >
            SB
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const sectionId = item.href.replace('#', '');
              const isActive = activeSection === sectionId;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative px-3 py-2 text-sm transition-colors duration-150',
                    isActive
                      ? 'text-accent-primary'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-dot"
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 size-1 rounded-full bg-accent-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side: Terminal button + hamburger */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTerminal}
              className={cn(
                'hidden md:inline-flex items-center gap-2 px-3 py-1.5',
                'text-sm text-accent-primary border border-white/[0.08] rounded-md',
                'hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-150',
                'backdrop-blur-sm'
              )}
              aria-label="Toggle terminal overlay"
            >
              <Terminal size={14} />
              Terminal
              <span className="ml-1 px-1.5 py-0.5 bg-white/[0.06] rounded text-[10px] text-text-muted font-mono">
                T
              </span>
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-bg-base/95 backdrop-blur-lg md:hidden"
          >
            <div className="flex flex-col items-center justify-center h-full gap-6">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={cn(
                    'text-2xl font-medium transition-colors duration-150',
                    activeSection === item.href.replace('#', '')
                      ? 'text-accent-primary'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <button
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-accent-primary border border-white/[0.08] rounded-md backdrop-blur-sm"
                onClick={() => {
                  closeMobile();
                  toggleTerminal();
                }}
                aria-label="Toggle terminal overlay"
              >
                <Terminal size={16} />
                Terminal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
