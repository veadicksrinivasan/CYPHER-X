import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/state/app-store";
import { getNodeById, getNodeLabel, type EnrichedNode } from "@/data/infrastructure";
import { GraphPanel } from "@/components/graph/GraphPanel";
import { MS, MetricTile } from "@/components/shared";
import { cn } from "@/lib/utils";

interface InfrastructureSearch {
  node?: string;
}

export const Route = createFileRoute("/infrastructure")({
  validateSearch: (search: Record<string, unknown>): InfrastructureSearch => {
    return {
      node: typeof search.node === "string" ? search.node : undefined,
    };
  },
  component: InfrastructurePage,
});

function InfrastructurePage() {
  const search = Route.useSearch();
  const { graph, sourceNode, blastBefore, isolatedIds, isolateNode } = useApp();

  const [selectedId, setSelectedId] = useState<string>(search.node ?? sourceNode.id);
  const [filterType, setFilterType] = useState<string>("all");

  const selectedNode = getNodeById(graph, selectedId) ?? (graph.nodes[0] as EnrichedNode);

  // Inbound edges (where target === selectedId)
  const inboundEdges = graph.edges.filter((e) => e.target === selectedId);
  // Outbound edges (where source === selectedId)
  const outboundEdges = graph.edges.filter((e) => e.source === selectedId);

  const isIsolated = isolatedIds.includes(selectedId);
  const isReachable = blastBefore.reachableNodeIds.includes(selectedId);
  const isSource = selectedId === sourceNode.id;

  const filteredNodes = (graph.nodes as EnrichedNode[]).filter((n) =>
    filterType === "all" ? true : n.type === filterType,
  );

  const highlightEdgeKeys = new Set<string>();
  blastBefore.paths.forEach((p) => {
    for (let i = 0; i < p.nodeIds.length - 1; i++) {
      highlightEdgeKeys.add(`${p.nodeIds[i]}->${p.nodeIds[i + 1]}`);
    }
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner */}
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
              <MS name="hub" className="text-[20px]" />
            </span>
            <h1 className="text-[16px] font-bold text-white">Infrastructure Dependency Topology</h1>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Interactive system map detailing component relationships, network tiers, and propagation authorization rules
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {["all", "server", "application", "database", "workstation", "api", "account"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] uppercase transition-colors",
                filterType === t
                  ? "border border-cyan-500/40 bg-cyan-950 font-bold text-cyan-300"
                  : "text-slate-400 hover:bg-surface-low hover:text-slate-200",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid: Interactive Graph + Node Detail Inspector */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Graph Area */}
        <div className="flex flex-col rounded-lg border border-outline bg-surface p-3 shadow-sm lg:col-span-8">
          <div className="mb-2 flex items-center justify-between border-b border-outline pb-2">
            <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              <span>ACTIVE TOPOLOGY:</span>
              <span className="font-bold text-white">{graph.nodes.length} Components</span>
              <span className="text-outline">|</span>
              <span>{graph.edges.length} Directed Links</span>
            </div>
            <div className="font-mono text-[10px] text-cyan-400">Click any node to inspect &amp; isolate</div>
          </div>

          <GraphPanel
            graph={graph}
            highlight={{
              sourceId: sourceNode.id,
              reachableIds: blastBefore.reachableNodeIds,
              isolatedIds,
              highlightEdges: highlightEdgeKeys,
            }}
            onSelectNode={(id) => setSelectedId(id)}
            height={480}
            className="rounded-lg border border-outline"
          />
        </div>

        {/* Node Inspector Sidebar */}
        <div className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-3 shadow-sm lg:col-span-4">
          <div className="flex items-center justify-between border-b border-outline pb-2">
            <div>
              <span className="font-mono text-[10px] font-bold text-cyan-400">{selectedNode.id}</span>
              <h2 className="text-[15px] font-bold text-white leading-tight">{selectedNode.label}</h2>
            </div>
            <span
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                selectedNode.isCritical
                  ? "border border-rose-500/50 bg-rose-950 text-rose-300"
                  : "border border-outline bg-surface-low text-slate-300",
              )}
            >
              {selectedNode.isCritical ? "CRITICAL TIER-1" : "STANDARD"}
            </span>
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded border border-outline bg-surface-low p-2">
              <span className="font-mono text-[9px] uppercase text-slate-400">Component Type</span>
              <div className="mt-0.5 font-mono font-semibold uppercase text-slate-200">{selectedNode.type}</div>
            </div>
            <div className="rounded border border-outline bg-surface-low p-2">
              <span className="font-mono text-[9px] uppercase text-slate-400">Network Zone</span>
              <div className="mt-0.5 font-mono text-slate-200">{selectedNode.zone}</div>
            </div>
            <div className="rounded border border-outline bg-surface-low p-2">
              <span className="font-mono text-[9px] uppercase text-slate-400">IP Address</span>
              <div className="mt-0.5 font-mono text-slate-200">{selectedNode.ipAddress}</div>
            </div>
            <div className="rounded border border-outline bg-surface-low p-2">
              <span className="font-mono text-[9px] uppercase text-slate-400">Simulation Status</span>
              <div className="mt-0.5 font-mono font-semibold">
                {isSource ? (
                  <span className="text-rose-400">INCIDENT SOURCE</span>
                ) : isIsolated ? (
                  <span className="text-amber-400">QUARANTINED</span>
                ) : isReachable ? (
                  <span className="text-rose-300">EXPOSED IN BLAST</span>
                ) : (
                  <span className="text-teal-400">NOMINAL</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="rounded border border-outline bg-surface-low p-2.5 text-[11px]">
            <span className="font-mono text-[9px] uppercase font-bold text-slate-400">Description &amp; Role</span>
            <p className="mt-1 leading-relaxed text-slate-300">{selectedNode.description}</p>
          </div>

          {/* Inbound & Outbound Relationships */}
          <div className="flex flex-col gap-2">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
                Inbound Ingress ({inboundEdges.length})
              </span>
              <div className="mt-1 flex flex-col gap-1 max-h-24 overflow-y-auto">
                {inboundEdges.map((e) => (
                  <div
                    key={`${e.source}-${e.target}`}
                    onClick={() => setSelectedId(e.source)}
                    className="flex items-center justify-between rounded border border-outline bg-surface-lowest px-2 py-1 font-mono text-[10px] cursor-pointer hover:bg-surface-low"
                  >
                    <span className="text-cyan-400">{getNodeLabel(e.source)}</span>
                    <span className={cn("text-[8px] font-bold", e.allowsPropagation ? "text-rose-400" : "text-slate-500")}>
                      {e.allowsPropagation ? "PROPAGATES" : "BLOCKED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
                Outbound Dependencies ({outboundEdges.length})
              </span>
              <div className="mt-1 flex flex-col gap-1 max-h-24 overflow-y-auto">
                {outboundEdges.map((e) => (
                  <div
                    key={`${e.source}-${e.target}`}
                    onClick={() => setSelectedId(e.target)}
                    className="flex items-center justify-between rounded border border-outline bg-surface-lowest px-2 py-1 font-mono text-[10px] cursor-pointer hover:bg-surface-low"
                  >
                    <span className="text-cyan-400">{getNodeLabel(e.target)}</span>
                    <span className={cn("text-[8px] font-bold", e.allowsPropagation ? "text-rose-400" : "text-slate-500")}>
                      {e.allowsPropagation ? "PROPAGATES" : "BLOCKED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-auto border-t border-outline pt-2">
            <button
              onClick={() => isolateNode(selectedNode.id)}
              disabled={isIsolated}
              className={cn(
                "w-full rounded py-2 font-mono text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                isIsolated
                  ? "bg-surface-low text-slate-500 border border-outline cursor-not-allowed"
                  : "bg-rose-500 text-white hover:bg-rose-600 shadow-md",
              )}
            >
              <MS name="security" className="text-[16px]" />
              {isIsolated ? "Node Already Isolated" : `Simulate Quarantine of [${selectedNode.id}]`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

