'use client';

// ═══════════════════════════════════════════════════════════════
// LabSection — Tabs + animated content with DemoContainer
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LabTabs, type LabTab } from './LabTabs';
import { LabPreviewCard, type LabPreviewCardProps } from './LabPreviewCard';
import { DemoContainer } from './DemoContainer';
import { LAB_SOURCE_FILES } from '@/lib/constants/code-snippets';

const LAB_CONTENT: Record<LabTab, LabPreviewCardProps & { sourceKey: keyof typeof LAB_SOURCE_FILES }> = {
  fullstack: {
    title: 'Collaborative Notepad',
    description:
      'Real-time collaborative editing with cursor presence, conflict resolution, and persistent storage. See WebSocket infrastructure in action.',
    features: [
      'Real-time multi-user editing via WebSocket',
      'Live cursor presence and user awareness',
      'Conflict-free replicated data type (CRDT)',
      'Persistent storage with Redis-backed sessions',
    ],
    techStack: ['React', 'Socket.io', 'Redis', 'Node.js', 'TypeScript'],
    status: 'coming-soon',
    demoUrl: '/lab/fullstack',
    sourceKey: 'fullstack',
  },
  backend: {
    title: 'Distributed Systems Chaos Lab',
    description:
      'Inject failures into a microservice mesh and watch circuit breakers, rate limiters, and event replay systems respond in real time.',
    features: [
      'Live failure injection with visual service mesh',
      'Token bucket rate limiter with real-time visualization',
      'Event sourcing timeline with replay controls',
      'Interactive API playground with curl generation',
    ],
    techStack: ['Go', 'Redis Streams', 'Docker', 'gRPC', 'Prometheus'],
    status: 'coming-soon',
    demoUrl: '/lab/backend',
    sourceKey: 'backend',
  },
  ai: {
    title: 'Intelligence Lab',
    description:
      'Explore the internals of production AI systems: watch RAG pipelines retrieve and rank, visualize embeddings in 3D space, and compare models head-to-head.',
    features: [
      'RAG Pipeline X-Ray with chunk scoring visualization',
      '3D embedding space explorer with clustering',
      'Side-by-side model comparison arena',
      'Real-time token streaming with latency metrics',
    ],
    techStack: ['LangChain', 'pgvector', 'Three.js', 'Claude API', 'Python'],
    status: 'coming-soon',
    demoUrl: '/lab/ai',
    sourceKey: 'ai',
  },
  agent: {
    title: 'SwarajOS',
    description:
      'A multi-agent system with visible reasoning chains. Ask it to review code, design systems, or navigate my experience — watch the agents think.',
    features: [
      'Multi-agent orchestration with LangGraph',
      'Visible reasoning chains and tool calls',
      'Knowledge graph memory with Neo4j',
      'Sandboxed code execution via Pyodide',
    ],
    techStack: ['LangGraph', 'Neo4j', 'Pyodide', 'Claude API', 'FastAPI'],
    status: 'coming-soon',
    demoUrl: '/lab/agent',
    sourceKey: 'agent',
  },
} as const;

export function LabSection() {
  const [activeTab, setActiveTab] = useState<LabTab>('fullstack');

  const content = LAB_CONTENT[activeTab];
  const sourceFiles = LAB_SOURCE_FILES[content.sourceKey];

  return (
    <div className="space-y-6">
      <LabTabs activeTab={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <DemoContainer
            title={content.title}
            description={content.description}
            techStack={content.techStack}
            sourceFiles={sourceFiles}
            demoUrl={content.demoUrl}
          >
            <LabPreviewCard {...content} />
          </DemoContainer>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
