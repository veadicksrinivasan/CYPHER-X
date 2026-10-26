import type { AttackPathResult, IsolationComparisonResult, InfrastructureGraph } from "@/types/infrastructure";
import { getNodeLabel } from "@/data/infrastructure";

export interface AIAnalysisReport {
  summary: string;
  threatTrajectory: string;
  criticalExposureDebrief: string;
  containmentRecommendation: string;
  disclaimer: string;
}

/**
 * AI-Assisted Security Reasoning Engine.
 * Synthesizes deterministic graph traversal results into actionable SOC intelligence.
 * Strictly adheres to verified engine outputs — never fabricates vulnerabilities or unverified paths.
 */
export function generateAIAnalysis(
  graph: InfrastructureGraph,
  sourceNodeId: string,
  blastResult: AttackPathResult,
  comparison?: IsolationComparisonResult | null,
): AIAnalysisReport {
  const sourceLabel = getNodeLabel(sourceNodeId);
  const reachableCount = blastResult.reachableNodeIds.length;
  const criticalCount = blastResult.criticalNodesReached.length;
  const pathCount = blastResult.paths.length;

  // 1. Executive Summary
  let summary = `Modeled attack propagation originating at ${sourceLabel} (${sourceNodeId}) reveals a potential structural blast radius of ${reachableCount} component${reachableCount === 1 ? "" : "s"}. `;
  if (criticalCount > 0) {
    const critLabels = blastResult.criticalNodesReached.map(getNodeLabel).join(", ");
    summary += `CRITICAL EXPOSURE WARNING: ${criticalCount} Tier-1 critical asset${criticalCount === 1 ? "" : "s"} (${critLabels}) are structurally reachable via ${pathCount} modeled propagation path${pathCount === 1 ? "" : "s"}.`;
  } else {
    summary += `No Tier-1 critical assets are structurally exposed from this origin under active propagation rules.`;
  }

  // 2. Trajectory narrative
  let threatTrajectory = "";
  if (pathCount === 0) {
    threatTrajectory = `Traversal is completely halted at the perimeter. Zero downstream propagation edges allow traversal from ${sourceLabel}.`;
  } else {
    const shortestPath = [...blastResult.paths].sort((a, b) => a.nodeIds.length - b.nodeIds.length)[0];
    const pathText = shortestPath.nodeIds.map(getNodeLabel).join(" -> ");
    threatTrajectory = `Shortest modeled attack trajectory spans ${shortestPath.nodeIds.length - 1} network hop(s): [${pathText}]. The adversary can exploit valid dependency and trust links without traversing monitored perimeter controls.`;
  }

  // 3. Critical Exposure
  let criticalExposureDebrief = "";
  if (criticalCount > 0) {
    criticalExposureDebrief = `Targeted high-value entities include: ${blastResult.criticalNodesReached.map((id) => `${getNodeLabel(id)} [${id}]`).join(", ")}. These assets require immediate credential cycling and network policy enforcement.`;
  } else {
    criticalExposureDebrief = `All modeled exposure is currently restricted to intermediate service layers and non-critical tiers.`;
  }

  // 4. Containment recommendation
  let containmentRecommendation = "";
  if (comparison) {
    const isolatedLabel = getNodeLabel(comparison.isolatedNodeId);
    const beforeCount = comparison.before.reachableNodeIds.length;
    const afterCount = comparison.after.reachableNodeIds.length;
    const mitigatedCount = beforeCount - afterCount;
    const mitigatedCrits = comparison.before.criticalNodesReached.filter(
      (id) => !comparison.after.criticalNodesReached.includes(id),
    );

    containmentRecommendation = `SIMULATION OUTCOME: Isolating ${isolatedLabel} successfully eliminates exposure to ${mitigatedCount} downstream component${mitigatedCount === 1 ? "" : "s"}`;
    if (mitigatedCrits.length > 0) {
      containmentRecommendation += ` and safeguards ${mitigatedCrits.length} Tier-1 asset(s): ${mitigatedCrits.map(getNodeLabel).join(", ")}. `;
    } else {
      containmentRecommendation += `. `;
    }
    if (afterCount > 0) {
      containmentRecommendation += `Note: ${afterCount} component(s) remain reachable via alternative lateral vectors. Secondary isolation of upstream routing nodes is advised.`;
    } else {
      containmentRecommendation += `The threat perimeter is fully contained from this source.`;
    }
  } else {
    containmentRecommendation = `Recommended immediate action: Execute simulated isolation on the highest-centrality transit node along the modeled attack paths before committing live firewall or access rule changes.`;
  }

  const disclaimer =
    "AI Advisory Disclaimer: This analysis is derived strictly from modeled graph topology reachability. It does not establish exploitability, active exploit payloads, or physical breach status in a live production environment.";

  return {
    summary,
    threatTrajectory,
    criticalExposureDebrief,
    containmentRecommendation,
    disclaimer,
  };
}

