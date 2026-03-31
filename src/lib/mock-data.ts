// ═══════════════════════════════════════════════════════════════
// swarajbangar.dev — Mock Data
// Realistic mock data for every component. Components never import
// from this file directly — use api-client.ts instead.
// ═══════════════════════════════════════════════════════════════

import type {
  AgentStep,
  BlogPost,
  CaseStudy,
  ChaosMetrics,
  ChatMessage,
  EmbeddingPoint,
  ExperienceEntry,
  MetricCard,
  ModelComparison,
  RAGResult,
  SkillNode,
} from './types';
import { EXPERIENCE_DATA, SKILLS_DATA } from './constants';

// ── Agent / Chat ──

export function getMockChatResponse(): ChatMessage {
  return {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content:
      "Hey! I'm SwarajOS — Swaraj's portfolio agent. I can tell you about his experience building multi-agent systems at Meshi.io, scaling payment infrastructure at Amazon (50M+ req/day), or walk you through any of the live demos in the Lab. Try asking me to 'design a URL shortener' or 'review this code snippet'!",
    timestamp: new Date().toISOString(),
  };
}

export function getMockAgentSteps(): readonly AgentStep[] {
  const base = Date.now();
  return [
    {
      id: 'step-1',
      type: 'classify',
      status: 'complete',
      data: { intent: 'technical_question', confidence: 0.94 },
      latency_ms: 12,
      timestamp: new Date(base).toISOString(),
    },
    {
      id: 'step-2',
      type: 'route',
      status: 'complete',
      data: { agent: 'experience_navigator', reason: 'career-related query' },
      latency_ms: 8,
      timestamp: new Date(base + 12).toISOString(),
    },
    {
      id: 'step-3',
      type: 'tool_call',
      status: 'complete',
      data: { tool: 'search_experience', query: 'payment infrastructure scale' },
      latency_ms: 45,
      timestamp: new Date(base + 20).toISOString(),
    },
    {
      id: 'step-4',
      type: 'retrieve',
      status: 'complete',
      data: { chunks_retrieved: 4, top_score: 0.92 },
      latency_ms: 38,
      timestamp: new Date(base + 65).toISOString(),
    },
    {
      id: 'step-5',
      type: 'generate',
      status: 'complete',
      data: { model: 'claude-sonnet-4', tokens: 247 },
      latency_ms: 180,
      timestamp: new Date(base + 103).toISOString(),
    },
  ];
}

// ── Chaos Lab ──

export function getMockChaosMetrics(): ChaosMetrics {
  return {
    services: [
      {
        name: 'API Gateway',
        status: 'healthy',
        requestCount: 12_450_000,
        errorRate: 0.12,
        p95Latency: 45,
        circuitBreaker: 'closed',
      },
      {
        name: 'Auth Service',
        status: 'degraded',
        requestCount: 8_320_000,
        errorRate: 2.8,
        p95Latency: 320,
        circuitBreaker: 'half-open',
      },
      {
        name: 'Payment Processor',
        status: 'healthy',
        requestCount: 3_150_000,
        errorRate: 0.05,
        p95Latency: 89,
        circuitBreaker: 'closed',
      },
      {
        name: 'Notification Service',
        status: 'down',
        requestCount: 1_890_000,
        errorRate: 15.4,
        p95Latency: 4500,
        circuitBreaker: 'open',
      },
    ],
    totalRequests: 25_810_000,
    overallErrorRate: 1.87,
    overallP95: 142,
  };
}

// ── RAG Pipeline ──

export function getMockRAGResult(): RAGResult {
  return {
    query: 'How does the multi-agent orchestration handle tool failures?',
    answer:
      'The orchestration layer uses a supervisor pattern with LangGraph. When a tool call fails, the supervisor catches the error, logs it to the reasoning trace, and either retries with exponential backoff or routes to a fallback agent. Circuit breakers prevent cascading failures across the agent graph.',
    chunks: [
      {
        id: 'chunk-1',
        text: 'The LangGraph supervisor node monitors all child agent states and implements retry logic with configurable backoff policies...',
        source: 'architecture/agent-orchestration.md',
        score: 0.94,
        metadata: { section: 'error-handling', page: 12 },
      },
      {
        id: 'chunk-2',
        text: 'Circuit breakers in the agent graph prevent cascading failures. When an agent exceeds its error threshold, the breaker opens and routes to fallback...',
        source: 'architecture/resilience-patterns.md',
        score: 0.89,
        metadata: { section: 'circuit-breakers', page: 7 },
      },
      {
        id: 'chunk-3',
        text: 'Tool call failures are captured in the reasoning trace, providing full observability into the decision chain...',
        source: 'docs/observability.md',
        score: 0.82,
        metadata: { section: 'tracing', page: 3 },
      },
      {
        id: 'chunk-4',
        text: 'Fallback agents maintain a simplified toolset to ensure degraded but functional responses when primary agents fail...',
        source: 'architecture/agent-orchestration.md',
        score: 0.72,
        metadata: { section: 'fallback-strategy', page: 15 },
      },
    ],
    pipeline: [
      {
        step: 'embed',
        status: 'complete',
        data: { model: 'text-embedding-3-small', dimensions: 1536 },
        latency_ms: 24,
      },
      {
        step: 'retrieve',
        status: 'complete',
        data: { index: 'portfolio-docs', top_k: 8, filtered: 4 },
        latency_ms: 18,
      },
      {
        step: 'rerank',
        status: 'complete',
        data: { model: 'cohere-rerank-v3', kept: 4 },
        latency_ms: 42,
      },
      {
        step: 'generate',
        status: 'complete',
        data: { model: 'claude-sonnet-4', tokens_out: 156 },
        latency_ms: 210,
      },
    ],
    totalLatency: 294,
  };
}

// ── Embedding Explorer ──

export function getMockEmbeddingPoints(): readonly EmbeddingPoint[] {
  const categories = ['ai-ml', 'backend', 'frontend', 'devops', 'data'];
  const sources = [
    'langchain-docs',
    'fastapi-guide',
    'react-patterns',
    'k8s-manifests',
    'pg-queries',
  ];
  const texts = [
    'Vector similarity search with pgvector',
    'FastAPI dependency injection patterns',
    'React server components rendering',
    'Kubernetes pod autoscaling config',
    'PostgreSQL query optimization',
    'LangGraph agent state management',
    'Redis pub/sub event streaming',
    'Next.js incremental static regeneration',
    'Docker multi-stage build optimization',
    'Embedding model fine-tuning pipeline',
    'Circuit breaker implementation in Go',
    'Tailwind CSS design token system',
    'Neo4j knowledge graph traversal',
    'WebSocket real-time collaboration',
    'RAG chunk overlap strategies',
    'Rate limiter token bucket algorithm',
    'Framer Motion layout animations',
    'Event sourcing with Redis Streams',
    'Claude API tool use patterns',
    'Supabase row-level security policies',
    'D3 force-directed graph layout',
    'gRPC service mesh communication',
    'Shiki syntax highlighting themes',
    'LiteLLM multi-model routing',
  ];

  return texts.map((text, i) => ({
    id: `emb-${i + 1}`,
    x: Math.sin(i * 0.8) * 0.7 + (Math.random() - 0.5) * 0.3,
    y: Math.cos(i * 0.6) * 0.7 + (Math.random() - 0.5) * 0.3,
    z: Math.sin(i * 0.4 + 1) * 0.5 + (Math.random() - 0.5) * 0.2,
    text,
    source: sources[i % sources.length],
    category: categories[i % categories.length],
  }));
}

// ── Model Arena ──

export function getMockModelComparison(): readonly ModelComparison[] {
  return [
    {
      model: 'Claude Sonnet 4',
      response:
        'To design a URL shortener at scale, I\'d recommend a three-tier architecture: 1) A stateless API layer behind a load balancer, 2) A distributed hash generation service using base62 encoding with collision detection, 3) A caching layer (Redis) in front of PostgreSQL for read-heavy workloads. For 100M+ daily redirects, use consistent hashing to partition the keyspace across multiple database shards.',
      latency_ms: 1240,
      tokenCount: 312,
      estimatedCost: 0.0047,
      qualityScore: 9.2,
    },
    {
      model: 'GPT-4o',
      response:
        'A URL shortener system design involves: generating unique short codes (base62 with 7 chars gives 3.5T combinations), storing mappings in a key-value store, and handling redirects with 301/302 responses. For scale, add a CDN for popular links, use write-behind caching, and implement rate limiting. Consider analytics tracking as a separate async pipeline.',
      latency_ms: 980,
      tokenCount: 287,
      estimatedCost: 0.0043,
      qualityScore: 8.8,
    },
    {
      model: 'Llama 3 70B',
      response:
        'URL shortener design: Use a hash function to generate short codes from long URLs. Store in database with an index on the short code. Add caching with Redis for frequently accessed URLs. Use a load balancer for horizontal scaling. Implement rate limiting to prevent abuse.',
      latency_ms: 650,
      tokenCount: 198,
      estimatedCost: 0.0008,
      qualityScore: 7.4,
    },
  ];
}

// ── Skills & Experience (pass-through from constants) ──

export function getMockSkills(): readonly SkillNode[] {
  return SKILLS_DATA;
}

export function getMockExperience(): readonly ExperienceEntry[] {
  return EXPERIENCE_DATA;
}

// ── Blog ──

export function getMockBlogPosts(): readonly BlogPost[] {
  return [
    {
      slug: 'production-rag-pipelines',
      title: 'Building Production RAG Pipelines: Lessons from 1.8K Enterprises',
      description:
        'What I learned building RAG systems that actually work in production — chunking strategies, reranking, and the metrics that matter.',
      date: '2024-03-10',
      readingTime: '12 min read',
      tags: ['RAG', 'AI Engineering', 'LangChain', 'Production'],
    },
    {
      slug: 'rest-to-event-sourcing',
      title: 'Why I Left REST for Event Sourcing',
      description:
        'After building payment systems at Amazon handling 50M+ daily requests, here\'s why event sourcing changed how I think about distributed state.',
      date: '2024-02-18',
      readingTime: '9 min read',
      tags: ['Event Sourcing', 'Distributed Systems', 'Architecture'],
    },
    {
      slug: 'multi-agent-orchestration',
      title: 'Multi-Agent Orchestration Patterns with LangGraph',
      description:
        'A practical guide to supervisor, hierarchical, and swarm patterns for building reliable multi-agent systems.',
      date: '2024-01-25',
      readingTime: '15 min read',
      tags: ['LangGraph', 'Agents', 'AI', 'Architecture'],
    },
  ];
}

// ── Case Studies ──

export function getMockCaseStudies(): readonly CaseStudy[] {
  return [
    {
      slug: 'multi-agent-orchestration',
      title: 'Multi-Agent Orchestration at Scale',
      headline:
        'How we built a 12-agent system serving 1.8K enterprises with 94% RAG accuracy and sub-300ms orchestration latency.',
      techFocus: ['LangGraph', 'Claude API', 'Neo4j', 'Redis Streams'],
    },
    {
      slug: 'amazon-event-migration',
      title: 'Event-Driven Migration at Amazon',
      headline:
        'Migrating a monolithic payment system to event-driven microservices while maintaining 50M+ daily transactions and 99.99% uptime.',
      techFocus: ['AWS', 'DynamoDB', 'SQS', 'Event Sourcing'],
    },
    {
      slug: 'rag-pipeline-tuning',
      title: 'Production RAG Pipeline Tuning',
      headline:
        'Taking a RAG pipeline from 67% to 94% accuracy through systematic chunking, reranking, and evaluation-driven optimization.',
      techFocus: ['pgvector', 'LangChain', 'Embeddings', 'Evaluation'],
    },
  ];
}

// ── Observability ──

export function getMockObservabilityMetrics(): readonly MetricCard[] {
  return [
    {
      label: 'Total Requests',
      value: '2.4M',
      unit: 'today',
      trend: 'up',
      sparklineData: [
        1.8, 1.9, 2.0, 1.7, 2.1, 2.3, 1.9, 2.0, 2.2, 2.1, 2.3, 2.4,
      ],
    },
    {
      label: 'P95 Latency',
      value: '142',
      unit: 'ms',
      trend: 'stable',
      sparklineData: [
        156, 148, 142, 139, 145, 150, 138, 142, 147, 141, 143, 142,
      ],
    },
    {
      label: 'Error Rate',
      value: '0.12',
      unit: '%',
      trend: 'down',
      sparklineData: [
        0.28, 0.24, 0.19, 0.22, 0.18, 0.15, 0.17, 0.14, 0.13, 0.12, 0.11,
        0.12,
      ],
    },
    {
      label: 'Uptime',
      value: '99.97',
      unit: '%',
      trend: 'stable',
      sparklineData: [
        99.95, 99.98, 99.99, 99.97, 99.96, 99.99, 99.98, 99.97, 99.99,
        99.98, 99.97, 99.97,
      ],
    },
    {
      label: 'Agent Interactions',
      value: '847',
      unit: 'today',
      trend: 'up',
      sparklineData: [
        520, 610, 580, 690, 720, 680, 750, 810, 780, 820, 830, 847,
      ],
    },
    {
      label: 'Deploys This Week',
      value: '14',
      trend: 'up',
      sparklineData: [2, 3, 1, 2, 3, 1, 2],
    },
  ];
}
