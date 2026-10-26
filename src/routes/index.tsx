import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useApp } from "@/state/app-store";
import { getNodeById, getNodeLabel, type EnrichedNode } from "@/data/infrastructure";
import { runDetections } from "@/data/detection";
import { securityEvents } from "@/data/events";
import type { Alert } from "@/data/types";
import { generateReportPlainText } from "@/lib/report";
import { GraphPanel } from "@/components/graph/GraphPanel";
import { MS, SeverityBadge } from "@/components/shared";
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
    isolatedIds,
    aiReport,
    selectScenario,
    isolateNode,
    resetScenario,
  } = app;

  // Selected node for interactive cross-highlighting
  const [selectedNodeId, setSelectedNodeId] = useState<string>(sourceNode.id);
  const [quarantineTargetId, setQuarantineTargetId] = useState<string>("vpn-gw-01");
  const [activeAlertModal, setActiveAlertModal] = useState<Alert | null>(null);
  const [showAttackerIp, setShowAttackerIp] = useState<boolean>(false);
  const [copiedAttackerIp, setCopiedAttackerIp] = useState<boolean>(false);

  // Real Alerts from Detection Engine
  const alerts = useMemo<Alert[]>(() => runDetections(), []);

  // Compute unique edge keys for path highlighting on the map
  const activePaths = blastAfter ? blastAfter.paths : blastBefore.paths;
  const highlightEdgeKeys = useMemo(() => {
    const keys = new Set<string>();
    activePaths.forEach((p) => {
      for (let i = 0; i < p.nodeIds.length - 1; i++) {
        keys.add(`${p.nodeIds[i]}->${p.nodeIds[i + 1]}`);
      }
    });
    return keys;
  }, [activePaths]);

  // Quantitative Assets At Risk derived dynamically from real engine reachability
  const activeReachableIds = blastAfter ? blastAfter.reachableNodeIds : blastBefore.reachableNodeIds;
  const reachableNodes = useMemo(
    () =>
      (graph.nodes as EnrichedNode[]).filter((n) =>
        activeReachableIds.includes(n.id) && n.id !== selectedScenario.sourceNodeId,
      ),
    [graph.nodes, activeReachableIds, selectedScenario.sourceNodeId],
  );

  const riskCounts = useMemo(() => {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    reachableNodes.forEach((node) => {
      if (node.isCritical) critical++;
      else if (node.type === "api" || node.type === "server") high++;
      else if (node.type === "application") medium++;
      else low++;
    });

    return { critical, high, medium, low };
  }, [reachableNodes]);

  // Overall Containment State derivation
  const containmentStatus = useMemo(() => {
    if (!hasSimulated) return { label: "NOT STARTED", tone: "slate", text: "Baseline threat monitoring active" };
    if (activeReachableIds.length === 0)
      return { label: "CONTAINMENT COMPLETE", tone: "emerald", text: "Zero downstream lateral assets reachable" };
    return {
      label: "PARTIALLY CONTAINED",
      tone: "amber",
      text: `${blastBefore.reachableNodeIds.length - activeReachableIds.length} assets isolated; alternate routes remain`,
    };
  }, [hasSimulated, activeReachableIds.length, blastBefore.reachableNodeIds.length]);

  // Screen / Component for Containment Target
  const targetNode = useMemo(
    () => getNodeById(graph, quarantineTargetId) ?? (graph.nodes[0] as EnrichedNode),
    [graph, quarantineTargetId],
  );

  const selectedNode = useMemo(
    () => getNodeById(graph, selectedNodeId) ?? sourceNode,
    [graph, selectedNodeId, sourceNode],
  );

  return (
    <div className="flex flex-col gap-3.5 pb-6">
      {/* ============================================================== */}
      {/* 0. TOP CONTEXT HEADER                                          */}
      {/* ============================================================== */}
      <header className="flex flex-col justify-between gap-3 rounded-lg border border-[#1b263b] bg-[#101524] p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
            <MS name="shield_lock" className="text-[20px]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold text-white tracking-tight">Security Operations Dashboard</h1>
              <span className="rounded border border-cyan-500/30 bg-cyan-950/60 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-cyan-300">
                {selectedScenario.scenarioCode}
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SYSTEM LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              CYPHER-X • Real-time Deterministic Attack Reachability &amp; Containment Emulation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scenario Selector */}
          <div className="flex items-center rounded border border-[#1b263b] bg-[#0c101c] px-2.5 py-1">
            <span className="mr-2 font-mono text-[10px] text-slate-400">ACTIVE SCENARIO:</span>
            <select
              value={selectedScenario.id}
              onChange={(e) => {
                selectScenario(e.target.value);
                setSelectedNodeId(scenarios.find((s) => s.id === e.target.value)?.sourceNodeId ?? "srv-web-01");
              }}
              className="bg-transparent font-mono text-[11px] font-semibold text-cyan-300 focus:outline-none cursor-pointer"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id} className="bg-[#0c101c] text-slate-100">
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
            className="flex items-center gap-1 rounded border border-[#1b263b] bg-[#0c101c] px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:bg-[#151d30] transition-colors"
          >
            <MS name="download" className="text-[15px] text-slate-400" />
            Export Brief
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 1. IMPORTANT ATTACK NOTIFICATIONS (AREA A - TOP PRIORITY)     */}
      {/* ============================================================== */}
      <section className="flex flex-col rounded-lg border border-[#1b263b] bg-[#101524] p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between border-b border-[#1b263b] pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-red-950/80 text-red-400 border border-red-500/30">
              <MS name="notifications_active" className="text-[14px]" />
            </span>
            <h2 className="text-[13px] font-bold text-white tracking-wide uppercase">
              1. Important Attack Notifications
            </h2>
            <span className="rounded bg-[#0c101c] border border-[#1b263b] px-1.5 py-0.2 font-mono text-[9px] text-slate-400">
              {alerts.length + 1} Active Threat Signals
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-[#070a12] border border-[#1b263b] px-2 py-0.5 font-mono text-[9px] text-slate-400">
              SIMULATED TELEMETRY • LOCAL IN-MEMORY EVALUATION
            </span>
            <button
              onClick={() => navigate({ to: "/security-alerts" })}
              className="font-mono text-[11px] text-cyan-400 hover:underline flex items-center gap-0.5"
            >
              <span>All Alerts</span>
              <MS name="arrow_forward" className="text-[14px]" />
            </button>
          </div>
        </div>

        {/* Compact Table of Attack Notifications */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-[#1b263b] font-mono text-[9px] uppercase tracking-wider text-slate-400">
                <th className="px-2 py-1.5">SEVERITY</th>
                <th className="px-2 py-1.5">ATTACK / THREAT INCIDENT</th>
                <th className="px-2 py-1.5">AFFECTED ASSET (SCREEN IP)</th>
                <th className="px-2 py-1.5">DETECTION TIME</th>
                <th className="px-2 py-1.5">STATUS</th>
                <th className="px-2 py-1.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b263b] font-mono">
              {/* Highlight row for currently active Scenario Ingress */}
              <tr
                className="bg-red-950/20 hover:bg-red-950/30 transition-colors cursor-pointer"
                onClick={() => setSelectedNodeId(sourceNode.id)}
              >
                <td className="px-2 py-2">
                  <span className="rounded bg-red-950/90 border border-red-500/50 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
                    CRITICAL
                  </span>
                </td>
                <td className="px-2 py-2 font-sans font-medium text-white">
                  {selectedScenario.title}
                  <span className="ml-1.5 rounded bg-red-950/60 text-red-300 px-1 py-0.2 text-[8px] font-mono">
                    ACTIVE SCENARIO
                  </span>
                </td>
                <td className="px-2 py-2 text-cyan-300 font-semibold">
                  {sourceNode.label} <span className="text-slate-400">({sourceNode.ipAddress})</span>
                </td>
                <td className="px-2 py-2 text-slate-400">10:48 UTC</td>
                <td className="px-2 py-2">
                  <span className="text-red-400 font-semibold">Under Active Attack</span>
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(sourceNode.id);
                    }}
                    className="rounded border border-red-500/40 bg-red-950/50 px-2 py-1 text-[10px] text-red-300 hover:bg-red-900 transition-colors"
                  >
                    Focus Asset
                  </button>
                </td>
              </tr>

              {/* Standard Alerts from Detection Engine */}
              {alerts.slice(0, 3).map((alert) => (
                <tr
                  key={alert.id}
                  className="hover:bg-[#151d30] transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedNodeId(alert.assetId);
                    setActiveAlertModal(alert);
                  }}
                >
                  <td className="px-2 py-2">
                    <SeverityBadge severity={alert.severity} />
                  </td>
                  <td className="px-2 py-2 font-sans text-slate-200">
                    {alert.title}
                    <span className="ml-1.5 font-mono text-[9px] text-slate-500">[{alert.ruleId}]</span>
                  </td>
                  <td className="px-2 py-2 text-slate-300">
                    {getNodeLabel(alert.assetId)}{" "}
                    <span className="text-slate-500">
                      ({getNodeById(graph, alert.assetId)?.ipAddress ?? "10.0.x.x"})
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-400">{alert.detectedAt.slice(11, 16)} UTC</td>
                  <td className="px-2 py-2">
                    <span
                      className={cn(
                        "text-[10px]",
                        alert.status === "needs-review"
                          ? "text-amber-400 font-semibold"
                          : alert.status === "under-review"
                            ? "text-red-300 font-semibold"
                            : "text-slate-400",
                      )}
                    >
                      {alert.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveAlertModal(alert);
                      }}
                      className="rounded border border-[#1b263b] bg-[#0c101c] px-2 py-1 text-[10px] text-cyan-400 hover:bg-[#151d30] transition-colors"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 2 & 3. MAIN DASHBOARD CONTENT (INFRASTRUCTURE MAP + ASSETS)   */}
      {/* ============================================================== */}
      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* ============================================================ */}
        {/* B. INFRASTRUCTURE MAP (MAIN VISUAL - 7 COLS)                 */}
        {/* ============================================================ */}
        <div className="flex flex-col rounded-lg border border-[#1b263b] bg-[#101524] p-3 shadow-sm lg:col-span-7 xl:col-span-7">
          <div className="mb-2 flex flex-col justify-between gap-1 border-b border-[#1b263b] pb-2 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-950/80 text-sky-400 border border-sky-500/30">
                  <MS name="hub" className="text-[14px]" />
                </span>
                <h2 className="text-[13px] font-bold text-white tracking-wide uppercase">
                  2. Infrastructure Map
                </h2>
                <span className="rounded bg-[#0c101c] border border-[#1b263b] px-1.5 py-0.2 font-mono text-[9px] text-slate-400">
                  {graph.nodes.length} Components • {graph.edges.length} Links
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Topological dependency graph. Red vectors depict active lateral propagation paths. Click any node to inspect.
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-slate-400">Selected Node:</span>
              <span className="font-bold text-sky-400">{selectedNode.label}</span>
              <span className="text-slate-600">|</span>
              <button
                onClick={() => navigate({ to: "/infrastructure" })}
                className="text-cyan-400 hover:underline flex items-center gap-0.5"
              >
                <span>Full Map</span>
                <MS name="open_in_full" className="text-[13px]" />
              </button>
            </div>
          </div>

          {/* Interactive SVG Graph Viewer */}
          <GraphPanel
            graph={graph}
            highlight={{
              sourceId: sourceNode.id,
              reachableIds: activeReachableIds,
              isolatedIds,
              highlightEdges: highlightEdgeKeys,
            }}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => {
              setSelectedNodeId(id);
              setQuarantineTargetId(id);
            }}
            height={430}
            className="rounded border border-[#1b263b]"
          />

          {/* Map Footer Bar: Focus Node details */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-[#1b263b] bg-[#0c101c] p-2 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span className="text-slate-200 font-semibold">Active Inspector: {selectedNode.label}</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-300 font-bold">{selectedNode.ipAddress}</span>
              <span className="text-slate-600">|</span>
              <span>{selectedNode.zone}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setQuarantineTargetId(selectedNode.id);
                  isolateNode(selectedNode.id);
                }}
                disabled={isolatedIds.includes(selectedNode.id)}
                className={cn(
                  "rounded px-2 py-0.5 font-semibold text-[10px] transition-colors",
                  isolatedIds.includes(selectedNode.id)
                    ? "bg-[#141b2c] text-slate-500 border border-[#1b263b] cursor-not-allowed"
                    : "border border-red-500/40 bg-red-950/60 text-red-300 hover:bg-red-900",
                )}
              >
                {isolatedIds.includes(selectedNode.id) ? "Already Quarantined" : `+ Quarantine [${selectedNode.id}]`}
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: 3. ASSETS AT RISK & 4. CONTAINMENT STATE (5 COLS) */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-3.5 lg:col-span-5 xl:col-span-5">
          {/* ========================================================== */}
          {/* C. ASSETS AT RISK (AREA 3 - ADJACENT TOP PANEL)           */}
          {/* ========================================================== */}
          <div className="flex flex-col rounded-lg border border-[#1b263b] bg-[#101524] p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between border-b border-[#1b263b] pb-2">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-950/80 text-amber-400 border border-amber-500/30">
                  <MS name="warning" className="text-[14px]" />
                </span>
                <h3 className="text-[13px] font-bold text-white tracking-wide uppercase">
                  3. Assets at Risk
                </h3>
              </div>
              <span className="rounded bg-[#0c101c] border border-[#1b263b] px-1.5 py-0.2 font-mono text-[9px] text-red-300 font-bold">
                {reachableNodes.length} EXPOSED
              </span>
            </div>

            {/* Severity Counters Grid */}
            <div className="grid grid-cols-4 gap-1.5 font-mono text-center">
              <div className="rounded border border-red-500/30 bg-red-950/40 p-1.5">
                <div className="text-[9px] uppercase text-red-400 font-bold">Critical</div>
                <div className="text-[16px] font-bold text-red-200">{riskCounts.critical}</div>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-950/40 p-1.5">
                <div className="text-[9px] uppercase text-amber-400 font-bold">High</div>
                <div className="text-[16px] font-bold text-amber-200">{riskCounts.high}</div>
              </div>
              <div className="rounded border border-[#1b263b] bg-[#0c101c] p-1.5">
                <div className="text-[9px] uppercase text-slate-400 font-bold">Medium</div>
                <div className="text-[16px] font-bold text-slate-200">{riskCounts.medium}</div>
              </div>
              <div className="rounded border border-[#1b263b] bg-[#0c101c] p-1.5">
                <div className="text-[9px] uppercase text-slate-500 font-bold">Low</div>
                <div className="text-[16px] font-bold text-slate-400">{riskCounts.low}</div>
              </div>
            </div>

            {/* Analytical Summary */}
            <div className="mt-2.5 rounded border border-[#1b263b] bg-[#0c101c] p-2 text-[11px] leading-relaxed text-slate-300">
              <span className="font-mono text-[9px] uppercase font-bold text-slate-400 block mb-0.5">
                Risk Analysis Summary:
              </span>
              <span>
                {blastBefore.criticalNodesReached.length > 0
                  ? `Lateral paths originate at ${sourceNode.label} and traverse into ${blastBefore.criticalNodesReached.length} Tier-1 critical assets. Immediate host isolation advised.`
                  : "Threat trajectory is currently constrained to perimeter and non-critical tiers."}
              </span>
            </div>

            {/* Clickable Exposed Assets List (Selecting highlights corresponding node on map) */}
            <div className="mt-2.5 flex flex-col gap-1">
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                Click Asset to Highlight on Map ({reachableNodes.length}):
              </span>
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto pr-1">
                {reachableNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setQuarantineTargetId(node.id);
                      }}
                      className={cn(
                        "flex items-center justify-between rounded px-2 py-1 font-mono text-[10px] text-left transition-colors",
                        isSelected
                          ? "bg-sky-950/80 border border-sky-400 text-white font-bold"
                          : "bg-[#0c101c] border border-[#1b263b] text-slate-300 hover:bg-[#151d30]",
                      )}
                    >
                      <span className="truncate">{node.label}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-slate-400 text-[9px]">{node.ipAddress}</span>
                        <span
                          className={cn(
                            "rounded px-1 text-[8px] font-bold uppercase",
                            node.isCritical ? "bg-red-950 text-red-300" : "bg-slate-800 text-slate-400",
                          )}
                        >
                          {node.isCritical ? "CRIT" : node.type}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* D. CONTAINMENT STATE (AREA 4 - RIGHT SIDE BOTTOM)          */}
          {/* ========================================================== */}
          <div className="flex flex-col rounded-lg border border-[#1b263b] bg-[#101524] p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between border-b border-[#1b263b] pb-2">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  <MS name="security" className="text-[14px]" />
                </span>
                <h3 className="text-[13px] font-bold text-white tracking-wide uppercase">
                  4. Containment State
                </h3>
              </div>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.2 font-mono text-[9px] font-bold",
                  containmentStatus.tone === "emerald"
                    ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                    : containmentStatus.tone === "amber"
                      ? "bg-amber-950 text-amber-300 border-amber-500/40"
                      : "bg-[#0c101c] text-slate-400 border-[#1b263b]",
                )}
              >
                {containmentStatus.label}
              </span>
            </div>

            {/* Containment Metrics */}
            <div className="grid grid-cols-3 gap-1.5 font-mono text-center text-[10px]">
              <div className="rounded border border-[#1b263b] bg-[#0c101c] p-1.5">
                <span className="text-slate-400 block text-[9px]">ISOLATED</span>
                <span className="text-[14px] font-bold text-amber-300">{isolatedIds.length}</span>
              </div>
              <div className="rounded border border-[#1b263b] bg-[#0c101c] p-1.5">
                <span className="text-slate-400 block text-[9px]">PENDING</span>
                <span className="text-[14px] font-bold text-slate-300">{hasSimulated ? 0 : 1}</span>
              </div>
              <div className="rounded border border-[#1b263b] bg-[#0c101c] p-1.5">
                <span className="text-slate-400 block text-[9px]">COMPLETED</span>
                <span className="text-[14px] font-bold text-emerald-300">{hasSimulated ? isolatedIds.length : 0}</span>
              </div>
            </div>

            {/* Target Component with IP Address (Requirement: Screen to IP address) */}
            <div className="mt-2.5 rounded border border-[#1b263b] bg-[#0c101c] p-2.5 font-mono text-[11px]">
              <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                <span>TARGET SCREEN / QUARANTINE CANDIDATE:</span>
                <span className="text-sky-400 font-bold">{targetNode.ipAddress}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">{targetNode.label}</span>
                <span className="text-[10px] text-slate-400">[{targetNode.id}]</span>
              </div>
              <div className="mt-1 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Zone: {targetNode.zone}</span>
                <span className="text-slate-500">Updated: 10:50 UTC</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => isolateNode(quarantineTargetId)}
                  className="flex-1 flex items-center justify-center gap-1 rounded bg-red-600 px-3 py-1.5 font-mono text-[11px] font-bold text-white hover:bg-red-500 transition-colors shadow-sm"
                >
                  <MS name="power_settings_new" className="text-[15px]" />
                  Simulate Isolation
                </button>
                <button
                  onClick={resetScenario}
                  className="rounded border border-[#1b263b] bg-[#0c101c] px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:bg-[#151d30] transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Display Attacker IP Button */}
              <button
                onClick={() => setShowAttackerIp((prev) => !prev)}
                className={cn(
                  "w-full flex items-center justify-center gap-1.5 rounded py-1.5 font-mono text-[11px] font-bold transition-all shadow-sm",
                  showAttackerIp
                    ? "border border-red-500 bg-red-600 text-white"
                    : "border border-red-500/40 bg-red-950/60 text-red-300 hover:bg-red-900/80 hover:text-white",
                )}
              >
                <MS name="radar" className="text-[15px]" />
                {showAttackerIp ? "Hide Attacker IP" : "Display Attacker IP"}
              </button>

              {/* Attacker IP Threat Card (Shown on click) */}
              {showAttackerIp && (
                <div className="rounded border border-red-500/40 bg-red-950/30 p-2.5 font-mono text-[10px] shadow-md animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-red-500/30 pb-1 mb-1.5">
                    <span className="text-[10px] font-bold text-red-300 uppercase flex items-center gap-1">
                      <MS name="wifi_tethering_error" className="text-[13px] text-red-400" />
                      Attacker Threat Origin
                    </span>
                    <button
                      onClick={() => setShowAttackerIp(false)}
                      className="text-slate-400 hover:text-white text-[11px]"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-[#080c16] rounded p-1.5 border border-red-500/20">
                    <div>
                      <div className="text-[8px] text-slate-400 uppercase">External Adversary IP:</div>
                      <div className="text-[13px] font-bold text-red-400 tracking-wider">
                        {selectedScenario.attackerIp}
                        {selectedScenario.attackerPort && (
                          <span className="text-red-300 text-[10px]">:{selectedScenario.attackerPort}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedScenario.attackerIp);
                        setCopiedAttackerIp(true);
                        setTimeout(() => setCopiedAttackerIp(false), 2000);
                      }}
                      className="flex items-center gap-1 rounded bg-red-950 border border-red-500/40 px-2 py-0.5 text-[9px] text-red-200 hover:bg-red-900"
                    >
                      <MS name={copiedAttackerIp ? "check" : "content_copy"} className="text-[11px]" />
                      {copiedAttackerIp ? "Copied" : "Copy IP"}
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400">
                    <span>Origin: <strong className="text-slate-200">{selectedScenario.attackerLocation || "External C2"}</strong></span>
                    <span>TTP: <strong className="text-amber-300">{selectedScenario.adversaryTTP.split("->")[0].trim()}</strong></span>
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate({ to: "/containment" })}
                className="w-full flex items-center justify-center gap-1 rounded border border-cyan-500/30 bg-cyan-950/40 py-1.5 font-mono text-[11px] text-cyan-300 hover:bg-cyan-950/70 transition-colors"
              >
                <MS name="compare_arrows" className="text-[14px]" />
                View Full Containment Plan
              </button>
            </div>

            {/* Safety callout */}
            <div className="mt-2 text-[9px] font-mono text-slate-500 text-center">
              ⚠️ In-memory graph simulation only • No live routing or firewall modifications
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. SECONDARY CONTENT: RECENT EVENTS & AI RECOMMENDATIONS       */}
      {/* ============================================================== */}
      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Recent Security Telemetry Events */}
        <div className="flex flex-col rounded-lg border border-[#1b263b] bg-[#101524] p-3 shadow-sm lg:col-span-6">
          <div className="mb-2 flex items-center justify-between border-b border-[#1b263b] pb-2">
            <div className="flex items-center gap-1.5">
              <MS name="receipt_long" className="text-[16px] text-cyan-400" />
              <h3 className="text-[13px] font-bold text-white">Recent Security Telemetry Events</h3>
            </div>
            <span className="font-mono text-[10px] text-slate-400">{securityEvents.length} Simulated Logs</span>
          </div>

          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="border-b border-[#1b263b] text-slate-400 text-[9px] uppercase">
                <tr>
                  <th className="px-1.5 py-1">TIMESTAMP</th>
                  <th className="px-1.5 py-1">TYPE</th>
                  <th className="px-1.5 py-1">SOURCE IP</th>
                  <th className="px-1.5 py-1">TARGET ASSET</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1b263b] text-slate-300">
                {securityEvents.slice(0, 5).map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#151d30]">
                    <td className="px-1.5 py-1.5 text-slate-400">{ev.timestamp.slice(11, 19)}</td>
                    <td className="px-1.5 py-1.5 font-semibold text-slate-200">{ev.type}</td>
                    <td className="px-1.5 py-1.5 text-sky-400">{ev.sourceIp}</td>
                    <td className="px-1.5 py-1.5 text-slate-400">{getNodeLabel(ev.assetId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Threat Recommendations & Next Steps */}
        <div className="flex flex-col gap-2 rounded-lg border border-[#1b263b] bg-[#101524] p-3 shadow-sm lg:col-span-6">
          <div className="flex items-center justify-between border-b border-[#1b263b] pb-1.5">
            <div className="flex items-center gap-1.5">
              <MS name="smart_toy" className="text-[16px] text-cyan-400" />
              <h3 className="text-[13px] font-bold text-white">Recommended Defensive Next Steps</h3>
            </div>
            <span className="rounded bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.2 font-mono text-[9px] text-cyan-300">
              GRAPH-BLAST BFS
            </span>
          </div>

          <div className="flex flex-col gap-2 text-[11px] leading-relaxed">
            <div className="rounded border border-[#1b263b] bg-[#0c101c] p-2">
              <span className="font-mono text-[9px] font-bold uppercase text-red-400">
                Immediate Action Recommendation:
              </span>
              <p className="mt-0.5 text-slate-300">{aiReport.containmentRecommendation}</p>
            </div>

            <div className="rounded border border-[#1b263b] bg-[#0c101c] p-2">
              <span className="font-mono text-[9px] font-bold uppercase text-cyan-400">
                Modeled Lateral Vector Trajectory:
              </span>
              <p className="mt-0.5 text-slate-300">{aiReport.threatTrajectory}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 5. ALERT INSPECTION MODAL                                      */}
      {/* ============================================================== */}
      {activeAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-lg border border-[#1b263b] bg-[#101524] p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-2">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={activeAlertModal.severity} />
                <span className="font-mono text-[12px] font-bold text-white">{activeAlertModal.id}</span>
                <span className="font-mono text-[10px] text-slate-400">[{activeAlertModal.ruleId}]</span>
              </div>
              <button
                onClick={() => setActiveAlertModal(null)}
                className="rounded p-1 text-slate-400 hover:bg-[#151d30] hover:text-white"
              >
                <MS name="close" className="text-[18px]" />
              </button>
            </div>

            <div className="my-3 flex flex-col gap-2.5 overflow-y-auto pr-1 text-[12px]">
              <div>
                <h4 className="font-bold text-white text-[14px]">{activeAlertModal.title}</h4>
                <div className="mt-1 flex items-center gap-3 font-mono text-[10px] text-slate-400">
                  <span>Detected: {activeAlertModal.detectedAt}</span>
                  <span>•</span>
                  <span>Asset: {getNodeLabel(activeAlertModal.assetId)}</span>
                </div>
              </div>

              <div className="rounded border border-[#1b263b] bg-[#0c101c] p-2.5">
                <span className="font-mono text-[9px] font-bold uppercase text-slate-400">Technical Reason:</span>
                <p className="mt-1 leading-relaxed text-slate-200">{activeAlertModal.detectionReason}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-bold uppercase text-slate-400">
                  Telemetry Evidence Logs ({activeAlertModal.evidence.length}):
                </span>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {activeAlertModal.evidence.map((ev, i) => (
                    <div key={i} className="rounded border border-[#1b263b] bg-[#070a12] p-2 font-mono text-[10px]">
                      <div className="font-bold text-cyan-400">{ev.eventId}</div>
                      <div className="text-slate-300 font-sans mt-0.5">{ev.summary}</div>
                      {ev.detail && <div className="text-slate-500 break-all mt-0.5">{ev.detail}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-[#1b263b] pt-2.5">
              <button
                onClick={() => {
                  setSelectedNodeId(activeAlertModal.assetId);
                  setActiveAlertModal(null);
                }}
                className="rounded border border-cyan-500/40 bg-cyan-950 px-3 py-1.5 font-mono text-[11px] font-bold text-cyan-300 hover:bg-cyan-900"
              >
                Focus on Infrastructure Map
              </button>
              <button
                onClick={() => setActiveAlertModal(null)}
                className="rounded border border-[#1b263b] bg-[#0c101c] px-3 py-1.5 font-mono text-[11px] text-slate-300 hover:bg-[#151d30]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
