import { SectionWrapper } from '@/components/ui';
import { SectionDivider } from '@/components/layout/SectionDivider';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/hero/HeroSection';

export default function Home() {
  return (
    <>
      {/* Section 1: Terminal Hero — 100vh with boot sequence + status sidebar */}
      <HeroSection />

      <SectionDivider label="// about" />

      {/* Section 2: About + Skills */}
      <SectionWrapper id="about" title="Building systems that think" subtitle="// about">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <p className="text-text-secondary leading-relaxed">
              AI engineer who builds production agent systems — not demos, not
              prototypes, but systems that serve 1.8K+ enterprises daily. Previously
              at Amazon building payment infrastructure processing 50M+ requests/day.
            </p>
            <p className="text-text-secondary leading-relaxed">
              Currently exploring the frontier of agentic AI: multi-agent
              orchestration, RAG pipeline optimization, and making LLMs actually
              reliable in production.
            </p>
            <div className="flex gap-4 pt-4">
              <PlaceholderStatCard label="Experience" value="4+ Years" />
              <PlaceholderStatCard label="Requests/Day" value="50M+" />
              <PlaceholderStatCard label="Enterprises" value="1.8K+" />
            </div>
          </div>
          <div className="flex items-center justify-center min-h-[300px] rounded-lg border border-border-default bg-bg-surface">
            <p className="text-text-muted text-sm">
              Skill Constellation (D3 graph) — Prompt 05
            </p>
          </div>
        </div>
      </SectionWrapper>

      <SectionDivider label="// experience" />

      {/* Section 3: Experience Timeline */}
      <SectionWrapper id="experience" title="Where I've built things" subtitle="// experience">
        <div className="flex items-center justify-center min-h-[400px] rounded-lg border border-border-default bg-bg-surface">
          <p className="text-text-muted text-sm">
            Experience Timeline — Prompt 06
          </p>
        </div>
      </SectionWrapper>

      <SectionDivider label="// lab" />

      {/* Section 4: The Lab */}
      <SectionWrapper id="lab" title="Don't read about my skills. Use them." subtitle="// lab">
        <div className="flex items-center justify-center min-h-[400px] rounded-lg border border-border-default bg-bg-surface">
          <p className="text-text-muted text-sm">
            Lab Section with Tabs — Prompt 07
          </p>
        </div>
      </SectionWrapper>

      <SectionDivider label="// deep dives" />

      {/* Section 5: Case Studies */}
      <SectionWrapper id="case-studies" title="The hard problems, dissected" subtitle="// deep dives">
        <div className="grid md:grid-cols-3 gap-6">
          <PlaceholderCard title="Multi-Agent Orchestration at Scale" />
          <PlaceholderCard title="Event-Driven Migration at Amazon" />
          <PlaceholderCard title="Production RAG Pipeline Tuning" />
        </div>
      </SectionWrapper>

      <SectionDivider label="// writing" />

      {/* Section 6: Blog */}
      <SectionWrapper id="blog" title="Thinking out loud" subtitle="// writing">
        <div className="grid md:grid-cols-3 gap-6">
          <PlaceholderCard title="Building Production RAG Pipelines" />
          <PlaceholderCard title="Why I Left REST for Event Sourcing" />
          <PlaceholderCard title="Multi-Agent Orchestration Patterns" />
        </div>
        <div className="mt-8 text-center">
          <a
            href="/blog"
            className="text-sm text-accent-primary hover:text-[#7C6CF7] transition-colors"
          >
            View all posts &rarr;
          </a>
        </div>
      </SectionWrapper>

      <SectionDivider label="// observability" />

      {/* Section 7: Observability Wall */}
      <SectionWrapper id="observability" title="This portfolio monitors itself" subtitle="// observability">
        <div className="flex items-center justify-center min-h-[300px] rounded-lg border border-border-default bg-bg-surface">
          <p className="text-text-muted text-sm">
            Grafana-style Dashboard — Prompt 08
          </p>
        </div>
      </SectionWrapper>

      <SectionDivider />

      {/* Section 8: Contact */}
      <SectionWrapper id="contact" title="Let's build something together" subtitle="// contact">
        <div className="flex justify-center gap-4">
          {['Mail', 'LinkedIn', 'GitHub', 'Resume'].map((label) => (
            <div
              key={label}
              className="flex items-center justify-center size-12 rounded-full bg-bg-surface border border-border-default text-text-muted"
            >
              <span className="text-xs">{label[0]}</span>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Footer */}
      <Footer />
    </>
  );
}

// ── Temporary placeholder components (will be replaced in later prompts) ──

function PlaceholderStatCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex-1 bg-bg-surface border border-border-default rounded-lg p-4">
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-text-primary mt-1">{value}</p>
    </div>
  );
}

function PlaceholderCard({ title }: { readonly title: string }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-6 hover:border-border-hover hover:-translate-y-0.5 transition-all duration-250">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm text-text-muted">Coming soon...</p>
    </div>
  );
}
