import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/state/app-store";
import { nodeLabel } from "@/data/infrastructure";
import { buildTriageBrief } from "@/lib/report";
import { uniquePathEdges } from "@/lib/blast-radius";
import { GraphPanel } from "@/components/graph/GraphPanel";
import { DemoPill, MS, MetricTile, Panel, SeverityBadge, StatusLabel } from "@/components/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CYPHER-X — Security Operations Overview" },
      {
        name: "description",
        content:
          "Mission Control overview: live alerts, incident timeline, infrastructure dependency graph, and simulated containment on demo data.",
      },
      { property: "og:title", content: "CYPHER-X — Security Operations Overview" },
      {
        property: "og:description",
        content: "Simulated SOC overview with dependency graph, blast radius, and containment simulation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
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

function Index() {
  const app = useApp();
  const navigate = useNavigate();
  const {
    graph,
    alerts,
    selectedIncident,
    sourceNode,
    blastBefore,
    blastAfter,
    comparison,
    hasSimulated,
    lastIsolatedId,
    isolateNode,
    resetScenario,
  } = app;

  const total = graph.nodes.length;
  const healthy = graph.nodes.filter((n) => n.status === "healthy").length;
  const degraded = graph.nodes.filter((n) => n.status === "degraded").length;
  const healthScore = Math.round(((healthy + degraded * 0.5) / total) * 1000) / 10;

  const openIncidents = app.incidents.filter((i) => i.status !== "resolved");
  const highPriority = openIncidents.filter((i) => i.severity === "high" || i.severity === "critical").length;
  const underReview = alerts.filter((a) => a.status === "under-review").length;
  const containmentStaged = app.incidents.filter((i) => i.status === "containment-staged").length;
  const openAlerts = alerts.filter((a) => a.status === "open" || a.status === "needs-review").length;

  const baselineEdges = uniquePathEdges(blastBefore.paths).size;
  const perimeter =
    blastBefore.criticalReachable.length >= 2
      ? "High Lateral"
      : blastBefore.criticalReachable.length === 1
        ? "Moderate Lateral"
        : "Contained";

  const severityCounts = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    low: alerts.filter((a) => a.severity === "low").length,
  };
  const severityTotal = Math.max(alerts.length, 1);
  const ingress = graph.edges.filter((e) => e.to === sourceNode.id && e.traversable);
  const egressCount = sourceNode.dependsOn.length;

  return (
    <>
      {/* TOP CONTEXT & CONTROLS BAR */}
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
              <MS name="shield_lock" className="text-[22px]" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-[15px] font-semibold text-white">Security Operations Overview</h1>
                <span className="rounded border border-cyan-500/40 bg-cyan-950 px-1 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                  {highPriority > 0 ? "Active Investigation" : "Nominal Monitoring"}
                </span>
              </div>
              <p className="text-[12px] text-slate-400">
                Analyst Console • Welcome back, <strong className="font-medium text-slate-200">David Chen</strong> • Engine Graph-Blast v4.9
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-1 rounded border border-outline bg-surface-lowest px-3 py-1 font-mono text-[10px] text-slate-400 md:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <span>Simulated Demonstration Environment — Zero Live Production Impact</span>
          </div>
        </div>
        <div className="flex items-center gap-1 self-start sm:self-auto">
          <button
            onClick={() =>
              downloadText(
                "cypherx-triage-brief.txt",
                buildTriageBrief({ alerts, incident: selectedIncident, before: blastBefore, nodeLabel }),
              )
            }
            className="flex items-center gap-1 rounded border border-outline bg-hover-strong px-3 py-1.5 font-mono text-[11px] text-slate-200 shadow-sm transition-colors hover:bg-strong"
          >
            <MS name="file_download" className="text-[16px] text-slate-300" />
            Export Triage Brief
          </button>
          <button
            onClick={() => navigate({ to: "/containment" })}
            className="flex items-center gap-1 rounded bg-cyan-500 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.3)] transition-all hover:bg-cyan-400"
          >
            <MS name="add_circle" className="text-[16px]" />
            + New Incident Simulation
          </button>
        </div>
      </section>

      {/* THREE-COLUMN COMMAND VIEW */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* LEFT PANEL */}
        <aside className="flex flex-col gap-3 lg:col-span-3">
          <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">Infrastructure Health</span>
              <span className="rounded-full border border-cyan-500/40 bg-cyan-950 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                {healthScore >= 90 ? "HEALTHY" : "DEGRADED"}
              </span>
            </div>
            <div className="my-1 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[32px] font-bold leading-10 tracking-tight text-white">
                  {healthScore}
                  <span className="text-[12px] text-slate-400">/100</span>
                </span>
                <span className="flex items-center gap-0.5 font-mono text-[12px] text-cyan-400">
                  <MS name={degraded > 0 ? "trending_down" : "trending_up"} className="text-[14px]" />
                  {degraded > 0 ? `${degraded} degraded component${degraded > 1 ? "s" : ""}` : "All components nominal"}
                </span>
              </div>
              <div className="relative flex h-16 w-16 items-center justify-center">
                <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                  <path className="text-raised" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                  <path className="text-cyan-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${healthScore}, 100`} strokeLinecap="round" strokeWidth="3.5" />
                </svg>
                <span className="absolute font-mono text-[10px] font-bold text-white">{Math.round(healthScore)}%</span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-meter">
              <div className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" style={{ width: `${healthScore}%` }} />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm">
            <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">Operational Surface</span>
            <div className="grid grid-cols-2 gap-2">
              <MetricTile label="Open Incidents" value={openIncidents.length} note={`${highPriority} High Priority`} icon="policy" valueClass="text-rose-400" noteClass="text-rose-400" />
              <MetricTile label="Alerts Fired" value={alerts.length} note="Rules Active" icon="tune" />
              <MetricTile label="Simulated Assets" value={total} note="Demo Topology" icon="devices" noteClass="text-cyan-400" />
              <MetricTile
                label="Containment"
                value={hasSimulated ? "Active" : "Ready"}
                note={hasSimulated ? `${isolatedIdsLabel(app.isolatedIds)} isolated` : "No simulation running"}
                icon={hasSimulated ? "security" : "check_circle"}
                noteClass={hasSimulated ? "text-amber-300" : "text-cyan-400"}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-outline bg-surface p-3 shadow-sm">
            <span className="mb-1 font-mono text-[11px] uppercase tracking-wider text-slate-400">Investigation Filters</span>
            <button
              onClick={() => navigate({ to: "/security-alerts", search: { status: "under-review" } })}
              className="flex w-full items-center justify-between rounded border border-cyan-500/30 bg-surface-low px-2 py-1.5 text-[12px] text-slate-100 transition-colors hover:bg-active"
            >
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                Under Review
              </span>
              <span className="rounded border border-outline bg-surface-lowest px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-300">{underReview}</span>
            </button>
            <button
              onClick={() => navigate({ to: "/investigations" })}
              className="flex w-full items-center justify-between rounded bg-surface-lowest/60 px-2 py-1.5 text-[12px] text-slate-300 transition-colors hover:bg-surface-low"
            >
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Containment Staged
              </span>
              <span className="rounded bg-surface-low px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-300">{containmentStaged}</span>
            </button>
            <button
              onClick={() => navigate({ to: "/security-alerts", search: { status: "open" } })}
              className="flex w-full items-center justify-between rounded bg-surface-lowest/60 px-2 py-1.5 text-[12px] text-slate-300 transition-colors hover:bg-surface-low"
            >
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Open / Needs Review
              </span>
              <span className="rounded bg-surface-low px-1.5 py-0.5 font-mono text-[10px] font-medium text-cyan-300">{openAlerts}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-outline bg-surface-low p-2 text-slate-400">
            <MS name="polyline" className="text-[18px] text-cyan-400" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] font-semibold text-slate-200">Engine: Graph-Blast v4.9</span>
              <span className="text-[12px] text-slate-400">Simulated topological graph matrix</span>
            </div>
          </div>
        </aside>

        {/* MAIN CENTRAL PANEL: Dependency Graph */}
        <main className="flex flex-col gap-3 lg:col-span-6">
          <div className="flex h-full flex-col rounded-lg border border-outline bg-surface p-3 shadow-sm">
            <div className="flex flex-col justify-between gap-2 border-b border-outline pb-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Threat Overview &amp; Dependency Graph</h2>
                <p className="text-[12px] text-slate-400">Simulated vector propagation traversal &amp; blast radius visualization</p>
              </div>
              <div className="flex items-center gap-1 self-start sm:self-auto">
                <span className="flex items-center gap-1 rounded border border-outline bg-surface-low px-2 py-1 font-mono text-[10px] text-slate-200">
                  <MS name="timeline" className="text-[14px] text-cyan-400" />
                  {blastBefore.paths.length} Paths
                </span>
              </div>
            </div>

            <div className="my-1 flex flex-wrap items-center justify-between gap-1 py-1">
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] font-semibold text-slate-400">FOCUS:</span>
                <span className="flex items-center gap-1 rounded border border-rose-500/50 bg-rose-950/80 px-2 py-0.5 font-mono text-[10px] font-medium text-rose-300 shadow-sm">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-rose-400" />
                  {sourceNode.label} [{sourceNode.id}] — Incident Source
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="h-0.5 w-2.5 bg-rose-400" /> Attack Path</span>
                <span className="flex items-center gap-1"><span className="h-0.5 w-2.5 bg-slate-500" /> Standard Link</span>
                <span className="flex items-center gap-1"><span className="h-0.5 w-2.5 bg-cyan-400" /> Context Link</span>
              </div>
            </div>

            <GraphPanel
              className="relative h-[380px] w-full overflow-hidden rounded-lg border border-outline bg-surface-lowest"
              graph={graph}
              highlight={{
                sourceId: sourceNode.id,
                reachableIds: blastBefore.reachable,
                isolatedIds: app.isolatedIds,
                highlightEdges: uniquePathEdges(blastBefore.paths),
              }}
              onSelectNode={(id) => navigate({ to: "/infrastructure", search: { node: id } })}
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-outline bg-surface-low p-2 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                <span className="font-mono text-[10px] font-semibold text-white">Active Inspector: {sourceNode.id}</span>
                <span className="text-outline">|</span>
                <span className="font-mono text-[10px] text-slate-300">Ingress: {ingress.map((e) => nodeLabel(e.from)).join(", ") || "none"}</span>
                <span className="text-outline">|</span>
                <span className="font-mono text-[10px] text-slate-300">Egress: {egressCount} paths</span>
              </div>
              <div className="font-mono text-[10px] font-medium text-rose-300">
                Simulated Blast Radius: {blastBefore.reachable.length - 1} Components Reachable
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT PANEL: Live Incident Timeline */}
        <aside className="flex flex-col gap-3 lg:col-span-3">
          <div className="flex h-full flex-col rounded-lg border border-outline bg-surface p-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-outline pb-2">
              <div>
                <h3 className="text-[15px] font-semibold text-white">Live Incident Timeline</h3>
                <span className="font-mono text-[10px] font-semibold text-cyan-400">{selectedIncident.id}</span>
              </div>
              <SeverityBadge severity={selectedIncident.severity} />
            </div>
            <p className="my-1 text-[12px] text-slate-400">Target: {selectedIncident.summary}</p>
            <div className="relative my-1 flex flex-col gap-3 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-0.5 before:bg-outline before:content-['']">
              {selectedIncident.timeline.map((entry) => (
                <div key={`${entry.time}-${entry.tag}`} className="relative flex flex-col">
                  <span className={cn("absolute -left-6 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface ring-2", toneRing[entry.tone])}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[entry.tone])} />
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-white">{entry.time}</span>
                    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold", toneTag[entry.tone])}>{entry.tag}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-slate-300">{entry.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-col gap-1 border-t border-outline pt-2">
              <button
                onClick={() => navigate({ to: "/security-alerts" })}
                className="flex items-center justify-between font-mono text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline"
              >
                <span>Review Alert Evidence</span>
                <MS name="arrow_forward" className="text-[16px]" />
              </button>
              <button
                onClick={() => navigate({ to: "/investigations", search: { incident: selectedIncident.id } })}
                className="flex items-center justify-between font-mono text-[11px] text-slate-400 hover:text-slate-200 hover:underline"
              >
                <span>Open Incident Case</span>
                <MS name="policy" className="text-[16px]" />
              </button>
            </div>
          </div>
        </aside>
      </section>

      {/* SIGNATURE CONTAINMENT SIMULATION SECTION */}
      <section className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-3 shadow-sm">
        <div className="flex flex-col justify-between gap-2 border-b border-outline pb-2 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
              <h2 className="text-[15px] font-semibold text-white">Simulate Containment &amp; Blast-Radius Mitigation</h2>
              <span className="rounded border border-outline bg-surface-low px-2 py-0.5 font-mono text-[10px] font-medium text-slate-300">SOAR Dry-Run</span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-400">
              Simulate infrastructure component isolation to evaluate attack vector reduction prior to executing remediation.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded border border-outline bg-surface-low px-2 py-1">
              <span className="mr-2 font-mono text-[10px] text-slate-400">Target Component:</span>
              <span className="font-mono text-[10px] font-semibold text-slate-100">
                {lastIsolatedId ? `${nodeLabel(lastIsolatedId)} (${lastIsolatedId})` : `${sourceNode.label} (${sourceNode.id})`} [{sourceNode.criticality} risk]
              </span>
            </div>
            <button
              onClick={resetScenario}
              className="rounded border border-outline bg-surface-low px-3 py-1.5 font-mono text-[11px] text-slate-300 transition-colors hover:bg-active"
            >
              Reset Scenario
            </button>
            <button
              onClick={() => isolateNode(sourceNode.id)}
              className="flex items-center gap-1 rounded bg-cyan-500 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.3)] transition-all hover:bg-cyan-400"
            >
              <MS name="security" className="text-[16px]" />
              Simulate Isolation
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-outline border-l-4 border-l-rose-500 bg-surface-low p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">Before Containment (Baseline Risk)</span>
              <span className="rounded-full border border-rose-500/50 bg-rose-950 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-300">
                {blastBefore.reachable.length - 1} Reachable
              </span>
            </div>
            <p className="text-[12px] text-slate-400">
              Modeled lateral traversal unlocked from {sourceNode.label} across adjacent dependency tiers.
            </p>
            <div className="my-1 grid grid-cols-2 gap-2">
              <MetricTile label="Potentially Reachable" value={`${blastBefore.reachable.length - 1} Components`} valueClass="text-rose-400" />
              <MetricTile
                label="Critical Tier-1 at Risk"
                value={`${blastBefore.criticalReachable.length} Assets`}
                note={blastBefore.criticalReachable.map(nodeLabel).join(", ") || "none"}
                valueClass="text-rose-400"
              />
              <MetricTile label="Modeled Attack Vectors" value={`${baselineEdges} Edges`} />
              <MetricTile label="Vulnerable Perimeter" value={perimeter} valueClass="text-rose-300" />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-outline border-l-4 border-l-cyan-400 bg-surface-low p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white">After Simulated Containment (Projected)</span>
              {blastAfter && comparison ? (
                <span className="rounded-full border border-cyan-500/50 bg-cyan-950 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                  {Math.max(0, Math.round((1 - (blastAfter.reachable.length - 1) / Math.max(blastBefore.reachable.length - 1, 1)) * 100))}% Threat Mitigated
                </span>
              ) : (
                <span className="rounded-full border border-outline bg-surface px-2 py-0.5 font-mono text-[10px] font-medium text-slate-400">Awaiting Simulation</span>
              )}
            </div>
            {blastAfter && comparison ? (
              <>
                <p className="text-[12px] text-slate-400">
                  {nodeLabel(comparison.isolatedId)} removed from traversal; remaining exposure recalculated from the graph.
                </p>
                <div className="my-1 grid grid-cols-2 gap-2">
                  <MetricTile
                    label="Remaining Reachable"
                    value={`${blastAfter.reachable.length - 1} Components`}
                    note={blastAfter.reachable.length - 1 < blastBefore.reachable.length - 1 ? "Exposure reduced" : "No reduction — pick another target"}
                    valueClass="text-cyan-400"
                  />
                  <MetricTile
                    label="Critical Tier-1 at Risk"
                    value={`${blastAfter.criticalReachable.length} Assets`}
                    note={blastAfter.criticalReachable.map(nodeLabel).join(", ") || "none"}
                  />
                  <MetricTile label="Remaining Attack Vectors" value={`${uniquePathEdges(blastAfter.paths).size} Edges`} valueClass="text-cyan-400" />
                  <MetricTile
                    label="Disrupted Services"
                    value={comparison.disrupted.length > 0 ? `${comparison.disrupted.length} Modeled` : "None"}
                    note={comparison.disrupted.map((d) => d.label).join(", ") || "No dependents affected"}
                    valueClass="text-amber-300"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded border border-dashed border-outline bg-surface-lowest/60 p-6 text-center font-mono text-[11px] text-slate-500">
                Run “Simulate Isolation” to project the contained state from graph data.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded border border-outline bg-surface-low p-2 text-slate-400">
          <MS name="info" className="text-[18px] text-cyan-400" />
          <span className="text-[12px]">
            <strong className="font-medium text-slate-200">Advisory:</strong> Results derived from graph traversal dependencies. Isolation is simulated locally in memory and does not alter live routing tables or network egress.
          </span>
        </div>
      </section>

      {/* LOWER MODULAR PANELS */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm md:col-span-5">
          <div className="flex items-center justify-between border-b border-outline pb-1">
            <h3 className="text-[15px] font-semibold text-white">Recent Security Alerts</h3>
            <span className="font-mono text-[10px] text-slate-400">{alerts.length} active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-outline font-mono text-[10px] text-slate-400">
                  <th className="px-1 py-1">ID</th>
                  <th className="px-1 py-1">Event / Asset</th>
                  <th className="px-1 py-1">Severity</th>
                  <th className="px-1 py-1">Time</th>
                  <th className="px-1 py-1 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {alerts.slice(0, 4).map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => navigate({ to: "/security-alerts", search: { q: a.id } })}
                    className={cn("cursor-pointer transition-colors hover:bg-surface-low", a.severity === "high" && "bg-rose-950/20")}
                  >
                    <td className={cn("px-1 py-1.5 font-mono text-[10px] text-slate-400", a.severity === "high" && "font-bold text-rose-400")}>{a.id}</td>
                    <td className="px-1 py-1.5">
                      <div className={cn("font-medium text-slate-200", a.severity === "high" && "text-white")}>{a.eventType}</div>
                      <div className={cn("font-mono text-[10px] text-slate-400", a.severity === "high" && "font-medium text-rose-400")}>{nodeLabel(a.assetId)} • {a.ruleId}</div>
                    </td>
                    <td className="px-1 py-1.5"><SeverityBadge severity={a.severity} /></td>
                    <td className="px-1 py-1.5 font-mono text-[10px] text-slate-400">{a.detectedAt.slice(11, 16)}</td>
                    <td className="px-1 py-1.5 text-right"><StatusLabel status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm md:col-span-4">
          <div className="flex items-center justify-between border-b border-outline pb-1">
            <h3 className="text-[15px] font-semibold text-white">Analyst Insights (Rule-Based)</h3>
            <MS name="lightbulb" className="text-[18px] text-cyan-400" />
          </div>
          <div className="flex flex-col gap-1">
            <Insight tone="rose" icon="key" title="1. Verify Suspicious Access" text={`Inspect session tokens reaching ${sourceNode.label} and check replay heuristics against the identity provider.`} />
            <Insight tone="amber" icon="account_tree" title="2. Review Critical Dependencies" text={`Evaluate policy rules restricting traversal from ${sourceNode.label} to ${blastBefore.criticalReachable.map(nodeLabel).join(", ") || "downstream assets"}.`} />
            <Insight tone="cyan" icon="balance" title="3. Evaluate Containment Trade-off" text={hasSimulated && comparison ? `Isolating ${nodeLabel(comparison.isolatedId)} reduces modeled exposure to ${blastAfter ? blastAfter.reachable.length - 1 : 0} components; weigh against ${comparison.disrupted.length} disrupted dependents.` : `Simulate isolation of a component on the ${blastBefore.paths.length} modeled paths before remediation.`} />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm md:col-span-3">
          <div>
            <div className="mb-2 flex items-center justify-between border-b border-outline pb-1">
              <h3 className="text-[15px] font-semibold text-white">Severity Spectrum</h3>
              <span className="font-mono text-[10px] text-slate-400">{alerts.length} Total</span>
            </div>
            <div className="mb-2 flex flex-col gap-1">
              <div className="flex h-3 w-full overflow-hidden rounded-full border border-outline bg-meter p-0.5">
                <div className="rounded-l bg-rose-500" style={{ width: `${(severityCounts.critical / severityTotal) * 100}%` }} title={`Critical: ${severityCounts.critical}`} />
                <div className="bg-amber-500" style={{ width: `${(severityCounts.high / severityTotal) * 100}%` }} title={`High: ${severityCounts.high}`} />
                <div className="bg-cyan-500" style={{ width: `${(severityCounts.medium / severityTotal) * 100}%` }} title={`Medium: ${severityCounts.medium}`} />
                <div className="rounded-r bg-slate-500" style={{ width: `${(severityCounts.low / severityTotal) * 100}%` }} title={`Low: ${severityCounts.low}`} />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
                <span className="text-rose-400">Crit ({severityCounts.critical})</span>
                <span className="text-amber-400">High ({severityCounts.high})</span>
                <span className="text-cyan-400">Med ({severityCounts.medium})</span>
                <span className="text-slate-400">Low ({severityCounts.low})</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-t border-outline pt-1">
              <StatRow label="Sensor Node Health" value="99.98%" valueClass="text-cyan-400" />
              <StatRow label="Egress Inspection" value="420 MB/s" valueClass="text-white" />
              <StatRow label="Simulation Engine" value="Graph-Blast Active" valueClass="text-cyan-400" />
            </div>
          </div>
          <button
            onClick={() => navigate({ to: "/security-alerts" })}
            className="mt-1 w-full rounded border border-outline bg-surface-low py-1.5 text-center font-mono text-[11px] text-slate-200 transition-colors hover:bg-active"
          >
            Audit Full Event Stream
          </button>
        </div>
      </section>

      <DemoPill className="self-end sm:hidden" />
    </>
  );
}

function isolatedIdsLabel(ids: string[]): string {
  return ids.length === 1 ? "1 component" : `${ids.length} components`;
}

function Insight({ tone, icon, title, text }: { tone: "rose" | "amber" | "cyan"; icon: string; title: string; text: string }) {
  const box = {
    rose: "border-rose-500/40 bg-rose-950/80 text-rose-300",
    amber: "border-amber-500/40 bg-amber-950/80 text-amber-300",
    cyan: "border-cyan-500/40 bg-cyan-950/80 text-cyan-300",
  }[tone];
  return (
    <div className="flex items-start gap-2 rounded border border-outline bg-surface-low p-2">
      <div className={cn("mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border", box)}>
        <MS name={icon} className="text-[14px]" />
      </div>
      <div className="flex flex-col">
        <span className="text-[12px] font-semibold text-slate-200">{title}</span>
        <span className="text-[11px] text-slate-400">{text}</span>
      </div>
    </div>
  );
}

function StatRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-slate-400">{label}</span>
      <span className={cn("font-mono text-[10px] font-semibold", valueClass)}>{value}</span>
    </div>
  );
}

const toneRing = {
  rose: "ring-rose-500",
  amber: "ring-amber-500",
  cyan: "ring-cyan-500",
  slate: "ring-slate-400",
  teal: "ring-teal-400",
};
const toneDot = {
  rose: "bg-rose-400",
  amber: "bg-amber-400",
  cyan: "bg-cyan-400",
  slate: "bg-slate-300",
  teal: "bg-teal-400",
};
const toneTag = {
  rose: "border border-rose-500/40 bg-rose-950 text-rose-300",
  amber: "border border-amber-500/40 bg-amber-950 text-amber-300",
  cyan: "border border-cyan-500/40 bg-cyan-950 text-cyan-300",
  slate: "border border-outline bg-hover-strong text-slate-300",
  teal: "border border-teal-500/40 bg-teal-950 text-teal-300",
};
