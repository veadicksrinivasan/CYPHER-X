import type { AttackPathResult, IsolationComparisonResult, InfrastructureGraph } from "@/types/infrastructure";
import type { IncidentScenario } from "@/data/incidents";
import { getNodeLabel } from "@/data/infrastructure";

export interface InvestigationReportData {
  incident: IncidentScenario;
  before: AttackPathResult;
  after?: AttackPathResult | null;
  comparison?: IsolationComparisonResult | null;
  graph: InfrastructureGraph;
}

export function generateReportPlainText(data: InvestigationReportData): string {
  const { incident, before, after, comparison, graph } = data;
  const lines: string[] = [];
  const add = (text = "") => lines.push(text);

  add("================================================================================");
  add("               CYPHER-X DEFENSIVE CYBERSECURITY INCIDENT REPORT                  ");
  add("               SIMULATION & GRAPH BLAST-RADIUS ASSESSMENT                       ");
  add("================================================================================");
  add();
  add(`Report Timestamp: ${new Date().toISOString()}`);
  add(`Target Incident Scenario: ${incident.scenarioCode} — ${incident.title}`);
  add(`Incident Identifier: ${incident.id}`);
  add(`Severity Classification: ${incident.severity.toUpperCase()}`);
  add(`Modeled Ingress Source: ${getNodeLabel(before.sourceNodeId)} [${before.sourceNodeId}]`);
  add(`Adversary TTP: ${incident.adversaryTTP}`);
  add();

  add("--------------------------------------------------------------------------------");
  add("1. BASELINE BLAST-RADIUS EVALUATION (PRE-CONTAINMENT)");
  add("--------------------------------------------------------------------------------");
  add(`Total Structurally Reachable Nodes: ${before.reachableNodeIds.length}`);
  add(`Reachable Assets: ${before.reachableNodeIds.map(getNodeLabel).join(", ") || "None"}`);
  add(`Critical Tier-1 Assets At Risk: ${before.criticalNodesReached.length}`);
  if (before.criticalNodesReached.length > 0) {
    add(`Critical Entities List: ${before.criticalNodesReached.map((id) => `${getNodeLabel(id)} [${id}]`).join(", ")}`);
  }
  add(`Enumerated Lateral Attack Paths: ${before.paths.length}`);
  before.paths.slice(0, 15).forEach((path, idx) => {
    add(`  [Path ${idx + 1}]: ${path.nodeIds.map(getNodeLabel).join(" -> ")}`);
  });
  if (before.paths.length > 15) {
    add(`  ... (${before.paths.length - 15} additional paths omitted for brevity)`);
  }
  add();

  add("--------------------------------------------------------------------------------");
  add("2. SIMULATED CONTAINMENT & MITIGATION ANALYSIS");
  add("--------------------------------------------------------------------------------");
  if (comparison && after) {
    const isolatedLabel = getNodeLabel(comparison.isolatedNodeId);
    const beforeCount = before.reachableNodeIds.length;
    const afterCount = after.reachableNodeIds.length;
    const mitigated = beforeCount - afterCount;
    const critMitigated = before.criticalNodesReached.filter(
      (c) => !after.criticalNodesReached.includes(c),
    );

    add(`Containment Action Taken: SIMULATED QUARANTINE OF [${isolatedLabel}]`);
    add(`Reachable Entity Delta: ${beforeCount} -> ${afterCount} (Exposure reduced by ${mitigated} assets)`);
    add(`Tier-1 Critical Assets Mitigated: ${critMitigated.length} (${critMitigated.map(getNodeLabel).join(", ") || "None"})`);
    add(`Remaining Attack Vectors: ${after.paths.length} active paths`);
    if (after.reachableNodeIds.length > 0) {
      add(`Remaining Exposed Assets: ${after.reachableNodeIds.map(getNodeLabel).join(", ")}`);
    } else {
      add("Zero downstream components remain reachable. Full perimeter containment achieved.");
    }
  } else {
    add("Status: Baseline analysis only. No isolation action has been simulated yet.");
  }
  add();

  add("--------------------------------------------------------------------------------");
  add("3. SIMULATION ASSUMPTIONS & DISCLAIMERS");
  add("--------------------------------------------------------------------------------");
  before.assumptions.forEach((assumption, idx) => {
    add(`[A${idx + 1}] ${assumption}`);
  });
  add();
  add("⚠️ DISCLAIMER: Results reflect deterministic graph reachability analysis on a modeled");
  add("infrastructure topology. Graph reachability does NOT prove live exploitability,");
  add("system compromise, or active malware execution. Review by qualified SOC staff required.");
  add("================================================================================");

  return lines.join("\n");
}
