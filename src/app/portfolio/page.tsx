import { SectionWrapper } from '@/components/ui';
import { SectionDivider } from '@/components/layout/SectionDivider';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/hero/HeroSection';
import { AboutSection } from '@/components/about/AboutSection';
import { ExperienceTimeline } from '@/components/experience/ExperienceTimeline';
import { LabSection } from '@/components/lab/LabSection';
import { CaseStudyCard } from '@/components/case-studies/CaseStudyCard';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { ObservabilityWallLazy } from '@/components/observability/ObservabilityWallLazy';
import { ContactSection } from '@/components/contact/ContactSection';
import {
  getExperience,
  getCaseStudies,
  getBlogPosts,
  getObservabilityMetrics,
} from '@/lib/api-client';

export default async function Home() {
  const [experience, caseStudies, blogPosts, metrics] = await Promise.all([
    getExperience(),
    getCaseStudies(),
    getBlogPosts(),
    getObservabilityMetrics(),
  ]);
  return (
    <>
      {/* Section 1: Terminal Hero — 100vh with boot sequence + status sidebar */}
      <HeroSection />

      <SectionDivider label="About" />

      {/* Section 2: About + Skills */}
      <SectionWrapper id="about" title="Building systems that think">
        <AboutSection />
      </SectionWrapper>

      <SectionDivider label="Experience" />

      {/* Section 3: Experience Timeline */}
      <SectionWrapper id="experience" title="Where I've built things">
        <ExperienceTimeline entries={experience} />
      </SectionWrapper>

      <SectionDivider label="Lab" />

      {/* Section 4: The Lab */}
      <SectionWrapper id="lab" title="Don't read about my skills. Use them.">
        <LabSection />
      </SectionWrapper>

      <SectionDivider label="Deep Dives" />

      {/* Section 5: Case Studies */}
      <SectionWrapper id="case-studies" title="The hard problems, dissected">
        <div className="grid md:grid-cols-3 gap-6">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.slug} study={study} />
          ))}
        </div>
      </SectionWrapper>

      <SectionDivider label="Writing" />

      {/* Section 6: Blog */}
      <SectionWrapper id="blog" title="Thinking out loud">
        <div className="grid md:grid-cols-3 gap-6">
          {blogPosts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
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

      <SectionDivider label="Observability" />

      {/* Section 7: Observability Wall */}
      <SectionWrapper id="observability" title="This portfolio monitors itself">
        <ObservabilityWallLazy metrics={metrics} />
      </SectionWrapper>

      <SectionDivider label="Contact" />

      {/* Section 8: Contact */}
      <SectionWrapper id="contact" title="Let's build something together">
        <ContactSection />
      </SectionWrapper>

      {/* Footer */}
      <Footer />
    </>
  );
}