import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/state/app-store";
import { getNodeById, getNodeLabel, type EnrichedNode } from "@/data/infrastructure";
import { MS, MetricTile } from "@/components/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/blast-radius")({
  component: BlastRadiusPage,
});

function BlastRadiusPage() {
  const navigate = useNavigate();
  const { graph, selectedScenario, sourceNode, blastBefore, blastAfter, hasSimulated } = useApp();

  const activeResult = blastAfter ?? blastBefore;

  // Group paths by destination node
  const pathsByDest = new Map<string, string[][]>();
  activeResult.paths.forEach((p) => {
    const dest = p.nodeIds[p.nodeIds.length - 1];
    const existing = pathsByDest.get(dest) ?? [];
    existing.push(p.nodeIds as string[]);
    pathsByDest.set(dest, existing);
  });

  // Calculate hop distance for each reachable node
  const nodeDistances = new Map<string, number>();
  activeResult.paths.forEach((p) => {
    const dest = p.nodeIds[p.nodeIds.length - 1];
    const hops = p.nodeIds.length - 1;
    const current = nodeDistances.get(dest) ?? Infinity;
    if (hops < current) {
      nodeDistances.set(dest, hops);
    }
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner */}
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
              <MS name="polyline" className="text-[20px]" />
            </span>
            <h1 className="text-[16px] font-bold text-white">Blast-Radius Matrix &amp; Path Traversal</h1>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Exhaustive enumeration of all simple propagation paths discovered by Breadth-First Search (BFS)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/containment" })}
            className="flex items-center gap-1 rounded bg-cyan-500 px-3.5 py-1.5 font-mono text-[11px] font-bold text-slate-950 hover:bg-cyan-400 shadow-md transition-colors"
          >
            <MS name="security" className="text-[16px]" />
            Simulate Mitigation
          </button>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricTile
          label="Incident Origin"
          value={sourceNode.label}
          note={`ID: ${sourceNode.id} • ${sourceNode.zone}`}
          icon="router"
          valueClass="text-rose-400 text-[14px]"
        />
        <MetricTile
          label="Structurally Reachable"
          value={`${activeResult.reachableNodeIds.length} Assets`}
          note={hasSimulated ? "Post-containment view" : "Baseline posture"}
          icon="hub"
          valueClass="text-slate-100"
        />
        <MetricTile
          label="Enumerated Simple Paths"
          value={`${activeResult.paths.length} Vectors`}
          note="Cycle-safe traversal"
          icon="timeline"
          valueClass="text-cyan-400"
        />
        <MetricTile
          label="Critical Tier-1 at Risk"
          value={`${activeResult.criticalNodesReached.length} Entities`}
          note={activeResult.criticalNodesReached.map(getNodeLabel).join(", ") || "None"}
          icon="warning"
          valueClass="text-amber-400"
        />
      </section>

      {/* Reachability Matrix Table */}
      <div className="rounded-lg border border-outline bg-surface p-3.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between border-b border-outline pb-2">
          <h2 className="text-[14px] font-bold text-white">Reachable Asset Traversal Matrix</h2>
          <span className="font-mono text-[10px] text-slate-400">
            {activeResult.reachableNodeIds.length} components reachable from {sourceNode.id}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-outline font-mono text-[10px] text-slate-400">
                <th className="px-2 py-2">COMPONENT</th>
                <th className="px-2 py-2">TYPE</th>
                <th className="px-2 py-2">ZONE</th>
                <th className="px-2 py-2">MIN HOPS</th>
                <th className="px-2 py-2">CRITICALITY</th>
                <th className="px-2 py-2">AVAILABLE PATHS</th>
                <th className="px-2 py-2 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {activeResult.reachableNodeIds.map((id) => {
                const node = getNodeById(graph, id);
                const hops = nodeDistances.get(id) ?? 1;
                const paths = pathsByDest.get(id) ?? [];
                return (
                  <tr key={id} className="hover:bg-surface-low transition-colors font-mono">
                    <td className="px-2 py-2 font-semibold text-white">
                      {node ? node.label : id} <span className="text-[10px] text-slate-400">[{id}]</span>
                    </td>
                    <td className="px-2 py-2 text-[11px] uppercase text-slate-300">{node?.type ?? "server"}</td>
                    <td className="px-2 py-2 text-[11px] text-slate-400">{node?.zone ?? "Internal"}</td>
                    <td className="px-2 py-2 text-cyan-400 font-bold">{hops} hop{hops > 1 ? "s" : ""}</td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                          node?.isCritical
                            ? "bg-rose-950 text-rose-300 border border-rose-500/40"
                            : "bg-surface-low text-slate-400 border border-outline",
                        )}
                      >
                        {node?.isCritical ? "CRITICAL" : "STANDARD"}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-[10px] text-slate-300">
                      {paths.length} simple route{paths.length > 1 ? "s" : ""}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => navigate({ to: "/infrastructure", search: { node: id } })}
                        className="rounded border border-outline bg-surface-lowest px-2 py-1 text-[10px] text-cyan-400 hover:bg-surface-hover"
                      >
                        Inspect on Map
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Simple Path Explorer */}
      <div className="rounded-lg border border-outline bg-surface p-3.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between border-b border-outline pb-2">
          <div>
            <h2 className="text-[14px] font-bold text-white">Complete Simple Paths Enumeration</h2>
            <p className="text-[11px] text-slate-400">
              Ordered sequence of node IDs visited along each simple path (source -&gt; intermediate -&gt; target)
            </p>
          </div>
          <span className="font-mono text-[10px] text-cyan-400">{activeResult.paths.length} total paths</span>
        </div>

        <div className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
          {activeResult.paths.map((path, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded border border-outline/70 bg-surface-lowest p-2 font-mono text-[11px]"
            >
              <span className="w-8 shrink-0 font-bold text-cyan-400">#{idx + 1}</span>
              <div className="flex flex-wrap items-center gap-1.5 text-slate-200">
                {path.nodeIds.map((id, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5",
                        i === 0
                          ? "bg-rose-950 text-rose-300 border border-rose-500/50 font-bold"
                          : i === path.nodeIds.length - 1
                            ? "bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold"
                            : "bg-surface-low text-slate-300 border border-outline",
                      )}
                    >
                      {getNodeLabel(id)}
                    </span>
                    {i < path.nodeIds.length - 1 && <span className="text-slate-500">→</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

