import { useState, useRef, useMemo } from "react";
import type { InfrastructureGraph, InfrastructureNode, DependencyEdge } from "@/types/infrastructure";
import type { EnrichedNode } from "@/data/infrastructure";
import { MS } from "@/components/shared";
import { cn } from "@/lib/utils";

interface GraphHighlight {
  sourceId: string;
  reachableIds: readonly string[];
  isolatedIds: readonly string[];
  highlightEdges: Set<string>;
}

interface GraphPanelProps {
  graph: InfrastructureGraph;
  highlight: GraphHighlight;
  onSelectNode?: (id: string) => void;
  className?: string;
  height?: number | string;
}

const NODE_WIDTH = 190;
const NODE_HEIGHT = 72;

const typeIcons: Record<string, string> = {
  server: "dns",
  application: "layers",
  database: "database",
  workstation: "desktop_windows",
  api: "cloud_sync",
  account: "badge",
};

export function GraphPanel({ graph, highlight, onSelectNode, className, height }: GraphPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const { sourceId, reachableIds, isolatedIds, highlightEdges } = highlight;
  const reachableSet = useMemo(() => new Set(reachableIds), [reachableIds]);
  const isolatedSet = useMemo(() => new Set(isolatedIds), [isolatedIds]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, EnrichedNode>();
    for (const node of graph.nodes as EnrichedNode[]) {
      map.set(node.id, node);
    }
    return map;
  }, [graph.nodes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative select-none overflow-hidden bg-[#090d18]", className)}
      style={{ height: height ?? undefined, cursor: isDragging ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Matrix Grid */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-20">
        <defs>
          <pattern id="grid-pattern-cypher" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#26334d" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1" fill="#22d3ee" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern-cypher)" />
      </svg>

      {/* Interactive SVG Canvas */}
      <svg
        viewBox="0 0 1180 560"
        className="h-full w-full transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <defs>
          <marker
            id="marker-attack"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f43f5e" />
          </marker>
          <marker
            id="marker-standard"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 8 5 L 0 8 z" fill="#38bdf8" opacity="0.75" />
          </marker>
          <marker
            id="marker-blocked"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 7 5 L 0 8 z" fill="#64748b" opacity="0.5" />
          </marker>

          <filter id="glow-rose-path" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. EDGES */}
        <g className="edges-layer">
          {graph.edges.map((edge) => {
            const fromNode = nodeMap.get(edge.source);
            const toNode = nodeMap.get(edge.target);
            if (!fromNode || !toNode) return null;

            const edgeKey = `${edge.source}->${edge.target}`;
            const isAttackPath = highlightEdges.has(edgeKey);
            const isSourceIsolated = isolatedSet.has(edge.source);
            const isTargetIsolated = isolatedSet.has(edge.target);
            const isCut = isSourceIsolated || isTargetIsolated;

            const x1 = fromNode.position.x + NODE_WIDTH;
            const y1 = fromNode.position.y + NODE_HEIGHT / 2;
            const x2 = toNode.position.x;
            const y2 = toNode.position.y + NODE_HEIGHT / 2;

            const dx = Math.max(45, (x2 - x1) * 0.5);
            const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            if (isAttackPath && !isCut) {
              return (
                <g key={`${edge.source}-${edge.target}`} className="edge-attack-active">
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="4"
                    opacity="0.35"
                    filter="url(#glow-rose-path)"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                    className="animate-pulse"
                    markerEnd="url(#marker-attack)"
                  />
                </g>
              );
            }

            if (!edge.allowsPropagation || isCut) {
              return (
                <path
                  key={`${edge.source}-${edge.target}`}
                  d={pathD}
                  fill="none"
                  stroke={isCut ? "#f43f5e" : "#475569"}
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  opacity={isCut ? 0.35 : 0.4}
                  markerEnd="url(#marker-blocked)"
                />
              );
            }

            return (
              <path
                key={`${edge.source}-${edge.target}`}
                d={pathD}
                fill="none"
                stroke="#334155"
                strokeWidth="1.6"
                opacity="0.75"
                markerEnd="url(#marker-standard)"
                className="hover:stroke-cyan-400"
              />
            );
          })}
        </g>

        {/* 2. NODES */}
        <g className="nodes-layer">
          {(graph.nodes as EnrichedNode[]).map((node) => {
            const isSource = node.id === sourceId;
            const isReachable = reachableSet.has(node.id);
            const isIsolated = isolatedSet.has(node.id);
            const isHovered = hoveredNodeId === node.id;

            let borderColor = "#26334d";
            let bgFill = "#161b2b";

            if (isSource) {
              borderColor = "#f43f5e";
              bgFill = "#26131c";
            } else if (isIsolated) {
              borderColor = "#f59e0b";
              bgFill = "#1c1813";
            } else if (isReachable) {
              borderColor = node.isCritical ? "#f43f5e" : "#fbbf24";
              bgFill = node.isCritical ? "#22131e" : "#1e1b15";
            }

            const iconName = typeIcons[node.type] ?? "dns";

            return (
              <g
                key={node.id}
                transform={`translate(${node.position.x}, ${node.position.y})`}
                className="cursor-pointer transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectNode?.(node.id);
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Node Box */}
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx="6"
                  ry="6"
                  fill={bgFill}
                  stroke={borderColor}
                  strokeWidth={isSource ? 2.5 : isHovered ? 2 : 1.2}
                />

                {/* Source Ping */}
                {isSource && (
                  <circle
                    cx="15"
                    cy="15"
                    r="9"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Header foreignObject */}
                <foreignObject x="8" y="7" width={NODE_WIDTH - 16} height="26">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span
                      className={cn(
                        "material-symbols-outlined text-[16px]",
                        isSource
                          ? "text-rose-400"
                          : isIsolated
                            ? "text-amber-400"
                            : isReachable
                              ? "text-amber-300"
                              : "text-cyan-400",
                      )}
                    >
                      {iconName}
                    </span>
                    <span
                      className={cn(
                        "truncate font-mono text-[11px] font-semibold",
                        isSource ? "text-white" : isIsolated ? "text-amber-200 line-through" : "text-slate-100",
                      )}
                      title={node.label}
                    >
                      {node.label}
                    </span>
                  </div>
                </foreignObject>

                {/* Subtitle foreignObject */}
                <foreignObject x="8" y="32" width={NODE_WIDTH - 16} height="16">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span>{node.ipAddress}</span>
                    <span className="truncate opacity-80">{node.zone}</span>
                  </div>
                </foreignObject>

                {/* Badges foreignObject */}
                <foreignObject x="8" y="50" width={NODE_WIDTH - 16} height="16">
                  <div className="flex items-center justify-between font-mono text-[8px]">
                    <span
                      className={cn(
                        "rounded px-1 py-0.2 font-bold uppercase",
                        node.isCritical
                          ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                          : "bg-surface-lowest text-slate-400 border border-outline",
                      )}
                    >
                      {node.isCritical ? "CRITICAL" : node.type}
                    </span>
                    <span className="flex items-center gap-1 text-slate-300">
                      {isSource ? (
                        <span className="text-rose-400 font-bold">SOURCE</span>
                      ) : isIsolated ? (
                        <span className="text-amber-400 font-bold">ISOLATED</span>
                      ) : isReachable ? (
                        <span className="text-rose-300 font-medium">REACHABLE</span>
                      ) : (
                        <span className="text-teal-400">NOMINAL</span>
                      )}
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isSource
                            ? "bg-rose-400 animate-pulse"
                            : isIsolated
                              ? "bg-amber-400"
                              : isReachable
                                ? "bg-rose-500"
                                : "bg-teal-400",
                        )}
                      />
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating Canvas Controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded border border-outline bg-surface-low/90 p-1 shadow-md backdrop-blur-sm">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2))}
          className="rounded p-1 text-slate-400 hover:bg-surface-hover hover:text-white"
          title="Zoom In"
        >
          <MS name="add" className="text-[16px]" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))}
          className="rounded p-1 text-slate-400 hover:bg-surface-hover hover:text-white"
          title="Zoom Out"
        >
          <MS name="remove" className="text-[16px]" />
        </button>
        <button
          onClick={resetView}
          className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-300 hover:bg-surface-hover hover:text-white"
          title="Reset Canvas View"
        >
          Reset
        </button>
      </div>

      {/* Legend Badge */}
      <div className="absolute left-2 top-2 flex flex-wrap items-center gap-2 rounded border border-outline bg-surface-lowest/90 px-2 py-1 font-mono text-[10px] text-slate-400 backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Incident Source
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 bg-rose-500" /> Modeled Attack Vector
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 bg-slate-600" /> Propagation Allowed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border border-amber-400 bg-amber-950" /> Quarantined
        </span>
      </div>
    </div>
  );
}
