// ═══════════════════════════════════════════════════════════════
// swarajbangar.dev — Core TypeScript Interfaces
// All shared types. Component-specific types stay in component files.
// ═══════════════════════════════════════════════════════════════

// ── Agent / Chat ──

export interface ChatMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: string;
}

export type AgentStepType =
  | 'classify'
  | 'route'
  | 'tool_call'
  | 'retrieve'
  | 'generate';

export type StepStatus = 'pending' | 'active' | 'complete' | 'error';

export interface AgentStep {
  readonly id: string;
  readonly type: AgentStepType;
  readonly status: StepStatus;
  readonly data: Record<string, unknown>;
  readonly latency_ms?: number;
  readonly timestamp: string;
}

// ── Chaos Lab ──

export type ServiceStatus = 'healthy' | 'degraded' | 'down';
export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface ChaosService {
  readonly name: string;
  readonly status: ServiceStatus;
  readonly requestCount: number;
  readonly errorRate: number;
  readonly p95Latency: number;
  readonly circuitBreaker: CircuitBreakerState;
}

export interface ChaosMetrics {
  readonly services: readonly ChaosService[];
  readonly totalRequests: number;
  readonly overallErrorRate: number;
  readonly overallP95: number;
}

// ── RAG Pipeline ──

export interface RAGChunk {
  readonly id: string;
  readonly text: string;
  readonly source: string;
  readonly score: number;
  readonly metadata: Record<string, unknown>;
}

export type RAGStepName = 'embed' | 'retrieve' | 'rerank' | 'generate';

export interface RAGPipelineStep {
  readonly step: RAGStepName;
  readonly status: StepStatus;
  readonly data: Record<string, unknown>;
  readonly latency_ms: number;
}

export interface RAGResult {
  readonly query: string;
  readonly answer: string;
  readonly chunks: readonly RAGChunk[];
  readonly pipeline: readonly RAGPipelineStep[];
  readonly totalLatency: number;
}

// ── Embedding Explorer ──

export interface EmbeddingPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly text: string;
  readonly source: string;
  readonly category: string;
}

// ── Model Arena ──

export interface ModelComparison {
  readonly model: string;
  readonly response: string;
  readonly latency_ms: number;
  readonly tokenCount: number;
  readonly estimatedCost: number;
  readonly qualityScore: number;
}

// ── Skills ──

export type SkillCategory = 'ai-ml' | 'backend' | 'frontend' | 'tools';

export interface SkillNode {
  readonly id: string;
  readonly name: string;
  readonly category: SkillCategory;
  readonly proficiency: number;
  readonly connections: readonly string[];
}

// ── Experience ──

export interface ExperienceMetric {
  readonly label: string;
  readonly value: string;
}

export interface ExperienceEntry {
  readonly company: string;
  readonly title: string;
  readonly dates: string;
  readonly description: string;
  readonly metrics: readonly ExperienceMetric[];
  readonly technologies: readonly string[];
  readonly architectureDiagram?: string;
}

// ── Content ──

export interface BlogPost {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly readingTime: string;
  readonly tags: readonly string[];
}

export interface CaseStudy {
  readonly slug: string;
  readonly title: string;
  readonly headline: string;
  readonly techFocus: readonly string[];
}

// ── Observability ──

export type MetricTrend = 'up' | 'down' | 'stable';

export interface MetricCard {
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly trend?: MetricTrend;
  readonly sparklineData?: readonly number[];
}
