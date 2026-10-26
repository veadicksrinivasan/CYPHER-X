import type { BlastResult, ContainmentComparison } from "@/lib/blast-radius";
import type { Alert, Incident } from "@/data/types";



/** Plain-text investigation report built entirely from calculated results. */
export function buildReportText(input: {
  incident: Incident;
  alert?: Alert;
  before: BlastResult;
  after: BlastResult | null;
  comparison: ContainmentComparison | null;
  nodeLabel: (id: string) => string;
}): string {
  const { incident, alert, before, after, comparison, nodeLabel } = input;
  const lines: string[] = [];
  const add = (s = "") => lines.push(s);

  add("CYPHER-X INVESTIGATION REPORT (SIMULATED DEMONSTRATION)");
  add("========================================================");
  add();
  add(`Incident: ${incident.id} — ${incident.title}`);
  add(`Severity: ${incident.severity.toUpperCase()}   Status: ${incident.status}`);
  add(`Scenario note: All data is simulated. Nothing here reflects a live environment.`);
  add();

  add("DETECTION");
  add("---------");
  if (alert) {
    add(`Alert: ${alert.id} via rule ${alert.ruleId} (${alert.ruleName})`);
    add(`Detected at: ${alert.detectedAt}`);
    add(`Reason: ${alert.detectionReason}`);
    add("Evidence:");
    for (const e of alert.evidence) add(`  - [${e.eventId}] ${e.summary} ${e.detail}`);
  } else {
    add("Linked alert not present (it may be filtered out by current detection settings).");
  }
  add();

  add("BLAST-RADIUS ANALYSIS (BASELINE)");
  add("--------------------------------");
  add(`Incident source: ${nodeLabel(before.sourceId)} [${before.sourceId}]`);
  add(`Potentially reachable components (${before.reachable.length}): ${before.reachable.map(nodeLabel).join(", ")}`);
  add(`Critical assets potentially reachable (${before.criticalReachable.length}): ${before.criticalReachable.map(nodeLabel).join(", ") || "none"}`);
  add(`Modeled attack paths enumerated: ${before.paths.length}`);
  before.paths.slice(0, 12).forEach((p, i) => add(`  Path ${i + 1}: ${p.map(nodeLabel).join(" -> ")}`));
  if (before.paths.length > 12) add(`  ... ${before.paths.length - 12} more paths`);
  add();

  if (comparison && after) {
    add("SIMULATED CONTAINMENT");
    add("---------------------");
    add(`Action: Simulate isolation of ${nodeLabel(comparison.isolatedId)} [${comparison.isolatedId}]`);
    add(`Reachable components: ${before.reachable.length} -> ${after.reachable.length}`);
    add(`Critical assets at risk: ${before.criticalReachable.length} -> ${after.criticalReachable.length}`);
    add(`Enumerated attack paths: ${before.paths.length} -> ${after.paths.length}`);
    add(`Attack-path edges removed: ${comparison.removedPathEdges}`);
    add(`Remaining exposure after containment: ${after.reachable.filter((id) => id !== after.sourceId).map(nodeLabel).join(", ") || "none beyond the source itself"}`);
    if (comparison.disrupted.length > 0) {
      add("Modeled service disruption:");
      for (const d of comparison.disrupted) add(`  - ${d.label}: ${d.reason}`);
    } else {
      add("Modeled service disruption: none recorded.");
    }
    add("Alternative paths remaining: see path list above for post-containment routes.");
  } else {
    add("SIMULATED CONTAINMENT");
    add("---------------------");
    add("No containment simulated for the current scenario yet.");
  }
  add();

  add("ASSUMPTIONS & LIMITATIONS");
  add("-------------------------");
  add("- Graph reachability models potential exposure only; it does not prove that an attacker accessed or compromised any component.");
  add("- Isolation is simulated in memory. No firewall, account, or network changes are executed.");
  add("- Service disruption estimates come from dependency edges in the simulated graph.");
  add("- Alerts are produced by transparent rules over simulated telemetry; terminology is 'suspicious activity', not confirmed attack.");
  add();

  return lines.join("\n");
}

/** Short triage brief for the header export button. */
export function buildTriageBrief(input: {
  alerts: Alert[];
  incident: Incident;
  before: BlastResult;
  nodeLabel: (id: string) => string;
}): string {
  const { alerts, incident, before, nodeLabel } = input;
  const lines: string[] = [];
  lines.push("CYPHER-X TRIAGE BRIEF (SIMULATED DATA)");
  lines.push("======================================");
  lines.push("");
  lines.push(`Focused incident: ${incident.id} — ${incident.title} (${incident.severity})`);
  lines.push(`Source component: ${nodeLabel(incident.sourceNodeId)}`);
  lines.push(`Baseline potentially reachable: ${before.reachable.length} components`);
  lines.push(`Critical assets potentially reachable: ${before.criticalReachable.map(nodeLabel).join(", ") || "none"}`);
  lines.push("");
  lines.push("Active alerts:");
  for (const a of alerts) {
    lines.push(`  ${a.id} [${a.severity.toUpperCase()}] ${a.title} — ${a.status}`);
  }
  lines.push("");
  lines.push("Generated locally from simulated demo data.");
  return lines.join("\n");
}

