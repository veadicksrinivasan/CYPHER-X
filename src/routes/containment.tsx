import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/state/app-store";
import { getNodeLabel, type EnrichedNode } from "@/data/infrastructure";
import { GraphPanel } from "@/components/graph/GraphPanel";
import { MS, MetricTile } from "@/components/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/containment")({
  component: ContainmentPage,
});

function ContainmentPage() {
  const navigate = useNavigate();
  const {
    graph,
    selectedScenario,
    sourceNode,
    blastBefore,
    blastAfter,
    comparison,
    hasSimulated,
    lastIsolatedId,
    isolatedIds,
    isolateNode,
    resetScenario,
  } = useApp();

  const [targetId, setTargetId] = useState<string>("vpn-gw-01");

  const beforeCount = blastBefore.reachableNodeIds.length;
  const afterCount = blastAfter ? blastAfter.reachableNodeIds.length : beforeCount;
  const mitigatedCount = beforeCount - afterCount;
  const reductionPercent = Math.max(0, Math.round((mitigatedCount / Math.max(beforeCount, 1)) * 100));

  const mitigatedNodes = blastBefore.reachableNodeIds.filter(
    (id) => blastAfter && !blastAfter.reachableNodeIds.includes(id),
  );
  const remainingNodes = blastAfter ? blastAfter.reachableNodeIds : blastBefore.reachableNodeIds;

  const highlightEdgeKeys = new Set<string>();
  const activePaths = blastAfter ? blastAfter.paths : blastBefore.paths;
  activePaths.forEach((p) => {
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
            <span className="flex h-8 w-8 items-center justify-center rounded border border-rose-500/40 bg-rose-950/60 text-rose-300">
              <MS name="security" className="text-[20px]" />
            </span>
            <h1 className="text-[16px] font-bold text-white">Containment Sandbox &amp; Adversary Emulation</h1>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Simulate defensive host quarantine and network segmentation to measure attack path collapse before live execution
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded border border-outline bg-surface-low px-2 py-1">
            <span className="mr-2 font-mono text-[10px] text-slate-400">TARGET:</span>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="bg-transparent font-mono text-[11px] font-semibold text-cyan-300 focus:outline-none cursor-pointer"
            >
              {(graph.nodes as EnrichedNode[]).map((n) => (
                <option key={n.id} value={n.id} className="bg-surface-low text-slate-100">
                  {n.label} [{n.id}]
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => isolateNode(targetId)}
            className="flex items-center gap-1 rounded bg-rose-500 px-3.5 py-1.5 font-mono text-[11px] font-bold text-white shadow-md hover:bg-rose-600 transition-colors"
          >
            <MS name="power_settings_new" className="text-[16px]" />
            Simulate Isolation
          </button>

          <button
            onClick={resetScenario}
            className="rounded border border-outline bg-surface-low px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:bg-surface-hover transition-colors"
          >
            Reset Simulation
          </button>
        </div>
      </section>

      {/* Comparison Metrics Header */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricTile
          label="Baseline Reachable"
          value={`${beforeCount} Assets`}
          note={`${blastBefore.criticalNodesReached.length} Tier-1 at risk`}
          icon="warning"
          valueClass="text-rose-400"
        />
        <MetricTile
          label="Post-Isolation Reachable"
          value={hasSimulated ? `${afterCount} Assets` : "Awaiting Simulation"}
          note={hasSimulated ? `Mitigated ${mitigatedCount} components` : "Click 'Simulate Isolation'"}
          icon="check_circle"
          valueClass={hasSimulated ? "text-teal-400" : "text-slate-400"}
        />
        <MetricTile
          label="Threat Perimeter Reduced"
          value={hasSimulated ? `${reductionPercent}%` : "0%"}
          note={hasSimulated ? `${mitigatedNodes.length} vectors eliminated` : "Unmitigated baseline"}
          icon="trending_down"
          valueClass={hasSimulated ? "text-cyan-400" : "text-slate-400"}
        />
        <MetricTile
          label="Quarantined Nodes"
          value={`${isolatedIds.length} Isolated`}
          note={isolatedIds.map(getNodeLabel).join(", ") || "None"}
          icon="shield"
          valueClass="text-amber-400"
        />
      </section>

      {/* Main Grid: Containment Graph + Before-and-After Analysis */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Topology Graph Showing Cut Links */}
        <div className="flex flex-col rounded-lg border border-outline bg-surface p-3 shadow-sm lg:col-span-7">
          <div className="mb-2 flex items-center justify-between border-b border-outline pb-2">
            <div>
              <h2 className="text-[14px] font-bold text-white">Containment Topology Verification</h2>
              <p className="text-[11px] text-slate-400">
                Red dashed links represent cut traversal routes; amber borders mark quarantined nodes.
              </p>
            </div>
            {hasSimulated && (
              <span className="rounded bg-teal-950 border border-teal-500/50 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-300">
                SIMULATION ACTIVE
              </span>
            )}
          </div>

          <GraphPanel
            graph={graph}
            highlight={{
              sourceId: sourceNode.id,
              reachableIds: remainingNodes,
              isolatedIds,
              highlightEdges: highlightEdgeKeys,
            }}
            onSelectNode={(id) => setTargetId(id)}
            height={460}
            className="rounded-lg border border-outline"
          />
        </div>

        {/* Detailed Comparison Panel */}
        <div className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-3 shadow-sm lg:col-span-5">
          <div className="border-b border-outline pb-2">
            <h2 className="text-[14px] font-bold text-white">Before vs. After Containment Breakdown</h2>
            <p className="text-[11px] text-slate-400">
              Deterministic comparison generated strictly by BFS graph re-traversal.
            </p>
          </div>

          {/* Components Mitigated */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-teal-400">
                Components Successfully Safeguarded ({mitigatedNodes.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto rounded border border-outline bg-surface-lowest p-2">
              {mitigatedNodes.length > 0 ? (
                mitigatedNodes.map((id) => (
                  <span
                    key={id}
                    className="rounded bg-teal-950/80 border border-teal-500/40 px-2 py-0.5 font-mono text-[10px] text-teal-300 font-semibold"
                  >
                    ✓ {getNodeLabel(id)}
                  </span>
                ))
              ) : (
                <span className="font-mono text-[10px] text-slate-500">
                  {hasSimulated
                    ? "Target isolation did not cut reachability to any nodes (alternative paths exist)."
                    : "Run simulation to calculate mitigated components."}
                </span>
              )}
            </div>
          </div>

          {/* Components Remaining Exposed */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-rose-400">
                Components Still Exposed ({remainingNodes.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto rounded border border-outline bg-surface-lowest p-2">
              {remainingNodes.length > 0 ? (
                remainingNodes.map((id) => (
                  <span
                    key={id}
                    className="rounded bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 font-mono text-[10px] text-rose-300 font-semibold"
                  >
                    ! {getNodeLabel(id)}
                  </span>
                ))
              ) : (
                <span className="font-mono text-[10px] text-teal-300 font-bold">
                  Zero components reachable! Full containment verified.
                </span>
              )}
            </div>
          </div>

          {/* Remaining Attack Paths */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-bold uppercase text-slate-400">
              Active Attack Trajectories ({activePaths.length})
            </span>
            <div className="flex flex-col gap-1 max-h-32 overflow-y-auto rounded border border-outline bg-surface-lowest p-2 font-mono text-[10px]">
              {activePaths.slice(0, 6).map((path, idx) => (
                <div key={idx} className="text-slate-300 truncate">
                  <span className="text-rose-400 font-bold">P{idx + 1}:</span> {path.nodeIds.map(getNodeLabel).join(" -> ")}
                </div>
              ))}
              {activePaths.length > 6 && (
                <span className="text-slate-500 italic">... and {activePaths.length - 6} additional paths</span>
              )}
              {activePaths.length === 0 && (
                <span className="text-teal-400 font-bold">No active attack paths remain.</span>
              )}
            </div>
          </div>

          {/* Export Triage Report Button */}
          <div className="mt-auto border-t border-outline pt-2 flex items-center justify-between">
            <button
              onClick={() => navigate({ to: "/reports" })}
              className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:underline"
            >
              <MS name="receipt_long" className="text-[16px]" />
              Generate Audit Report
            </button>
            <button
              onClick={() => navigate({ to: "/history" })}
              className="flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:underline"
            >
              <MS name="history" className="text-[16px]" />
              View Simulation Log
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

