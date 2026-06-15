import Link from 'next/link';
import { ChaosLabDemo } from '@/components/landing/LabDemos';
import '../../landing.css';

export const metadata = { title: 'Backend Chaos Lab — swarajbangar.dev' };

export default function BackendLabPage() {
  return (
    <div className="lp" style={{ background: 'transparent' }}>
      <div className="section" style={{ paddingTop: 120, maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/#lab" className="kicker" style={{ textDecoration: 'none' }}>← Back to the Lab</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, margin: '14px 0 8px', color: 'var(--text-primary)' }}>
          Backend <span className="grad">Chaos Lab</span>
        </h1>
        <p className="sub" style={{ marginBottom: 32 }}>
          A real microservices mesh you&apos;re invited to break. Inject faults, watch circuit breakers
          trip, and see the live p95 / error-rate charts re-shape and self-heal.
        </p>
        <ChaosLabDemo />
      </div>
    </div>
  );
}
