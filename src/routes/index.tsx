import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/state/app-store";
import { getNodeLabel } from "@/data/infrastructure";
import { generateReportPlainText } from "@/lib/report";
import { GraphPanel } from "@/components/graph/GraphPanel";
import { DemoPill, MS, MetricTile, SeverityBadge } from "@/components/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: DashboardOverview,
});

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DashboardOverview() {
  const app = useApp();
  const navigate = useNavigate();
  const {
    graph,
    scenarios,
    selectedScenario,
    sourceNode,
    blastBefore,
    blastAfter,
    comparison,
    hasSimulated,
    lastIsolatedId,
    aiReport,
    selectScenario,
    isolateNode,
    resetScenario,
  } = app;

  const totalNodes = graph.nodes.length;
  const criticalTotal = graph.nodes.filter((n) => n.isCritical).length;
  const reachableCount = blastBefore.reachableNodeIds.length;
  const criticalReachable = blastBefore.criticalNodesReached.length;
  const pathCount = blastBefore.paths.length;

  // Compute unique edge keys for path highlighting
  const highlightEdgeKeys = new Set<string>();
  blastBefore.paths.forEach((p) => {
    for (let i = 0; i < p.nodeIds.length - 1; i++) {
      highlightEdgeKeys.add(`${p.nodeIds[i]}->${p.nodeIds[i + 1]}`);
    }
  });

  return (
    <div className="flex flex-col gap-3">
      {/* 1. TOP HEADER & CONTROLS */}
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm lg:flex-row lg:items-center">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
            <MS name="shield_lock" className="text-[24px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-bold text-white tracking-tight">Security Operations Console</h1>
              <span className="rounded border border-cyan-500/40 bg-cyan-950 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                {selectedScenario.scenarioCode}
              </span>
            </div>
            <p className="text-[12px] text-slate-400">
              Deterministic Attack Propagation &amp; Containment Simulator • Engine Graph-Blast v1.0
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scenario Picker */}
          <div className="flex items-center rounded border border-outline bg-surface-low px-2 py-1">
            <span className="mr-2 font-mono text-[10px] text-slate-400">SCENARIO:</span>
            <select
              value={selectedScenario.id}
              onChange={(e) => selectScenario(e.target.value)}
              className="bg-transparent font-mono text-[11px] font-semibold text-cyan-300 focus:outline-none cursor-pointer"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-surface-low text-slate-100">
                  {sc.title}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() =>
              downloadText(
                `cypherx-triage-${selectedScenario.id}.txt`,
                generateReportPlainText({
                  incident: selectedScenario,
                  before: blastBefore,
                  after: blastAfter,
                  comparison,
                  graph,
                }),
              )
            }
            className="flex items-center gap-1 rounded border border-outline bg-surface-low px-3 py-1.5 font-mono text-[11px] text-slate-200 transition-colors hover:bg-surface-hover"
          >
            <MS name="file_download" className="text-[16px] text-slate-300" />
            Export Brief
          </button>

          <button
            onClick={() => navigate({ to: "/containment" })}
            className="flex items-center gap-1 rounded bg-cyan-500 px-3.5 py-1.5 font-mono text-[11px] font-semibold text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all hover:bg-cyan-400"
          >
            <MS name="security" className="text-[16px]" />
            Containment Sandbox
          </button>
        </div>
      </section>

      {/* 2. STATS ROW */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        <MetricTile
          label="Modeled Blast Radius"
          value={`${reachableCount} Assets`}
          note={`${pathCount} active attack vectors`}
          icon="polyline"
          valueClass="text-rose-400"
          noteClass="text-rose-400"
        />
        <MetricTile
          label="Tier-1 Assets at Risk"
          value={`${criticalReachable} / ${criticalTotal}`}
          note={criticalReachable > 0 ? "High Lateral Exposure" : "Perimeter Contained"}
          icon="warning"
          valueClass={criticalReachable > 0 ? "text-amber-400" : "text-teal-400"}
        />
        <MetricTile
          label="Active Ingress"
          value={sourceNode.label}
          note={`ID: ${sourceNode.id}`}
          icon="router"
          valueClass="text-slate-100 text-[14px]"
        />
        <MetricTile
          label="Simulation Engine"
          value="Graph-Blast"
          note="BFS Strict Simple Paths"
          icon="account_tree"
          valueClass="text-cyan-400"
        />
        <MetricTile
          label="Containment State"
          value={hasSimulated ? "Simulated" : "Baseline"}
          note={hasSimulated ? `${lastIsolatedId ? getNodeLabel(lastIsolatedId) : "1 entity"} isolated` : "Awaiting isolation"}
          icon="shield"
          valueClass={hasSimulated ? "text-teal-400" : "text-slate-400"}
          className="col-span-2 sm:col-span-4 lg:col-span-1"
        />
      </section>

      {/* 3. MAIN GRAPH & TIMELINE GRID */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Central Topology Graph */}
        <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm lg:col-span-8">
          <div className="flex flex-col justify-between gap-1 border-b border-outline pb-2 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-bold text-white tracking-tight">Threat Overview &amp; Propagation Graph</h2>
                <span className="rounded bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-300">
                  Active Vector: {sourceNode.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Interactive topological dependency matrix. Click any component to inspect metadata or simulate quarantine.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate({ to: "/infrastructure" })}
                className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:underline"
              >
                <MS name="open_in_full" className="text-[15px]" />
                Full Map
              </button>
            </div>
          </div>

          <GraphPanel
            graph={graph}
            highlight={{
              sourceId: sourceNode.id,
              reachableIds: blastBefore.reachableNodeIds,
              isolatedIds: app.isolatedIds,
              highlightEdges: highlightEdgeKeys,
            }}
            onSelectNode={(id) => navigate({ to: "/infrastructure", search: { node: id } })}
            height={420}
            className="rounded-lg border border-outline"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-outline bg-surface-low p-2 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-semibold text-white">Focus Ingress: {sourceNode.label}</span>
              <span className="text-outline">|</span>
              <span>Zone: {sourceNode.zone}</span>
              <span className="text-outline">|</span>
              <span>IP: {sourceNode.ipAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => isolateNode(sourceNode.id)}
                className="rounded border border-cyan-500/40 bg-cyan-950/80 px-2 py-0.5 font-semibold text-cyan-300 hover:bg-cyan-900"
              >
                + Isolate This Node
              </button>
            </div>
          </div>
        </div>

        {/* Right Incident & Timeline Column */}
        <div className="flex flex-col gap-3 lg:col-span-4">
          {/* Incident Timeline */}
          <div className="flex flex-col rounded-lg border border-outline bg-surface p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline pb-2">
              <div>
                <span className="font-mono text-[10px] font-bold text-cyan-400">{selectedScenario.id}</span>
                <h3 className="text-[14px] font-bold text-white leading-tight">{selectedScenario.title}</h3>
              </div>
              <SeverityBadge severity={selectedScenario.severity} />
            </div>

            <p className="my-2 text-[11px] leading-relaxed text-slate-300">{selectedScenario.summary}</p>

            <div className="relative my-1 flex flex-col gap-2.5 pl-5 before:absolute before:bottom-1 before:left-1.5 before:top-1 before:w-0.5 before:bg-outline before:content-['']">
              {selectedScenario.timeline.map((entry, idx) => (
                <div key={idx} className="relative flex flex-col">
                  <span className="absolute -left-5 top-1 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-surface" />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-white">{entry.time}</span>
                    <span className="rounded bg-surface-low px-1.5 py-0.2 font-mono text-[9px] text-cyan-300 border border-outline">
                      {entry.tag}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-300">{entry.text}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-outline pt-2">
              <button
                onClick={() => navigate({ to: "/investigations" })}
                className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:underline"
              >
                <span>Investigate Scenarios</span>
                <MS name="arrow_forward" className="text-[15px]" />
              </button>
              <button
                onClick={() => navigate({ to: "/reports" })}
                className="flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:underline"
              >
                <span>View Full Report</span>
                <MS name="receipt_long" className="text-[15px]" />
              </button>
            </div>
          </div>

          {/* AI Security Reasoning Brief */}
          <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline pb-1.5">
              <div className="flex items-center gap-1.5">
                <MS name="smart_toy" className="text-[18px] text-cyan-400" />
                <h3 className="text-[13px] font-bold text-white">AI-Assisted Threat Reasoning</h3>
              </div>
              <span className="rounded bg-cyan-950 px-1.5 py-0.5 font-mono text-[9px] text-cyan-300 border border-cyan-500/30">
                REAL-TIME BFS
              </span>
            </div>

            <div className="flex flex-col gap-2 text-[11px]">
              <div className="rounded border border-outline bg-surface-lowest p-2">
                <span className="font-mono text-[9px] uppercase font-bold text-cyan-400">Trajectory Summary</span>
                <p className="mt-1 leading-relaxed text-slate-300">{aiReport.summary}</p>
              </div>

              <div className="rounded border border-outline bg-surface-lowest p-2">
                <span className="font-mono text-[9px] uppercase font-bold text-amber-400">Containment Recommendation</span>
                <p className="mt-1 leading-relaxed text-slate-300">{aiReport.containmentRecommendation}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BEFORE-AND-AFTER CONTAINMENT PREVIEW */}
      <section className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-outline pb-2 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-[15px] font-bold text-white">Simulated Containment &amp; Blast-Radius Mitigation</h2>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Evaluate lateral attack reduction prior to executing firewall or identity policy changes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={resetScenario}
              className="rounded border border-outline bg-surface-low px-3 py-1 font-mono text-[11px] text-slate-300 hover:bg-surface-hover"
            >
              Reset Simulation
            </button>
            <button
              onClick={() => isolateNode("vpn-gw-01")}
              className="flex items-center gap-1 rounded bg-cyan-500 px-3 py-1 font-mono text-[11px] font-semibold text-slate-950 hover:bg-cyan-400"
            >
              <MS name="security" className="text-[16px]" />
              Simulate Isolation (vpn-gw-01)
            </button>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* Before */}
          <div className="flex flex-col gap-2 rounded-lg border border-outline border-l-4 border-l-rose-500 bg-surface-low p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-white">
                Before Containment (Baseline Risk)
              </span>
              <span className="rounded bg-rose-950 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 border border-rose-500/40">
                {blastBefore.reachableNodeIds.length} Reachable
              </span>
            </div>
            <div className="my-1 grid grid-cols-2 gap-2">
              <MetricTile label="Potentially Reachable" value={`${blastBefore.reachableNodeIds.length} Assets`} valueClass="text-rose-400" />
              <MetricTile
                label="Critical Tier-1 at Risk"
                value={`${blastBefore.criticalNodesReached.length} Entities`}
                note={blastBefore.criticalNodesReached.map(getNodeLabel).join(", ") || "None"}
                valueClass="text-rose-400"
              />
              <MetricTile label="Modeled Lateral Paths" value={`${blastBefore.paths.length} Paths`} />
              <MetricTile label="Ingress Vector" value={sourceNode.id} note={sourceNode.label} />
            </div>
          </div>

          {/* After */}
          <div className="flex flex-col gap-2 rounded-lg border border-outline border-l-4 border-l-teal-400 bg-surface-low p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold uppercase text-white">
                After Simulated Containment (Projected)
              </span>
              {comparison && blastAfter ? (
                <span className="rounded bg-teal-950 px-2 py-0.5 font-mono text-[10px] font-bold text-teal-300 border border-teal-500/40">
                  {Math.max(
                    0,
                    Math.round(
                      ((blastBefore.reachableNodeIds.length - blastAfter.reachableNodeIds.length) /
                        Math.max(blastBefore.reachableNodeIds.length, 1)) *
                        100,
                    ),
                  )}
                  % Threat Reduction
                </span>
              ) : (
                <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-outline">
                  Awaiting Quarantine Action
                </span>
              )}
            </div>

            {comparison && blastAfter ? (
              <div className="my-1 grid grid-cols-2 gap-2">
                <MetricTile
                  label="Remaining Reachable"
                  value={`${blastAfter.reachableNodeIds.length} Assets`}
                  note={`Reduced by ${blastBefore.reachableNodeIds.length - blastAfter.reachableNodeIds.length}`}
                  valueClass="text-teal-400"
                />
                <MetricTile
                  label="Remaining Critical"
                  value={`${blastAfter.criticalNodesReached.length} Entities`}
                  note={blastAfter.criticalNodesReached.map(getNodeLabel).join(", ") || "None"}
                />
                <MetricTile label="Remaining Paths" value={`${blastAfter.paths.length} Paths`} valueClass="text-teal-400" />
                <MetricTile label="Quarantined Node" value={comparison.isolatedNodeId} note={getNodeLabel(comparison.isolatedNodeId)} />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-center font-mono text-[11px] text-slate-500">
                Select an infrastructure node to project containment and threat reduction.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
