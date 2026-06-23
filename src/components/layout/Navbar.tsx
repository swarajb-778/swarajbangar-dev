'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '@/lib/constants';
import { useFloating } from '@/lib/floating-context';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useActiveSection } from '@/lib/hooks/useActiveSection';

export function Navbar() {
  const pathname = usePathname();
  const { toggleTerminal } = useFloating();
  const [mobileOpen, setMobileOpen] = useState(false);
  const prefersReduced = useReducedMotion();
  const { activeSection: activeSectionId } = useActiveSection();

  // On route pages, determine parent section for highlighting
  const isHome = pathname === '/' || pathname === '/portfolio';
  const activeSection = isHome
    ? activeSectionId
    : pathname.startsWith('/lab')
      ? 'lab'
      : pathname.startsWith('/blog')
        ? 'blog'
        : pathname.startsWith('/case-studies')
          ? 'case-studies'
          : '';

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      {/* Floating glass-pill nav */}
      <motion.nav
        initial={prefersReduced ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReduced ? { duration: 0.01 } : { delay: 0.1, duration: 0.4 }}
        className="fixed top-[18px] left-0 right-0 z-50 flex justify-center px-4"
      >
        <div className="glass-nav flex items-center gap-1 rounded-full border border-white/[0.08] py-2 pl-[18px] pr-2 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          {/* Logo / wordmark */}
          <Link href="/" className="group mr-3 flex items-center gap-2">
            <span className="font-display text-[19px] font-bold leading-none tracking-tight text-accent-primary transition-colors group-hover:text-[#7C6CF7]">
              SB
            </span>
            <span className="hidden font-mono text-xs text-text-muted lg:inline">
              swarajbangar<span className="text-accent-teal">.dev</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-0.5 md:flex">
            {NAV_ITEMS.map((item) => {
              const sectionId = item.href.replace('#', '');
              const isActive = activeSection === sectionId;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative rounded-full px-[13px] py-2 text-[13.5px] font-medium transition-colors duration-150',
                    isActive
                      ? 'text-accent-primary'
                      : 'text-text-secondary hover:bg-white/[0.06] hover:text-text-primary'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-full bg-accent-primary/[0.12]"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Terminal CTA */}
          <button
            onClick={toggleTerminal}
            className={cn(
              'ml-2 hidden items-center gap-2 rounded-full px-3.5 py-2 md:inline-flex',
              'text-[13.5px] text-accent-primary border border-white/[0.08]',
              'transition-all duration-150 hover:border-white/[0.12] hover:bg-white/[0.04]'
            )}
            aria-label="Toggle terminal overlay"
          >
            <Terminal size={14} />
            Terminal
            <span className="ml-0.5 rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
              T
            </span>
          </button>

          {/* Mobile hamburger */}
          <button
            className="rounded-full p-2 text-text-muted transition-colors hover:text-text-primary md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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
            <div className="flex h-full flex-col items-center justify-center gap-6">
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
                className="mt-4 inline-flex items-center gap-2 rounded-md border border-white/[0.08] px-4 py-2 text-accent-primary backdrop-blur-sm"
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
