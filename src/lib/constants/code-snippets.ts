// ═══════════════════════════════════════════════════════════════
// Lab Demo Source Code Snippets — Realistic implementations
// ═══════════════════════════════════════════════════════════════

export interface CodeFile {
  readonly filename: string;
  readonly code: string;
  readonly language: string;
}

export interface DemoSourceFiles {
  readonly fullstack: readonly CodeFile[];
  readonly backend: readonly CodeFile[];
  readonly ai: readonly CodeFile[];
  readonly agent: readonly CodeFile[];
}

export const LAB_SOURCE_FILES: DemoSourceFiles = {
  fullstack: [
    {
      filename: 'useWebSocket.ts',
      language: 'typescript',
      code: `import { useRef, useEffect, useCallback, useState } from 'react';

interface WSMessage {
  type: 'edit' | 'cursor' | 'join' | 'leave';
  userId: string;
  payload: unknown;
}

interface UseWebSocketOptions {
  url: string;
  sessionId: string;
  onMessage: (msg: WSMessage) => void;
  reconnectInterval?: number;
}

export function useWebSocket({
  url,
  sessionId,
  onMessage,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const retriesRef = useRef(0);
  const maxRetries = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(\`\${url}?session=\${sessionId}\`);

    ws.onopen = () => {
      setStatus('connected');
      retriesRef.current = 0;
      ws.send(JSON.stringify({ type: 'join', userId: sessionId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      if (retriesRef.current < maxRetries) {
        retriesRef.current++;
        const delay = reconnectInterval * Math.pow(2, retriesRef.current - 1);
        setTimeout(connect, Math.min(delay, 30000));
      }
    };

    ws.onerror = () => ws.close();
    wsRef.current = ws;
  }, [url, sessionId, onMessage, reconnectInterval]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return { status, send, reconnect: connect };
}`,
    },
    {
      filename: 'CollabEditor.tsx',
      language: 'tsx',
      code: `import { useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface CursorPosition {
  userId: string;
  line: number;
  col: number;
  color: string;
}

interface CollabEditorProps {
  sessionId: string;
  wsUrl: string;
}

export function CollabEditor({ sessionId, wsUrl }: CollabEditorProps) {
  const [content, setContent] = useState('');
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lastSyncRef = useRef(0);

  const handleMessage = useCallback((msg: { type: string; userId: string; payload: any }) => {
    switch (msg.type) {
      case 'edit':
        // Apply operational transform — only merge if no local conflict
        if (msg.userId !== sessionId) {
          setContent((prev) => applyOT(prev, msg.payload));
        }
        break;
      case 'cursor':
        setCursors((prev) => {
          const next = new Map(prev);
          next.set(msg.userId, msg.payload as CursorPosition);
          return next;
        });
        break;
      case 'leave':
        setCursors((prev) => {
          const next = new Map(prev);
          next.delete(msg.userId);
          return next;
        });
        break;
    }
  }, [sessionId]);

  const { status, send } = useWebSocket({
    url: wsUrl,
    sessionId,
    onMessage: handleMessage,
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Throttle sync to ~60fps
    const now = Date.now();
    if (now - lastSyncRef.current > 16) {
      send({ type: 'edit', userId: sessionId, payload: { content: newContent, ts: now } });
      lastSyncRef.current = now;
    }
  }, [send, sessionId]);

  return (
    <div className="relative h-full">
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span className={\`size-2 rounded-full \${status === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}\`} />
        <span className="text-xs text-gray-400">{cursors.size + 1} online</span>
      </div>
      <textarea
        ref={editorRef}
        value={content}
        onChange={handleChange}
        className="w-full h-full bg-transparent text-sm font-mono resize-none focus:outline-none"
        placeholder="Start typing... other users will see your changes in real time."
      />
      {/* Remote cursor overlays */}
      {Array.from(cursors.values()).map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute w-0.5 h-5 animate-pulse"
          style={{ left: cursor.col * 8, top: cursor.line * 20, backgroundColor: cursor.color }}
        />
      ))}
    </div>
  );
}

function applyOT(current: string, patch: { content: string; ts: number }): string {
  // Simplified OT: last-write-wins with timestamp ordering
  return patch.content;
}`,
    },
  ],

  backend: [
    {
      filename: 'circuit-breaker.go',
      language: 'go',
      code: `package breaker

import (
	"sync"
	"time"
)

type State int

const (
	Closed State = iota
	Open
	HalfOpen
)

type CircuitBreaker struct {
	mu             sync.RWMutex
	state          State
	failCount      int
	successCount   int
	threshold      int
	resetTimeout   time.Duration
	halfOpenMax    int
	lastFailure    time.Time
}

func New(threshold int, resetTimeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:        Closed,
		threshold:    threshold,
		resetTimeout: resetTimeout,
		halfOpenMax:  3,
	}
}

func (cb *CircuitBreaker) Execute(fn func() error) error {
	if !cb.canExecute() {
		return ErrCircuitOpen
	}

	err := fn()

	cb.mu.Lock()
	defer cb.mu.Unlock()

	if err != nil {
		cb.failCount++
		cb.lastFailure = time.Now()
		if cb.failCount >= cb.threshold {
			cb.state = Open
		}
		return err
	}

	if cb.state == HalfOpen {
		cb.successCount++
		if cb.successCount >= cb.halfOpenMax {
			cb.reset()
		}
	} else {
		cb.reset()
	}
	return nil
}

func (cb *CircuitBreaker) canExecute() bool {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	switch cb.state {
	case Closed:
		return true
	case Open:
		if time.Since(cb.lastFailure) > cb.resetTimeout {
			cb.mu.RUnlock()
			cb.mu.Lock()
			cb.state = HalfOpen
			cb.successCount = 0
			cb.mu.Unlock()
			cb.mu.RLock()
			return true
		}
		return false
	case HalfOpen:
		return true
	}
	return false
}

func (cb *CircuitBreaker) reset() {
	cb.state = Closed
	cb.failCount = 0
	cb.successCount = 0
}

var ErrCircuitOpen = fmt.Errorf("circuit breaker is open")`,
    },
    {
      filename: 'rate-limiter.py',
      language: 'python',
      code: `import time
import threading
from dataclasses import dataclass, field


@dataclass
class TokenBucket:
    """Token bucket rate limiter with thread-safe refill."""

    capacity: int
    refill_rate: float  # tokens per second
    tokens: float = field(init=False)
    last_refill: float = field(init=False)
    lock: threading.Lock = field(default_factory=threading.Lock)

    def __post_init__(self):
        self.tokens = float(self.capacity)
        self.last_refill = time.monotonic()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self.last_refill
        new_tokens = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + new_tokens)
        self.last_refill = now

    def acquire(self, tokens: int = 1) -> bool:
        """Try to consume tokens. Returns True if allowed."""
        with self.lock:
            self._refill()
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

    def wait_and_acquire(self, tokens: int = 1, timeout: float = 5.0) -> bool:
        """Block until tokens are available or timeout."""
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if self.acquire(tokens):
                return True
            # Sleep for estimated time until tokens refill
            wait = tokens / self.refill_rate
            time.sleep(min(wait, 0.1))
        return False

    @property
    def available(self) -> float:
        with self.lock:
            self._refill()
            return self.tokens


# Usage
limiter = TokenBucket(capacity=100, refill_rate=10.0)

def handle_request(request_id: str) -> dict:
    if not limiter.acquire():
        return {"status": 429, "error": "Rate limit exceeded"}
    return {"status": 200, "data": f"Processed {request_id}"}`,
    },
    {
      filename: 'docker-compose.yml',
      language: 'yaml',
      code: `version: "3.9"

services:
  gateway:
    build: ./gateway
    ports:
      - "8080:8080"
    depends_on:
      - service-a
      - service-b
      - redis
    environment:
      - CIRCUIT_BREAKER_THRESHOLD=5
      - RATE_LIMIT_RPS=100

  service-a:
    build: ./services/service-a
    deploy:
      replicas: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9090/health"]
      interval: 10s
      timeout: 3s
      retries: 3

  service-b:
    build: ./services/service-b
    deploy:
      replicas: 2
    environment:
      - FAILURE_RATE=0.3  # Chaos injection: 30% failure rate
      - LATENCY_MS=200

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=chaos-lab
    depends_on:
      - prometheus

volumes:
  redis-data:`,
    },
  ],

  ai: [
    {
      filename: 'rag_pipeline.py',
      language: 'python',
      code: `from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import PGVector
from litellm import acompletion
import asyncio

router = APIRouter(prefix="/v1/rag")

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = PGVector(
    connection_string="postgresql://user:pass@db:5432/portfolio",
    embedding_function=embeddings,
    collection_name="portfolio_docs",
)


class QueryRequest(BaseModel):
    query: str
    top_k: int = 5
    rerank: bool = True


class RAGResponse(BaseModel):
    answer: str
    sources: list[dict]
    latency_ms: float


@router.post("/query", response_model=RAGResponse)
async def query_rag(req: QueryRequest):
    import time
    start = time.monotonic()

    # 1. Embed query
    query_embedding = await embeddings.aembed_query(req.query)

    # 2. Retrieve candidates (hybrid: vector + BM25)
    candidates = vectorstore.similarity_search_with_score(
        req.query, k=req.top_k * 3  # Over-fetch for reranking
    )

    # 3. Rerank with cross-encoder scoring
    if req.rerank and len(candidates) > req.top_k:
        candidates = await rerank_candidates(req.query, candidates)
    
    top_docs = candidates[:req.top_k]
    context = "\\n\\n".join(doc.page_content for doc, _ in top_docs)

    # 4. Generate answer with streaming
    response = await acompletion(
        model="claude-sonnet-4-20250514",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\\n{context}\\n\\nQuestion: {req.query}"},
        ],
        max_tokens=1024,
        temperature=0.3,
    )

    elapsed = (time.monotonic() - start) * 1000

    return RAGResponse(
        answer=response.choices[0].message.content,
        sources=[{"content": d.page_content[:200], "score": s} for d, s in top_docs],
        latency_ms=round(elapsed, 1),
    )


async def rerank_candidates(query, candidates):
    """Cross-encoder reranking for improved relevance."""
    from sentence_transformers import CrossEncoder
    reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    
    pairs = [(query, doc.page_content) for doc, _ in candidates]
    scores = reranker.predict(pairs)
    
    ranked = sorted(zip(candidates, scores), key=lambda x: x[1], reverse=True)
    return [c for c, _ in ranked]


SYSTEM_PROMPT = """You are an AI assistant for Swaraj Bangar's portfolio.
Answer questions about his experience, projects, and skills based on
the provided context. Be concise, technical, and accurate."""`,
    },
    {
      filename: 'hybrid_search.sql',
      language: 'sql',
      code: `-- Hybrid search: pgvector cosine similarity + BM25 text ranking
-- Combines semantic understanding with keyword precision

WITH semantic_results AS (
  -- Vector similarity search (cosine distance)
  SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> $1::vector) AS semantic_score
  FROM portfolio_docs
  WHERE 1 - (embedding <=> $1::vector) > 0.3  -- minimum similarity threshold
  ORDER BY embedding <=> $1::vector
  LIMIT 20
),

keyword_results AS (
  -- BM25 full-text search with PostgreSQL ts_rank
  SELECT
    id,
    content,
    metadata,
    ts_rank_cd(
      to_tsvector('english', content),
      plainto_tsquery('english', $2),
      32  -- normalization: divide by document length
    ) AS keyword_score
  FROM portfolio_docs
  WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $2)
  ORDER BY keyword_score DESC
  LIMIT 20
),

combined AS (
  -- Reciprocal Rank Fusion (RRF) to merge both result sets
  SELECT
    COALESCE(s.id, k.id) AS id,
    COALESCE(s.content, k.content) AS content,
    COALESCE(s.metadata, k.metadata) AS metadata,
    COALESCE(s.semantic_score, 0) AS semantic_score,
    COALESCE(k.keyword_score, 0) AS keyword_score,
    -- RRF formula: 1/(k + rank) for each retriever
    (1.0 / (60 + ROW_NUMBER() OVER (ORDER BY s.semantic_score DESC NULLS LAST)))
    +
    (1.0 / (60 + ROW_NUMBER() OVER (ORDER BY k.keyword_score DESC NULLS LAST)))
    AS rrf_score
  FROM semantic_results s
  FULL OUTER JOIN keyword_results k ON s.id = k.id
)

SELECT id, content, metadata, semantic_score, keyword_score, rrf_score
FROM combined
ORDER BY rrf_score DESC
LIMIT $3;  -- top_k parameter`,
    },
  ],

  agent: [
    {
      filename: 'orchestrator.py',
      language: 'python',
      code: `from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from typing import TypedDict, Annotated, Literal
from langchain_core.messages import BaseMessage, HumanMessage
import operator


class AgentState(TypedDict):
    """State flowing through the multi-agent graph."""
    messages: Annotated[list[BaseMessage], operator.add]
    current_agent: str
    tool_calls: list[dict]
    reasoning_trace: list[str]
    context: dict


def create_orchestrator():
    """Build the multi-agent LangGraph state machine."""
    graph = StateGraph(AgentState)

    # --- Define agent nodes ---
    graph.add_node("router", router_agent)
    graph.add_node("researcher", researcher_agent)
    graph.add_node("code_reviewer", code_review_agent)
    graph.add_node("architect", architect_agent)
    graph.add_node("tools", ToolNode(tools=ALL_TOOLS))
    graph.add_node("synthesizer", synthesizer_agent)

    # --- Define edges ---
    graph.set_entry_point("router")
    
    graph.add_conditional_edges(
        "router",
        route_to_specialist,
        {
            "research": "researcher",
            "code_review": "code_reviewer",
            "architecture": "architect",
            "direct": "synthesizer",
        },
    )

    # Each specialist can call tools or go to synthesizer
    for agent in ["researcher", "code_reviewer", "architect"]:
        graph.add_conditional_edges(
            agent,
            should_use_tools,
            {"tools": "tools", "synthesize": "synthesizer"},
        )

    graph.add_edge("tools", "router")  # Loop back after tool execution
    graph.add_edge("synthesizer", END)

    return graph.compile()


def router_agent(state: AgentState) -> AgentState:
    """Classify intent and route to specialist agent."""
    messages = state["messages"]
    last_msg = messages[-1].content

    classification = classify_intent(last_msg)
    state["reasoning_trace"].append(
        f"[Router] Classified as: {classification}"
    )
    state["current_agent"] = classification
    return state


def route_to_specialist(state: AgentState) -> Literal["research", "code_review", "architecture", "direct"]:
    return state["current_agent"]


def should_use_tools(state: AgentState) -> Literal["tools", "synthesize"]:
    last_msg = state["messages"][-1]
    if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
        return "tools"
    return "synthesize"


# Initialize
orchestrator = create_orchestrator()`,
    },
    {
      filename: 'tools.py',
      language: 'python',
      code: `from langchain_core.tools import tool
from langchain_community.vectorstores import PGVector
from neo4j import GraphDatabase
import subprocess
import json


@tool
def vector_search(query: str, collection: str = "portfolio_docs", top_k: int = 5) -> str:
    """Search the knowledge base using semantic similarity.
    
    Use this to find information about Swaraj's projects, experience,
    skills, or any documented knowledge.
    """
    store = PGVector(
        connection_string=DB_URL,
        collection_name=collection,
        embedding_function=embeddings,
    )
    results = store.similarity_search_with_score(query, k=top_k)
    return json.dumps([
        {"content": doc.page_content[:500], "score": round(score, 3)}
        for doc, score in results
    ])


@tool
def query_knowledge_graph(cypher_query: str) -> str:
    """Execute a Cypher query against the Neo4j knowledge graph.
    
    The graph contains nodes: Person, Company, Project, Skill, Technology.
    Relationships: WORKED_AT, BUILT, USES, KNOWS, RELATED_TO.
    """
    with GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASS)) as driver:
        with driver.session() as session:
            result = session.run(cypher_query)
            records = [dict(r) for r in result]
            return json.dumps(records, default=str)


@tool
def code_review(code: str, language: str = "python") -> str:
    """Analyze code for bugs, performance issues, and best practices.
    
    Returns structured review with severity ratings.
    """
    from litellm import completion
    
    response = completion(
        model="claude-sonnet-4-20250514",
        messages=[{
            "role": "user",
            "content": f"Review this {language} code. Return JSON with: "
                       f"issues (severity, line, description), "
                       f"suggestions, overall_score (1-10).\\n\\n{code}"
        }],
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content


@tool
def generate_diagram(description: str, diagram_type: str = "mermaid") -> str:
    """Generate a system architecture or flow diagram.
    
    Returns Mermaid diagram syntax that can be rendered in the UI.
    """
    from litellm import completion
    
    response = completion(
        model="claude-sonnet-4-20250514",
        messages=[{
            "role": "user",
            "content": f"Generate a {diagram_type} diagram for: {description}. "
                       f"Return only the diagram code, no explanation."
        }],
    )
    return response.choices[0].message.content


# Aggregate all tools
ALL_TOOLS = [vector_search, query_knowledge_graph, code_review, generate_diagram]`,
    },
  ],
} as const;
