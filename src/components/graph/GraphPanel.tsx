import { useState, useRef, useMemo, useEffect } from "react";
import type { InfrastructureGraph, InfrastructureNode, DependencyEdge } from "@/types/infrastructure";
import type { EnrichedNode } from "@/data/infrastructure";
import { MS } from "@/components/shared";
import { cn } from "@/lib/utils";
import { useApp } from "@/state/app-store";
import { toast } from "sonner";

interface GraphHighlight {
  sourceId: string;
  reachableIds: readonly string[];
  isolatedIds: readonly string[];
  highlightEdges: Set<string>;
}

interface GraphPanelProps {
  graph: InfrastructureGraph;
  highlight: GraphHighlight;
  selectedNodeId?: string | null;
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

export function GraphPanel({
  graph,
  highlight,
  selectedNodeId,
  onSelectNode,
  className,
  height = 460,
}: GraphPanelProps) {
  const { connectServerByUrl } = useApp();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [targetNodeId, setTargetNodeId] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [urlError, setUrlError] = useState("");

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

  useEffect(() => {
    if (!targetNodeId && graph.nodes.length > 0) {
      setTargetNodeId(graph.nodes[0].id);
    }
  }, [graph.nodes, targetNodeId]);

  const handleConnectSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError("Please enter a valid server URL or hostname");
      return;
    }

    try {
      const newNode = connectServerByUrl({
        url: trimmed,
        label: labelInput.trim() || undefined,
        targetNodeId: targetNodeId || graph.nodes[0]?.id,
        isCritical,
      });

      toast.success(`Server Connected: ${newNode.label} (${newNode.ipAddress})`);
      onSelectNode?.(newNode.id);
      setIsConnectModalOpen(false);
      setUrlInput("");
      setLabelInput("");
      setUrlError("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect server";
      setUrlError(msg);
    }
  };

  // Center on selected node if changed externally
  useEffect(() => {
    if (selectedNodeId && nodeMap.has(selectedNodeId)) {
      const node = nodeMap.get(selectedNodeId)!;
      // Soft center calculation
      const targetX = 590 - (node.position.x + NODE_WIDTH / 2);
      const targetY = 270 - (node.position.y + NODE_HEIGHT / 2);
      setPan({ x: Math.round(targetX * 0.3), y: Math.round(targetY * 0.3) });
    }
  }, [selectedNodeId, nodeMap]);

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

  const fitView = () => {
    setZoom(0.92);
    setPan({ x: 10, y: 15 });
  };

  const activeNode = selectedNodeId
    ? nodeMap.get(selectedNodeId)
    : hoveredNodeId
      ? nodeMap.get(hoveredNodeId)
      : null;

  return (
    <div
      ref={containerRef}
      className={cn("relative select-none overflow-hidden bg-[#0a0e19] rounded-lg border border-[#1e2a42]", className)}
      style={{ height: height, cursor: isDragging ? "grabbing" : "grab" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Subtle Matrix Grid */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-25">
        <defs>
          <pattern id="grid-pattern-soc" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1a2438" strokeWidth="0.75" />
            <circle cx="0" cy="0" r="0.8" fill="#38bdf8" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-pattern-soc)" />
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
            id="marker-attack-clean"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#ef4444" />
          </marker>
          <marker
            id="marker-nominal-clean"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 8 5 L 0 8 z" fill="#334155" />
          </marker>
          <marker
            id="marker-blocked-clean"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 2 L 7 5 L 0 8 z" fill="#475569" opacity="0.4" />
          </marker>
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
                <g key={`${edge.source}-${edge.target}`} className="edge-attack">
                  {/* Subtle red lateral path */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                    markerEnd="url(#marker-attack-clean)"
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
                  stroke={isCut ? "#991b1b" : "#334155"}
                  strokeWidth="1.2"
                  strokeDasharray="4 4"
                  opacity={isCut ? 0.35 : 0.45}
                  markerEnd="url(#marker-blocked-clean)"
                />
              );
            }

            return (
              <path
                key={`${edge.source}-${edge.target}`}
                d={pathD}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1.5"
                opacity="0.85"
                markerEnd="url(#marker-nominal-clean)"
                className="hover:stroke-[#38bdf8] transition-colors"
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
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;

            // Restrained Professional Color Rules
            let borderColor = "#1e293b";
            let bgFill = "#0e1322";
            let statusDotColor = "#10b981"; // Green safe / nominal
            let statusText = "NOMINAL";

            if (isSelected) {
              borderColor = "#38bdf8"; // Sky-400
              bgFill = "#0f1d33";
            } else if (isSource) {
              borderColor = "#ef4444"; // Red
              bgFill = "#1f1016";
              statusDotColor = "#ef4444";
              statusText = "ORIGIN";
            } else if (isIsolated) {
              borderColor = "#d97706"; // Amber
              bgFill = "#1a1510";
              statusDotColor = "#f59e0b";
              statusText = "ISOLATED";
            } else if (isReachable) {
              borderColor = node.isCritical ? "#ef4444" : "#f59e0b"; // Red or Amber
              bgFill = node.isCritical ? "#1c1119" : "#191612";
              statusDotColor = node.isCritical ? "#ef4444" : "#f59e0b";
              statusText = node.isCritical ? "EXPOSED TIER-1" : "EXPOSED";
            }

            const iconName = typeIcons[node.type] ?? "dns";

            return (
              <g
                key={node.id}
                transform={`translate(${node.position.x}, ${node.position.y})`}
                className="cursor-pointer transition-all duration-150"
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
                  rx="5"
                  ry="5"
                  fill={bgFill}
                  stroke={borderColor}
                  strokeWidth={isSelected ? 2 : isSource ? 2 : isHovered ? 1.5 : 1}
                />

                {/* Selected Accent Bar */}
                {isSelected && (
                  <rect
                    x="0"
                    y="0"
                    width="4"
                    height={NODE_HEIGHT}
                    rx="2"
                    ry="2"
                    fill="#38bdf8"
                  />
                )}

                {/* Header: Type Icon + Label */}
                <foreignObject x="8" y="7" width={NODE_WIDTH - 16} height="24">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span
                      className={cn(
                        "material-symbols-outlined text-[15px]",
                        isSource
                          ? "text-red-400"
                          : isIsolated
                            ? "text-amber-400"
                            : isSelected
                              ? "text-sky-300"
                              : isReachable
                                ? "text-amber-400"
                                : "text-slate-400",
                      )}
                    >
                      {iconName}
                    </span>
                    <span
                      className={cn(
                        "truncate font-mono text-[11px] font-semibold tracking-tight",
                        isSource ? "text-red-200" : isIsolated ? "text-amber-300 line-through" : isSelected ? "text-white" : "text-slate-200",
                      )}
                      title={node.label}
                    >
                      {node.label}
                    </span>
                  </div>
                </foreignObject>

                {/* Subtitle: IP & Zone */}
                <foreignObject x="8" y="29" width={NODE_WIDTH - 16} height="16">
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span className="text-slate-300 font-semibold">{node.ipAddress}</span>
                    <span className="truncate opacity-75">{node.zone}</span>
                  </div>
                </foreignObject>

                {/* Footer: Criticality & Status Dot */}
                <foreignObject x="8" y="47" width={NODE_WIDTH - 16} height="18">
                  <div className="flex items-center justify-between font-mono text-[8px]">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.2 font-bold uppercase",
                        node.isCritical
                          ? "bg-red-950/70 text-red-300 border border-red-500/30"
                          : "bg-[#141b2c] text-slate-400 border border-[#222f46]",
                      )}
                    >
                      {node.isCritical ? "CRITICAL" : node.type}
                    </span>
                    <span className="flex items-center gap-1 text-[8px] font-semibold text-slate-300">
                      <span style={{ color: statusDotColor }}>{statusText}</span>
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: statusDotColor }}
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
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded border border-[#1f2b42] bg-[#0c1220]/95 p-1 shadow-md backdrop-blur-sm">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2))}
          className="rounded p-1 text-slate-400 hover:bg-[#1a243a] hover:text-white"
          title="Zoom In"
        >
          <MS name="add" className="text-[15px]" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.6))}
          className="rounded p-1 text-slate-400 hover:bg-[#1a243a] hover:text-white"
          title="Zoom Out"
        >
          <MS name="remove" className="text-[15px]" />
        </button>
        <button
          onClick={fitView}
          className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-300 hover:bg-[#1a243a] hover:text-white"
          title="Fit Graph to View"
        >
          Fit
        </button>
        <button
          onClick={resetView}
          className="rounded px-1.5 py-0.5 font-mono text-[10px] text-slate-300 hover:bg-[#1a243a] hover:text-white"
          title="Reset Zoom"
        >
          Reset
        </button>
      </div>

      {/* Restrained Top-Left Legend */}
      <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-2 rounded border border-[#1f2b42] bg-[#0c1220]/90 px-2.5 py-1 font-mono text-[10px] text-slate-400 backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Origin
        </span>
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-2.5 bg-red-500" /> Lateral Vector
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> At Risk
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Nominal
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full border border-sky-400 bg-sky-950" /> Selected
        </span>
      </div>

      {/* Left Side: Plus (+) Button for connecting a server by URL */}
      <div className="absolute left-2.5 top-11 z-10">
        <button
          onClick={() => {
            setIsConnectModalOpen(true);
            setUrlError("");
          }}
          className="flex items-center gap-1.5 rounded border border-cyan-500/50 bg-[#0c1220]/95 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-300 shadow-md backdrop-blur-sm hover:border-cyan-400 hover:bg-cyan-950/80 transition-all group"
          title="Connect a server to the topology by URL"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded bg-cyan-500 text-slate-950 font-black text-[13px] leading-none group-hover:bg-cyan-400 transition-colors">
            +
          </span>
          <span>Connect Server by URL</span>
        </button>
      </div>

      {/* Active Selection Info Overlay (HUD on bottom left) */}
      {activeNode && (
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 rounded border border-[#1f2b42] bg-[#0c1220]/95 px-3 py-1.5 font-mono text-[11px] text-slate-300 backdrop-blur-sm shadow-md">
          <span className="font-semibold text-white">{activeNode.label}</span>
          <span className="text-slate-500">|</span>
          <span className="text-sky-400 font-bold">{activeNode.ipAddress}</span>
          <span className="text-slate-500">|</span>
          <span className="text-[10px] text-slate-400">{activeNode.zone}</span>
        </div>
      )}

      {/* Modal: Connect Server by URL */}
      {isConnectModalOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => {
            setIsConnectModalOpen(false);
            setUrlInput("");
            setUrlError("");
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-cyan-500/40 bg-[#0d1424] p-4 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1f2b42] pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <MS name="add_link" className="text-[16px]" />
                </span>
                <h3 className="font-mono text-[13px] font-bold text-white uppercase tracking-wider">
                  Connect Server via URL
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsConnectModalOpen(false);
                  setUrlInput("");
                  setUrlError("");
                }}
                className="text-slate-400 hover:text-white font-mono text-[14px]"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Provide a server URL or host endpoint to connect a new server node to the left perimeter of the infrastructure graph.
            </p>

            <form onSubmit={handleConnectSubmit} className="flex flex-col gap-3">
              {/* URL Input */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase font-bold text-slate-300">
                  Server URL or Hostname <span className="text-cyan-400">*</span>
                </label>
                <div className="flex items-center rounded border border-[#222f46] bg-[#070b14] px-2.5 py-1.5 focus-within:border-cyan-400">
                  <MS name="link" className="text-[16px] text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      if (urlError) setUrlError("");
                    }}
                    placeholder="https://edge-server-02.internal:8443"
                    className="w-full bg-transparent font-mono text-[11px] text-white placeholder:text-slate-600 focus:outline-none"
                    autoFocus
                  />
                </div>
                {urlError && <span className="text-[10px] text-rose-400 font-mono">{urlError}</span>}
              </div>

              {/* Quick URL Suggestions */}
              <div>
                <span className="font-mono text-[9px] text-slate-500 uppercase block mb-1">
                  Quick Examples:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    "https://edge-proxy-02.dmz.net:8443",
                    "https://api.gateway.internal",
                    "http://10.0.1.75:8080",
                  ].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => {
                        setUrlInput(sample);
                        setUrlError("");
                      }}
                      className="rounded bg-[#141d30] border border-[#22314d] px-2 py-0.5 font-mono text-[9px] text-cyan-300 hover:border-cyan-400 transition-colors"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              {/* Server Label (Optional) */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase font-bold text-slate-300">
                  Display Label (Optional)
                </label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="e.g. Edge Ingress Gateway"
                  className="rounded border border-[#222f46] bg-[#070b14] px-2.5 py-1.5 font-mono text-[11px] text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Target Node to Connect to */}
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[10px] uppercase font-bold text-slate-300">
                  Connect / Link To Existing Node
                </label>
                <select
                  value={targetNodeId}
                  onChange={(e) => setTargetNodeId(e.target.value)}
                  className="rounded border border-[#222f46] bg-[#070b14] px-2.5 py-1.5 font-mono text-[11px] text-cyan-300 focus:border-cyan-400 focus:outline-none cursor-pointer"
                >
                  {(graph.nodes as EnrichedNode[]).map((n) => (
                    <option key={n.id} value={n.id} className="bg-[#0c1220] text-slate-200">
                      {n.label} [{n.id}] — {n.zone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Critical Tier Toggle */}
              <div className="flex items-center justify-between rounded border border-[#1b263b] bg-[#070b14] p-2">
                <div>
                  <span className="font-mono text-[11px] font-semibold text-slate-200 block">Critical Tier-1 Asset</span>
                  <span className="text-[10px] text-slate-400">Classify as mission-critical high-impact target</span>
                </div>
                <input
                  type="checkbox"
                  checked={isCritical}
                  onChange={(e) => setIsCritical(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-[#1f2b42] pt-3 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsConnectModalOpen(false);
                    setUrlInput("");
                    setUrlError("");
                  }}
                  className="rounded border border-[#222f46] bg-[#0f172a] px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:bg-[#1a253e] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded bg-cyan-500 px-3.5 py-1.5 font-mono text-[11px] font-bold text-slate-950 hover:bg-cyan-400 shadow-md transition-colors"
                >
                  <MS name="add_link" className="text-[16px]" />
                  Connect Server (+)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
