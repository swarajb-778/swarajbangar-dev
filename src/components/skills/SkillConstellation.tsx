'use client';

// ═══════════════════════════════════════════════════════════════
// SkillConstellation — D3 force graph (desktop) / Badge grid (mobile)
// ═══════════════════════════════════════════════════════════════

import { useRef, useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui';
import { SKILLS_DATA } from '@/lib/constants';
import type { SkillNode } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  'ai-ml': '#6C5CE7',
  backend: '#00CEC9',
  frontend: '#FDCB6E',
  tools: '#00B894',
} as const;

const CATEGORY_LABELS: Record<string, string> = {
  'ai-ml': 'AI / ML',
  backend: 'Backend',
  frontend: 'Frontend',
  tools: 'Tools',
} as const;

const BADGE_VARIANTS: Record<string, 'purple' | 'teal' | 'gold' | 'emerald'> = {
  'ai-ml': 'purple',
  backend: 'teal',
  frontend: 'gold',
  tools: 'emerald',
} as const;

function getNodeRadius(proficiency: number): number {
  if (proficiency >= 90) return 16;
  if (proficiency >= 80) return 12;
  return 8;
}

interface SimNode {
  id: string;
  name: string;
  category: string;
  proficiency: number;
  connections: readonly string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
}

interface SimLink {
  source: SimNode;
  target: SimNode;
}

function ForceGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    readonly x: number;
    readonly y: number;
    readonly name: string;
    readonly category: string;
    readonly proficiency: number;
  } | null>(null);
  const simulationRef = useRef<import('d3-force').Simulation<SimNode, SimLink> | null>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<SimLink[]>([]);

  useEffect(() => {
    let disposed = false;

    async function init() {
      const svg = svgRef.current;
      const container = containerRef.current;
      if (!svg || !container) return;

      const d3Force = await import('d3-force');
      if (disposed) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

      // Build nodes
      const nodes: SimNode[] = SKILLS_DATA.map((skill) => ({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        proficiency: skill.proficiency,
        connections: skill.connections,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 200,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
      }));

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // Build links
      const linkSet = new Set<string>();
      const links: SimLink[] = [];
      for (const node of nodes) {
        for (const connId of node.connections) {
          const target = nodeMap.get(connId);
          if (!target) continue;
          const key = [node.id, connId].sort().join('-');
          if (linkSet.has(key)) continue;
          linkSet.add(key);
          links.push({ source: node, target });
        }
      }

      nodesRef.current = nodes;
      linksRef.current = links;

      const simulation = d3Force
        .forceSimulation(nodes)
        .force(
          'link',
          d3Force
            .forceLink<SimNode, SimLink>(links)
            .id((d) => d.id)
            .distance(80)
        )
        .force('charge', d3Force.forceManyBody().strength(-120))
        .force('center', d3Force.forceCenter(width / 2, height / 2))
        .force('collision', d3Force.forceCollide<SimNode>().radius((d) => getNodeRadius(d.proficiency) + 4))
        .alphaDecay(0.02);

      simulationRef.current = simulation;

      simulation.on('tick', () => {
        if (disposed) return;

        // Constrain nodes within bounds
        for (const node of nodes) {
          const r = getNodeRadius(node.proficiency);
          node.x = Math.max(r + 10, Math.min(width - r - 10, node.x));
          node.y = Math.max(r + 10, Math.min(height - r - 10, node.y));
        }

        // Update SVG
        const linkEls = svg.querySelectorAll('.link');
        linkEls.forEach((el, i) => {
          const link = links[i];
          if (!link) return;
          el.setAttribute('x1', String(link.source.x));
          el.setAttribute('y1', String(link.source.y));
          el.setAttribute('x2', String(link.target.x));
          el.setAttribute('y2', String(link.target.y));
        });

        const nodeEls = svg.querySelectorAll('.node-group');
        nodeEls.forEach((el, i) => {
          const node = nodes[i];
          if (!node) return;
          el.setAttribute('transform', `translate(${node.x},${node.y})`);
        });
      });
    }

    init();

    return () => {
      disposed = true;
      simulationRef.current?.stop();
    };
  }, []);

  const handleMouseEnter = useCallback((nodeId: string) => {
    setHoveredNode(nodeId);
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      setTooltip({
        x: node.x,
        y: node.y,
        name: node.name,
        category: CATEGORY_LABELS[node.category] ?? node.category,
        proficiency: node.proficiency,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    setTooltip(null);
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    const event = new CustomEvent('skill-selected', { detail: { skillId: nodeId } });
    window.dispatchEvent(event);
  }, []);

  // Drag handlers
  const dragNodeRef = useRef<SimNode | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    dragNodeRef.current = node;
    node.fx = node.x;
    node.fy = node.y;
    simulationRef.current?.alphaTarget(0.3).restart();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const node = dragNodeRef.current;
    if (!node || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    node.fx = e.clientX - rect.left;
    node.fy = e.clientY - rect.top;
  }, []);

  const handlePointerUp = useCallback(() => {
    const node = dragNodeRef.current;
    if (!node) return;
    node.fx = null;
    node.fy = null;
    dragNodeRef.current = null;
    simulationRef.current?.alphaTarget(0);
  }, []);

  const connectedSet = new Set<string>();
  if (hoveredNode) {
    connectedSet.add(hoveredNode);
    const node = nodesRef.current.find((n) => n.id === hoveredNode);
    if (node) {
      for (const c of node.connections) {
        connectedSet.add(c);
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[350px]"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Links */}
        {linksRef.current.map((link, i) => {
          const dimmed =
            hoveredNode !== null &&
            !connectedSet.has(link.source.id) &&
            !connectedSet.has(link.target.id);
          return (
            <line
              key={i}
              className="link"
              x1={link.source.x}
              y1={link.source.y}
              x2={link.target.x}
              y2={link.target.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              style={{
                opacity: dimmed ? 0.1 : 0.4,
                transition: 'opacity 200ms',
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodesRef.current.map((node) => {
          const r = getNodeRadius(node.proficiency);
          const color = CATEGORY_COLORS[node.category] ?? '#6C5CE7';
          const dimmed = hoveredNode !== null && !connectedSet.has(node.id);
          const highlighted = hoveredNode === node.id;

          return (
            <g
              key={node.id}
              className="node-group"
              transform={`translate(${node.x},${node.y})`}
              style={{
                opacity: dimmed ? 0.2 : 1,
                transition: 'opacity 200ms',
                cursor: 'pointer',
              }}
              onMouseEnter={() => handleMouseEnter(node.id)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleNodeClick(node.id)}
              onPointerDown={(e) => handlePointerDown(e, node.id)}
            >
              <circle
                r={r}
                fill={color}
                filter={highlighted ? 'url(#glow)' : undefined}
                style={{
                  transition: 'r 200ms',
                }}
              />
              {highlighted && (
                <circle
                  r={r + 4}
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.4"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-bg-elevated border border-border-default rounded-md px-3 py-2 shadow-lg"
          style={{
            left: tooltip.x + 20,
            top: tooltip.y - 20,
            transform: 'translateY(-100%)',
          }}
        >
          <p className="text-sm font-semibold text-text-primary">{tooltip.name}</p>
          <p className="text-xs text-text-muted">
            {tooltip.category} · {tooltip.proficiency}%
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-3">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[key] }}
            />
            <span className="text-[10px] text-text-disabled">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MobileBadgeGrid() {
  const categories = Object.entries(CATEGORY_LABELS);

  return (
    <div className="space-y-4">
      {categories.map(([key, label]) => {
        const skills = SKILLS_DATA.filter((s) => s.category === key);
        const variant = BADGE_VARIANTS[key] ?? 'purple';
        return (
          <div key={key}>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-2">
              {label}
            </p>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill.id} variant={variant}>
                  {skill.name}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SkillConstellation() {
  return (
    <>
      {/* Desktop: D3 force graph */}
      <div className="hidden md:block h-full min-h-[350px]">
        <ForceGraph />
      </div>

      {/* Mobile: Badge grid fallback */}
      <div className="md:hidden">
        <MobileBadgeGrid />
      </div>
    </>
  );
}
