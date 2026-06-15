import Link from 'next/link';
import { AgentDemo } from '@/components/landing/LabDemos';
import '../../landing.css';

export const metadata = { title: 'SwarajOS — Agent Playground — swarajbangar.dev' };

export default function AgentLabPage() {
  return (
    <div className="lp" style={{ background: 'transparent' }}>
      <div className="section" style={{ paddingTop: 120, maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/#lab" className="kicker" style={{ textDecoration: 'none' }}>← Back to the Lab</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, margin: '14px 0 8px', color: 'var(--text-primary)' }}>
          <span className="grad">SwarajOS</span> — agent playground
        </h1>
        <p className="sub" style={{ marginBottom: 32 }}>
          A multi-agent system that answers for Swaraj. Ask about his work and watch the intent
          classifier, routing, and reasoning trace update live.
        </p>
        <AgentDemo />
      </div>
    </div>
  );
}
