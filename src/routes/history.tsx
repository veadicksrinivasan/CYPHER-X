import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/state/app-store";
import { getNodeLabel } from "@/data/infrastructure";
import { MS, MetricTile } from "@/components/shared";

export const Route = createFileRoute("/history")({
  component: SimulationHistoryPage,
});

function SimulationHistoryPage() {
  const { history, clearHistory, selectScenario, isolateNode } = useApp();

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner */}
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
              <MS name="history" className="text-[20px]" />
            </span>
            <h1 className="text-[16px] font-bold text-white">Simulation History &amp; Audit Log</h1>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Chronological audit trail of all containment simulations executed during this session (stored locally)
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1 rounded border border-rose-500/40 bg-rose-950/60 px-3 py-1.5 font-mono text-[11px] text-rose-300 hover:bg-rose-900 transition-colors"
          >
            <MS name="delete" className="text-[16px]" />
            Clear Demo History
          </button>
        )}
      </section>

      {/* History Table or Empty State */}
      <div className="rounded-lg border border-outline bg-surface p-3.5 shadow-sm">
        <div className="mb-2 flex items-center justify-between border-b border-outline pb-2">
          <h2 className="text-[14px] font-bold text-white">Recorded Simulation Sessions</h2>
          <span className="font-mono text-[10px] text-cyan-400">{history.length} records</span>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-outline font-mono text-[10px] text-slate-400">
                  <th className="px-2 py-2">SIMULATION ID</th>
                  <th className="px-2 py-2">TIMESTAMP</th>
                  <th className="px-2 py-2">SCENARIO</th>
                  <th className="px-2 py-2">INGRESS ORIGIN</th>
                  <th className="px-2 py-2">QUARANTINED TARGET</th>
                  <th className="px-2 py-2">EXPOSURE DELTA</th>
                  <th className="px-2 py-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline font-mono text-[11px]">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-low transition-colors">
                    <td className="px-2 py-2.5 font-bold text-cyan-400">{record.id}</td>
                    <td className="px-2 py-2.5 text-slate-400 text-[10px]">
                      {new Date(record.timestamp).toLocaleTimeString()} ({new Date(record.timestamp).toLocaleDateString()})
                    </td>
                    <td className="px-2 py-2.5 font-sans font-medium text-slate-200">{record.scenarioTitle}</td>
                    <td className="px-2 py-2.5 text-rose-300">
                      {getNodeLabel(record.sourceNodeId)} [{record.sourceNodeId}]
                    </td>
                    <td className="px-2 py-2.5 text-amber-300 font-bold">
                      {record.isolatedNodeId ? `${getNodeLabel(record.isolatedNodeId)} [${record.isolatedNodeId}]` : "None"}
                    </td>
                    <td className="px-2 py-2.5 text-teal-300 font-bold">
                      {record.beforeReachableCount} → {record.afterReachableCount} (-{record.mitigatedCount} assets)
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button
                        onClick={() => {
                          selectScenario(record.scenarioId);
                          if (record.isolatedNodeId) {
                            isolateNode(record.isolatedNodeId);
                          }
                        }}
                        className="rounded border border-outline bg-surface-lowest px-2 py-1 text-[10px] text-cyan-400 hover:bg-surface-hover"
                      >
                        Replay Scenario
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <MS name="hourglass_empty" className="text-[36px] text-slate-500 mb-2" />
            <div className="text-[14px] font-bold text-slate-300">No Simulations Recorded Yet</div>
            <p className="mt-1 max-w-sm text-[12px] text-slate-400">
              Run containment simulations from the Dashboard or Containment Sandbox. Completed simulations will automatically log here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

