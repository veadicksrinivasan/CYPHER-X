import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/state/app-store";
import { getNodeLabel } from "@/data/infrastructure";
import { generateReportPlainText } from "@/lib/report";
import { MS, SeverityBadge } from "@/components/shared";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
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

function ReportsPage() {
  const {
    graph,
    selectedScenario,
    sourceNode,
    blastBefore,
    blastAfter,
    comparison,
    hasSimulated,
    aiReport,
  } = useApp();

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const reportText = generateReportPlainText({
      incident: selectedScenario,
      before: blastBefore,
      after: blastAfter,
      comparison,
      graph,
    });
    downloadText(`cypherx-report-${selectedScenario.id}.txt`, reportText);
  };

  const beforeCount = blastBefore.reachableNodeIds.length;
  const afterCount = blastAfter ? blastAfter.reachableNodeIds.length : beforeCount;
  const mitigatedNodes = blastBefore.reachableNodeIds.filter(
    (id) => blastAfter && !blastAfter.reachableNodeIds.includes(id),
  );
  const remainingNodes = blastAfter ? blastAfter.reachableNodeIds : blastBefore.reachableNodeIds;

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner (hidden on print) */}
      <section className="no-print flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
              <MS name="receipt_long" className="text-[20px]" />
            </span>
            <h1 className="text-[16px] font-bold text-white">Security Operations Impact Report</h1>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Formally documented blast-radius assessment and containment simulation audit report
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 rounded border border-outline bg-surface-low px-3 py-1.5 font-mono text-[11px] text-slate-200 hover:bg-surface-hover transition-colors"
          >
            <MS name="download" className="text-[16px]" />
            Download Plain Text
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 rounded bg-cyan-500 px-3.5 py-1.5 font-mono text-[11px] font-bold text-slate-950 hover:bg-cyan-400 shadow-md transition-colors"
          >
            <MS name="print" className="text-[16px]" />
            Print / Save to PDF
          </button>
        </div>
      </section>

      {/* Printable Report Document Card */}
      <div className="printable-report flex flex-col gap-4 rounded-lg border border-outline bg-surface p-6 shadow-md text-slate-200">
        {/* Document Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-outline pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[18px] font-bold text-white">CYPHER-X</span>
              <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase">
                / ANALYZE / SIMULATE / DEFEND
              </span>
            </div>
            <h2 className="mt-1 text-[18px] font-bold text-white">
              Incident Blast-Radius Assessment &amp; Containment Simulation Report
            </h2>
            <div className="mt-1 flex flex-wrap gap-3 font-mono text-[11px] text-slate-400">
              <span>Date: {new Date().toLocaleDateString()}</span>
              <span>•</span>
              <span>Case ID: {selectedScenario.id}</span>
              <span>•</span>
              <span>Classification: DEFENSIVE SIMULATION ONLY</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <SeverityBadge severity={selectedScenario.severity} />
          </div>
        </div>

        {/* Section 1: Incident Scenario Summary */}
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-wider text-cyan-400">
            1. Incident Scenario Overview
          </h3>
          <div className="grid grid-cols-1 gap-2 rounded border border-outline bg-surface-lowest p-3 sm:grid-cols-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-400">Scenario Code:</span>{" "}
              <span className="font-semibold text-white">{selectedScenario.scenarioCode}</span>
            </div>
            <div>
              <span className="text-slate-400">Ingress Asset:</span>{" "}
              <span className="font-semibold text-white">
                {sourceNode.label} [{sourceNode.id}]
              </span>
            </div>
            <div>
              <span className="text-slate-400">Adversary TTP:</span>{" "}
              <span className="text-rose-300">{selectedScenario.adversaryTTP}</span>
            </div>
            <div>
              <span className="text-slate-400">Simulation Status:</span>{" "}
              <span className="text-teal-300 font-semibold">{hasSimulated ? "Containment Staged" : "Baseline Scan"}</span>
            </div>
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-300">{selectedScenario.summary}</p>
        </div>

        {/* Section 2: Baseline vs Post-Isolation Metrics */}
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-wider text-cyan-400">
            2. Quantitative Blast-Radius Evaluation
          </h3>
          <div className="overflow-x-auto rounded border border-outline">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-surface-low font-mono text-[10px] text-slate-400 border-b border-outline">
                <tr>
                  <th className="p-2.5">METRIC</th>
                  <th className="p-2.5">BASELINE (PRE-CONTAINMENT)</th>
                  <th className="p-2.5">POST-ISOLATION (PROJECTED)</th>
                  <th className="p-2.5 text-right">NET DELTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline font-mono text-[11px]">
                <tr>
                  <td className="p-2.5 font-sans font-medium text-white">Structurally Reachable Assets</td>
                  <td className="p-2.5 text-rose-400 font-bold">{beforeCount} components</td>
                  <td className="p-2.5 text-teal-400 font-bold">{afterCount} components</td>
                  <td className="p-2.5 text-right text-teal-300 font-bold">-{beforeCount - afterCount} assets</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-white">Tier-1 Critical Entities at Risk</td>
                  <td className="p-2.5 text-rose-400 font-bold">{blastBefore.criticalNodesReached.length} assets</td>
                  <td className="p-2.5 text-slate-300">
                    {blastAfter ? blastAfter.criticalNodesReached.length : blastBefore.criticalNodesReached.length} assets
                  </td>
                  <td className="p-2.5 text-right text-teal-300 font-bold">
                    -{blastBefore.criticalNodesReached.length - (blastAfter ? blastAfter.criticalNodesReached.length : blastBefore.criticalNodesReached.length)} critical
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-white">Enumerated Attack Paths</td>
                  <td className="p-2.5 text-slate-300">{blastBefore.paths.length} paths</td>
                  <td className="p-2.5 text-slate-300">{blastAfter ? blastAfter.paths.length : blastBefore.paths.length} paths</td>
                  <td className="p-2.5 text-right text-teal-300 font-bold">
                    -{blastBefore.paths.length - (blastAfter ? blastAfter.paths.length : blastBefore.paths.length)} paths
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans font-medium text-white">Quarantine Target</td>
                  <td className="p-2.5 text-slate-500">None (Full exposure)</td>
                  <td className="p-2.5 text-amber-300 font-bold">
                    {comparison ? `${getNodeLabel(comparison.isolatedNodeId)} [${comparison.isolatedNodeId}]` : "None"}
                  </td>
                  <td className="p-2.5 text-right text-amber-300">Quarantine active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: AI Security Analysis & Observations */}
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-wider text-cyan-400">
            3. AI Threat Trajectory &amp; Observations
          </h3>
          <div className="rounded border border-outline bg-surface-lowest p-3 space-y-2 text-[12px] leading-relaxed">
            <p><strong className="text-white">Summary:</strong> {aiReport.summary}</p>
            <p><strong className="text-white">Threat Trajectory:</strong> {aiReport.threatTrajectory}</p>
            <p><strong className="text-white">Critical Exposure:</strong> {aiReport.criticalExposureDebrief}</p>
            <p><strong className="text-white">Recommended Action:</strong> {aiReport.containmentRecommendation}</p>
          </div>
        </div>

        {/* Section 4: Simulation Assumptions & Limitations */}
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-[12px] font-bold uppercase tracking-wider text-cyan-400">
            4. Simulation Methodology, Assumptions &amp; Disclaimers
          </h3>
          <ul className="list-disc pl-5 font-mono text-[10px] text-slate-300 space-y-1">
            {blastBefore.assumptions.map((assumption, idx) => (
              <li key={idx}>{assumption}</li>
            ))}
            <li>
              Simulated isolation is computed strictly in memory on a structural copy of the graph. No network routing,
              firewall access control lists, or identity directory objects are altered on live systems.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

