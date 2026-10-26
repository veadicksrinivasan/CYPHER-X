import { describe, expect, it } from "vitest";
import { calculateBlastRadius, simulateIsolation } from "./blastRadius";
import { syntheticGraph, getNodeById } from "../data/infrastructure";
import { incidentScenarios } from "../data/incidents";
import { generateReportPlainText } from "../lib/report";
import { generateAIAnalysis } from "./aiReasoning";

describe("CYPHER-X End-to-End Defensive Pipeline", () => {
  it("Scenario A (Web Server): calculates valid blast radius reachability", () => {
    const scenario = incidentScenarios.find((s) => s.scenarioCode === "SCENARIO_A")!;
    expect(scenario).toBeDefined();

    const result = calculateBlastRadius(syntheticGraph, scenario.sourceNodeId);

    expect(result.sourceNodeId).toBe("srv-web-01");
    // Traversal reaches vpn-gw-01 and downstream tiers
    expect(result.reachableNodeIds).toContain("vpn-gw-01");
    expect(result.reachableNodeIds).toContain("auth-svc");
    expect(result.reachableNodeIds).toContain("db-claims-01");
    // Air-gapped vault must NOT be reached (propagation blocked)
    expect(result.reachableNodeIds).not.toContain("bk-vault-01");
  });

  it("Scenario B (Admin Workstation): identifies compromised high-privilege jump host", () => {
    const scenario = incidentScenarios.find((s) => s.scenarioCode === "SCENARIO_B")!;
    expect(scenario).toBeDefined();

    const result = calculateBlastRadius(syntheticGraph, scenario.sourceNodeId);
    expect(result.sourceNodeId).toBe("ws-admin-01");
    expect(result.criticalNodesReached.length).toBeGreaterThan(0);
    expect(result.paths.length).toBeGreaterThan(0);
  });

  it("Simulated Isolation: quarantining vpn-gw-01 reduces reachable blast radius", () => {
    const comparison = simulateIsolation(syntheticGraph, "srv-web-01", "vpn-gw-01");

    expect(comparison.isolatedNodeId).toBe("vpn-gw-01");
    expect(comparison.before.reachableNodeIds.length).toBeGreaterThan(
      comparison.after.reachableNodeIds.length,
    );
    // Downstream nodes must now be unreached because vpn-gw-01 is isolated
    expect(comparison.after.reachableNodeIds).not.toContain("db-claims-01");
  });

  it("Report Generation: produces valid structured cybersecurity report", () => {
    const scenario = incidentScenarios[0];
    const before = calculateBlastRadius(syntheticGraph, scenario.sourceNodeId);
    const comparison = simulateIsolation(syntheticGraph, scenario.sourceNodeId, "vpn-gw-01");

    const report = generateReportPlainText({
      incident: scenario,
      before,
      after: comparison.after,
      comparison,
      graph: syntheticGraph,
    });

    expect(report).toContain("CYPHER-X DEFENSIVE CYBERSECURITY INCIDENT REPORT");
    expect(report).toContain("BASELINE BLAST-RADIUS EVALUATION");
    expect(report).toContain("SIMULATED QUARANTINE OF [Remote Access Gateway]");
  });

  it("AI-Assisted Reasoning: synthesizes verified threat trajectory without fabrication", () => {
    const before = calculateBlastRadius(syntheticGraph, "srv-web-01");
    const aiReport = generateAIAnalysis(syntheticGraph, "srv-web-01", before, null);

    expect(aiReport.summary).toContain("srv-web-01");
    expect(aiReport.threatTrajectory).toContain("Shortest modeled attack trajectory");
    expect(aiReport.disclaimer).toContain("AI Advisory Disclaimer");
  });
});

