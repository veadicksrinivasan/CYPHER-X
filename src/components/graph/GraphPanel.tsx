import { useState, useRef, useMemo } from "react";
import type { InfrastructureGraphData, InfraNode } from "@/data/types";
import { MS } from "@/components/shared";
import { cn } from "@/lib/utils";

interface GraphHighlight {
  sourceId: string;
  reachableIds: string[];
  isolatedIds: string[];
  highlightEdges: Set<string>;
}

interface GraphPanelProps {
  graph: InfrastructureGraphData;
  highlight: GraphHighlight;
  onSelectNode?: (id: string) => void;
  className?: string;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 68;

const componentIcons: Record<string, string> = {
  workstation: "desktop_windows",
  gateway: "router",
  service: "dns",
  server: "storage",
  database: "database",
  storage: "cloud_sync",
  monitoring: "monitoring",
};

export function GraphPanel({ graph, highlight, onSelectNode, className }: GraphPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const { sourceId, reachableIds, isolatedIds, highlightEdges } = highlight;
  const reachableSet = useMemo(() => new Set(reachableIds), [reachableIds]);
  const isolatedSet = useMemo(() => new Set(isolatedIds), [isolatedIds]);

  // Map nodes by id for quick coordinate lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, InfraNode>();
    for (const node of graph.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [graph.nodes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with left click on background
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
    >
      {/* Background Matrix Grid */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-20">
        <defs>
          <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#26334d" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1" fill="#22d3ee" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern)" />
      </svg>

      {/* Interactive Canvas */}
      <svg
        viewBox="0 0 1140 540"
        className="h-full w-full transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <defs>
          {/* Arrow markers */}
          <marker
            id="arrow-attack"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
          </marker>
          <marker
            id="arrow-standard"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" opacity="0.8" />
          </marker>
          <marker
            id="arrow-context"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 8 5 L 0 8 z" fill="#64748b" opacity="0.6" />
          </marker>

          {/* Glow filter */}
          <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. EDGES */}
        <g className="edges-layer">
          {graph.edges.map((edge) => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return null;

            const edgeKey = `${edge.from}->${edge.to}`;
            const isAttackPath = highlightEdges.has(edgeKey);
            const isIsolatedFrom = isolatedSet.has(edge.from);
            const isIsolatedTo = isolatedSet.has(edge.to);
            const isCut = isIsolatedFrom || isIsolatedTo;

            // Compute connection points: center-right of source to center-left of target
            const x1 = fromNode.position.x + NODE_WIDTH;
            const y1 = fromNode.position.y + NODE_HEIGHT / 2;
            const x2 = toNode.position.x;
            const y2 = toNode.position.y + NODE_HEIGHT / 2;

            // Curvature control points
            const dx = Math.max(40, (x2 - x1) * 0.5);
            const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            if (isAttackPath && !isCut) {
              return (
                <g key={edge.id} className="edge-attack">
                  {/* Glowing background path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="4"
                    opacity="0.4"
                    filter="url(#glow-rose)"
                  />
                  {/* Active animated attack edge */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                    markerEnd="url(#arrow-attack)"
                  />
                </g>
              );
            }

            if (!edge.traversable || isCut) {
              return (
                <path
                  key={edge.id}
                  d={pathD}
                  fill="none"
                  stroke={isCut ? "#e11d48" : "#475569"}
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  opacity={isCut ? 0.35 : 0.45}
                  markerEnd="url(#arrow-context)"
                />
              );
            }

            return (
              <path
                key={edge.id}
                d={pathD}
                fill="none"
                stroke="#334155"
                strokeWidth="1.8"
                opacity="0.75"
                markerEnd="url(#arrow-standard)"
                className="hover:stroke-cyan-400"
              />
            );
          })}
        </g>

        {/* 2. NODES */}
        <g className="nodes-layer">
          {graph.nodes.map((node) => {
            const isSource = node.id === sourceId;
            const isReachable = reachableSet.has(node.id);
            const isIsolated = isolatedSet.has(node.id);
            const isHovered = hoveredNodeId === node.id;

            let borderColor = "#26334d";
            let bgFill = "#161b2b";
            let glow = false;

            if (isSource) {
              borderColor = "#f43f5e";
              bgFill = "#24121a";
              glow = true;
            } else if (isIsolated) {
              borderColor = "#d97706";
              bgFill = "#1c1813";
            } else if (isReachable) {
              borderColor = node.criticality === "critical" ? "#f43f5e" : "#fbbf24";
              bgFill = node.criticality === "critical" ? "#20131b" : "#1c1a16";
            }

            const iconName = componentIcons[node.componentType] ?? "dns";

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
                  className="transition-colors"
                />

                {/* Source Ping Indicator */}
                {isSource && (
                  <circle
                    cx="14"
                    cy="14"
                    r="8"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Node Header: Type Icon + Label */}
                <foreignObject x="8" y="6" width={NODE_WIDTH - 16} height="26">
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
                        "truncate font-mono text-[11px] font-semibold tracking-tight",
                        isSource ? "text-white" : isIsolated ? "text-amber-200 line-through" : "text-slate-100",
                      )}
                      title={node.label}
                    >
                      {node.label}
                    </span>
                  </div>
                </foreignObject>

                {/* Node Subtitle: IP & Zone */}
                <foreignObject x="8" y="30" width={NODE_WIDTH - 16} height="16">
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span className="font-mono">{node.ipAddress}</span>
                    <span className="truncate opacity-80">{node.zone}</span>
                  </div>
                </foreignObject>

                {/* Node Footer: Badges */}
                <foreignObject x="8" y="47" width={NODE_WIDTH - 16} height="16">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded px-1 py-0.2 font-mono text-[8px] font-bold uppercase",
                        node.criticality === "critical"
                          ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                          : node.criticality === "high"
                            ? "bg-amber-950 text-amber-300 border border-amber-500/40"
                            : "bg-surface-lowest text-slate-400 border border-outline",
                      )}
                    >
                      {node.criticality}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[8px] text-slate-400">
                      {isSource ? (
                        <span className="text-rose-400 font-semibold">SOURCE</span>
                      ) : isIsolated ? (
                        <span className="text-amber-400 font-semibold">ISOLATED</span>
                      ) : isReachable ? (
                        <span className="text-rose-300">EXPOSED</span>
                      ) : (
                        <span>{node.status}</span>
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
                                : node.status === "healthy"
                                  ? "bg-teal-400"
                                  : "bg-amber-400",
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
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-outline bg-surface-low/90 p-1 shadow-md backdrop-blur-sm">
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

      {/* Top Legend */}
      <div className="absolute left-2 top-2 flex flex-wrap items-center gap-2 rounded border border-outline bg-surface-lowest/90 px-2 py-1 font-mono text-[10px] text-slate-400 backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" /> Incident Origin
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 bg-rose-500" /> Attack Vector
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 bg-slate-600" /> Traversable Link
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border border-amber-400 bg-amber-950" /> Isolated
        </span>
      </div>
    </div>
  );
}

