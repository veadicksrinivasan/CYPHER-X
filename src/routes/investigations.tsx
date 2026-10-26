import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useApp } from "@/state/app-store";
import { getNodeLabel } from "@/data/infrastructure";
import { MS, MetricTile, SeverityBadge } from "@/components/shared";
import { cn } from "@/lib/utils";

interface InvestigationsSearch {
  incident?: string;
}

export const Route = createFileRoute("/investigations")({
  validateSearch: (search: Record<string, unknown>): InvestigationsSearch => {
    return {
      incident: typeof search.incident === "string" ? search.incident : undefined,
    };
  },
  component: InvestigationsPage,
});

function InvestigationsPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { scenarios, selectedScenario, selectScenario, blastBefore, blastAfter, hasSimulated } = useApp();

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner */}
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
              <MS name="policy" className="text-[20px]" />
            </span>
            <h1 className="text-[16px] font-bold text-white">Incident Scenarios &amp; Case Management</h1>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Synthetic adversary compromise vectors evaluated under strict BFS propagation rules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/containment" })}
            className="flex items-center gap-1 rounded bg-cyan-500 px-3.5 py-1.5 font-mono text-[11px] font-bold text-slate-950 hover:bg-cyan-400 shadow-md transition-colors"
          >
            <MS name="security" className="text-[16px]" />
            Simulate Quarantine
          </button>
        </div>
      </section>

      {/* Scenario Cards Grid (Scenario A, Scenario B, Scenario C) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {scenarios.map((sc) => {
          const isSelected = selectedScenario.id === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => selectScenario(sc.id)}
              className={cn(
                "flex flex-col justify-between rounded-lg border p-3.5 shadow-sm cursor-pointer transition-all",
                isSelected
                  ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400/50"
                  : "border-outline bg-surface hover:border-slate-500 hover:bg-surface-hover",
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-surface-lowest px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-400 border border-outline">
                    {sc.scenarioCode}
                  </span>
                  <SeverityBadge severity={sc.severity} />
                </div>

                <h3 className="mt-2 text-[14px] font-bold text-white leading-snug">{sc.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{sc.summary}</p>

                <div className="mt-3 rounded border border-outline bg-surface-lowest p-2 font-mono text-[10px]">
                  <div className="text-slate-400">INGRESS ORIGIN:</div>
                  <div className="text-white font-semibold">{getNodeLabel(sc.sourceNodeId)} [{sc.sourceNodeId}]</div>
                  <div className="mt-1 text-slate-400">MITRE TTP:</div>
                  <div className="text-cyan-300 truncate">{sc.adversaryTTP}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-outline pt-2 font-mono text-[11px]">
                <span className={cn("font-bold", isSelected ? "text-cyan-300" : "text-slate-400")}>
                  {isSelected ? "✓ ACTIVE SCENARIO" : "Click to Activate"}
                </span>
                <MS name="arrow_forward" className="text-[16px] text-cyan-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Scenario Deep-Dive & Timeline */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Timeline & Ingress Evidence */}
        <div className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm lg:col-span-7">
          <div className="border-b border-outline pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-cyan-400">{selectedScenario.id}</span>
              <h2 className="text-[15px] font-bold text-white">{selectedScenario.title}</h2>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Detailed chronological telemetry of the hypothetical breach progression
            </p>
          </div>

          <div className="relative flex flex-col gap-3 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-0.5 before:bg-outline before:content-['']">
            {selectedScenario.timeline.map((entry, idx) => (
              <div key={idx} className="relative flex flex-col">
                <span className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-cyan-400 ring-2 ring-surface" />
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-white">{entry.time}</span>
                  <span className="rounded bg-surface-low border border-outline px-1.5 py-0.5 font-mono text-[9px] text-cyan-300">
                    {entry.tag}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-slate-300">{entry.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Calculated Blast Radius for this scenario */}
        <div className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm lg:col-span-5">
          <div className="border-b border-outline pb-2">
            <h2 className="text-[14px] font-bold text-white">Engine Reachability Calculation</h2>
            <p className="text-[11px] text-slate-400">Direct output from calculateBlastRadius(graph, source)</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricTile
              label="Reachable Assets"
              value={`${blastBefore.reachableNodeIds.length} Nodes`}
              note={`${blastBefore.paths.length} active simple paths`}
              valueClass="text-rose-400"
            />
            <MetricTile
              label="Critical Assets"
              value={`${blastBefore.criticalNodesReached.length} Entities`}
              note={blastBefore.criticalNodesReached.map(getNodeLabel).join(", ") || "None"}
              valueClass="text-amber-400"
            />
          </div>

          <div className="rounded border border-outline bg-surface-low p-2.5 font-mono text-[11px]">
            <span className="font-bold uppercase text-slate-400">Simulation Assumptions:</span>
            <ul className="mt-1 list-disc pl-4 text-slate-300 text-[10px] space-y-1">
              {blastBefore.assumptions.slice(0, 3).map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>

          <div className="mt-auto border-t border-outline pt-2 flex items-center justify-between">
            <button
              onClick={() => navigate({ to: "/blast-radius" })}
              className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:underline"
            >
              <MS name="polyline" className="text-[15px]" />
              Analyze All Paths
            </button>
            <button
              onClick={() => navigate({ to: "/containment" })}
              className="flex items-center gap-1 font-mono text-[11px] text-rose-400 hover:underline"
            >
              <MS name="security" className="text-[15px]" />
              Stage Quarantine Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

