'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Atmosphere } from '@/components/layout/Atmosphere';
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts';
import { ScrollProgress } from '@/components/layout/ScrollProgress';
import { ChatButton } from '@/components/agent/ChatButton';
import { ChatPanel } from '@/components/agent/ChatPanel';
import { TerminalOverlay } from '@/components/terminal/TerminalOverlay';
import { FloatingTerminalButton } from '@/components/terminal/FloatingTerminalButton';
import { ProgressiveBlur } from '@/components/ui/ProgressiveBlur';

/**
 * SiteChrome — the persistent portfolio shell (atmosphere, glass nav,
 * floating chat/terminal, scroll progress). The awwwards landing page at
 * `/` is a self-contained design that brings its own nav, background and
 * chat dock, so the shared chrome is suppressed there.
 */
export function SiteChrome({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <Atmosphere />
      <Navbar />
      <ProgressiveBlur position="top" height="11%" />
      <main className="flex-1">{children}</main>
      <ChatButton />
      <ChatPanel />
      <TerminalOverlay />
      <FloatingTerminalButton />
      <KeyboardShortcuts />
      <ScrollProgress />
    </>
  );
}
