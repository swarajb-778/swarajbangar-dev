// TODO: Phase 3 — Replace mock imports with real fetch calls to backend
// ═══════════════════════════════════════════════════════════════
// swarajbangar.dev — API Client
// Typed async wrappers around mock data. Components import from here,
// never directly from mock-data.ts. When the backend is ready, swap
// the mock imports for real fetch calls — component code stays unchanged.
// ═══════════════════════════════════════════════════════════════

import type {
  BlogPost,
  CaseStudy,
  ChaosMetrics,
  ChatMessage,
  ExperienceEntry,
  MetricCard,
  RAGResult,
  SkillNode,
} from './types';
import {
  getMockBlogPosts,
  getMockCaseStudies,
  getMockChaosMetrics,
  getMockChatResponse,
  getMockExperience,
  getMockObservabilityMetrics,
  getMockRAGResult,
  getMockSkills,
} from './mock-data';
import { sleep } from './utils';

export async function getExperience(): Promise<readonly ExperienceEntry[]> {
  await sleep(300);
  return getMockExperience();
}

export async function getSkills(): Promise<readonly SkillNode[]> {
  await sleep(200);
  return getMockSkills();
}

export async function getChaosMetrics(): Promise<ChaosMetrics> {
  await sleep(400);
  return getMockChaosMetrics();
}

export async function queryRAG(_query: string): Promise<RAGResult> {
  await sleep(500);
  return getMockRAGResult();
}

export async function chatWithAgent(
  _message: string,
  _sessionId: string
): Promise<ChatMessage> {
  await sleep(1000);
  return getMockChatResponse();
}

export async function getObservabilityMetrics(): Promise<
  readonly MetricCard[]
> {
  await sleep(300);
  return getMockObservabilityMetrics();
}

export async function getBlogPosts(): Promise<readonly BlogPost[]> {
  await sleep(200);
  return getMockBlogPosts();
}

export async function getCaseStudies(): Promise<readonly CaseStudy[]> {
  await sleep(200);
  return getMockCaseStudies();
}
