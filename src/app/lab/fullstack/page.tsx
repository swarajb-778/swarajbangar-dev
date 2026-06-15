import Link from 'next/link';
import { RealtimeDemo } from '@/components/landing/LabDemos';
import '../../landing.css';

export const metadata = { title: 'Collaborative Systems — Realtime — swarajbangar.dev' };

export default function FullstackLabPage() {
  return (
    <div className="lp" style={{ background: 'transparent' }}>
      <div className="section" style={{ paddingTop: 120, maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/#lab" className="kicker" style={{ textDecoration: 'none' }}>← Back to the Lab</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, margin: '14px 0 8px', color: 'var(--text-primary)' }}>
          <span className="grad">Collaborative</span> systems
        </h1>
        <p className="sub" style={{ marginBottom: 32 }}>
          Live cursors under 50ms, Redis pub/sub fan-out, presence that scales horizontally —
          with a live messages-per-second stream.
        </p>
        <RealtimeDemo />
      </div>
    </div>
  );
}
