import Link from 'next/link';
import { RagDemo } from '@/components/landing/LabDemos';
import '../../landing.css';

export const metadata = { title: 'AI Intelligence Lab — RAG X-ray — swarajbangar.dev' };

export default function AiLabPage() {
  return (
    <div className="lp" style={{ background: 'transparent' }}>
      <div className="section" style={{ paddingTop: 120, maxWidth: 1000, margin: '0 auto' }}>
        <Link href="/#lab" className="kicker" style={{ textDecoration: 'none' }}>← Back to the Lab</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, margin: '14px 0 8px', color: 'var(--text-primary)' }}>
          AI Intelligence Lab — <span className="grad">RAG X-ray</span>
        </h1>
        <p className="sub" style={{ marginBottom: 32 }}>
          Every query dissected: embedding, retrieval, reranking, generation. Re-run the pipeline
          and watch the per-stage latencies shift on the interactive chart.
        </p>
        <RagDemo />
      </div>
    </div>
  );
}
