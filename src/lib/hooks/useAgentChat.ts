'use client';

// ═══════════════════════════════════════════════════════════════
// useAgentChat — drives a streaming SwarajOS conversation.
//
// One SSE stream (via api-client.streamAgent) carries BOTH the reasoning
// trace (`step` events → agentSteps) and the answer (`token` fragments →
// the active assistant message). The session id lives in React state only
// (project rule: no localStorage / sessionStorage). All backend failures
// degrade to a canned mock stream inside streamAgent, so this hook never
// surfaces a transport error to the UI — only an explicit backend `error`
// frame sets `error`.
// ═══════════════════════════════════════════════════════════════

import { useCallback, useRef, useState } from 'react';
import { streamAgent } from '@/lib/api-client';
import type { AgentEvent, AgentStep, ChatMessage } from '@/lib/types';

export interface UseAgentChat {
  readonly messages: ChatMessage[];
  readonly agentSteps: AgentStep[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly sessionId: string;
  readonly sendMessage: (text: string) => Promise<void>;
  readonly clearHistory: () => void;
}

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * @param initialMessages optional seed messages (e.g. a greeting bubble).
 * @param onEvent optional per-frame callback (e.g. to react to the live
 *   classify intent). Must be stable (wrap in useCallback) or it will
 *   re-create sendMessage on every render.
 */
export function useAgentChat(
  initialMessages: ChatMessage[] = [],
  onEvent?: (event: AgentEvent) => void
): UseAgentChat {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState<string>(newSessionId);
  // Synchronous re-entrancy lock — the isLoading state update is async, so a
  // rapid second call could slip past it and fire a duplicate agent run.
  const inFlight = useRef(false);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || inFlight.current) return;
      inFlight.current = true;

      setError(null);
      setIsLoading(true);
      setAgentSteps([]);

      const stamp = Date.now();
      const assistantId = `a-${stamp}`;
      const nowIso = new Date().toISOString();
      setMessages((m) => [
        ...m,
        { id: `u-${stamp}`, role: 'user', content: trimmed, timestamp: nowIso },
        { id: assistantId, role: 'assistant', content: '', timestamp: nowIso, streaming: true },
      ]);

      const patchAssistant = (patch: Partial<ChatMessage>) =>
        setMessages((m) =>
          m.map((msg) => (msg.id === assistantId ? { ...msg, ...patch } : msg))
        );

      let answer = '';
      try {
        for await (const event of streamAgent(trimmed, sessionId)) {
          onEvent?.(event);
          if (event.type === 'step') {
            setAgentSteps((s) => [...s, event.data]);
          } else if (event.type === 'token') {
            answer += event.data.text;
            patchAssistant({ content: answer });
          } else if (event.type === 'done') {
            patchAssistant({ streaming: false, metadata: event.data });
          } else if (event.type === 'error') {
            setError(event.data.message);
          }
        }
      } catch (e) {
        // streamAgent is designed not to throw, but guard anyway.
        setError(String(e));
      } finally {
        // Ensure the bubble never stays stuck in the streaming state.
        patchAssistant({ streaming: false });
        setIsLoading(false);
        inFlight.current = false;
      }
    },
    [sessionId, onEvent]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setAgentSteps([]);
    setError(null);
  }, []);

  return { messages, agentSteps, isLoading, error, sessionId, sendMessage, clearHistory };
}
