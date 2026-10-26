import type { DependencyEdge, InfrastructureGraphData, InfraNode } from "@/data/types";

/**
 * Graph-Blast engine — deterministic infrastructure blast-radius analysis.
 *
 * Pure functions only: no React, no randomness, no hardcoded results.
 * Edge semantics follow src/data/infrastructure.ts: `from -> to` means
 * "from depends on to"; traversal follows the dependency direction; edges
 * with `traversable: false` are never traversed; isolated components are
 * removed from traversal entirely.
 *
 * Reachability here means *modeled potential exposure* in the simulated
 * graph. It does not prove that an attacker accessed or compromised any
 * component.
 */

/** Upper bound on enumerated simple paths so deep graphs stay responsive. */
export const MAX_ATTACK_PATHS = 64;

export interface BlastResult {
  sourceId: string;
  /** Reachable component ids in BFS order, including the source itself. */
  reachable: string[];
  /** Simple paths from the source to every reachable component (capped). */
  paths: string[][];
  /** Critical components inside the reachable set (excluding the source unless critical). */
  criticalReachable: string[];
  /** Components treated as isolated during this calculation. */
  consideredIsolated: string[];
}

export interface DisruptedService {
  id: string;
  label: string;
  /** Why this component is modeled as disrupted. */
  reason: string;
}

export interface ContainmentComparison {
  isolatedId: string;
  before: BlastResult;
  after: BlastResult;
  /** Components modeled as disrupted by the isolation, upstream included. */
  disrupted: DisruptedService[];
  /** Unique edges that carried attack paths before but not after. */
  removedPathEdges: number;
  /** Critical assets no longer reachable after isolation. */
  criticalMitigated: string[];
}

type Adjacency = Map<string, string[]>;

/** Build adjacency lists (dependency direction), keeping declaration order for determinism. */
export function buildAdjacency(edges: DependencyEdge[], traversableOnly = true): Adjacency {
  const adjacency: Adjacency = new Map();
  for (const edge of edges) {
    if (traversableOnly && !edge.traversable) continue;
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge.to);
    adjacency.set(edge.from, list);
  }
  return adjacency;
}

/**
 * Breadth-first reachability with a visited set (handles cycles).
 * Isolated components cannot be entered or passed through.
 */
export function computeReachable(
  graph: InfrastructureGraphData,
  sourceId: string,
  isolatedIds: readonly string[] = [],
): string[] {
  const isolated = new Set(isolatedIds);
  if (isolated.has(sourceId)) return [sourceId];
  const adjacency = buildAdjacency(graph.edges);
  const visited = new Set<string>([sourceId]);
  const queue: string[] = [sourceId];
  const order: string[] = [sourceId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of adjacency.get(current) ?? []) {
      if (visited.has(next) || isolated.has(next)) continue;
      visited.add(next);
      order.push(next);
      queue.push(next);
    }
  }
  return order;
}

/** Depth-first enumeration of simple paths from the source (cycle-safe, capped). */
export function computeAttackPaths(
  graph: InfrastructureGraphData,
  sourceId: string,
  isolatedIds: readonly string[] = [],
): string[][] {
  const isolated = new Set(isolatedIds);
  if (isolated.has(sourceId)) return [];
  const adjacency = buildAdjacency(graph.edges);
  const paths: string[][] = [];

  const walk = (node: string, trail: string[], onTrail: Set<string>) => {
    if (paths.length >= MAX_ATTACK_PATHS) return;
    for (const next of adjacency.get(node) ?? []) {
      if (onTrail.has(next) || isolated.has(next)) continue;
      const nextTrail = [...trail, next];
      paths.push(nextTrail);
      if (paths.length >= MAX_ATTACK_PATHS) return;
      onTrail.add(next);
      walk(next, nextTrail, onTrail);
      onTrail.delete(next);
    }
  };

  walk(sourceId, [sourceId], new Set([sourceId]));
  return paths;
}

/** Full blast-radius analysis for a simulated incident source. */
export function analyze(
  graph: InfrastructureGraphData,
  sourceId: string,
  isolatedIds: readonly string[] = [],
): BlastResult {
  const reachable = computeReachable(graph, sourceId, isolatedIds);
  const paths = computeAttackPaths(graph, sourceId, isolatedIds);
  const criticality = new Map(graph.nodes.map((n) => [n.id, n.criticality] as const));
  const criticalReachable = reachable.filter(
    (id) => id !== sourceId && criticality.get(id) === "critical",
  );
  return {
    sourceId,
    reachable,
    paths,
    criticalReachable,
    consideredIsolated: [...isolatedIds],
  };
}

/**
 * Components modeled as disrupted when `isolateId` is isolated: every
 * component that depends on it directly, plus upstream dependents that lose
 * the chain (reverse BFS over dependency edges).
 */
export function computeDisruption(graph: InfrastructureGraphData, isolateId: string): DisruptedService[] {
  const labels = new Map(graph.nodes.map((n) => [n.id, n.label] as const));
  // Reverse adjacency: dependency -> its direct dependents.
  const dependents: Adjacency = new Map();
  for (const edge of graph.edges) {
    const list = dependents.get(edge.to) ?? [];
    list.push(edge.from);
    dependents.set(edge.to, list);
  }
  const descriptions = new Map(
    graph.edges.map((e) => [`${e.from}->${e.to}`, e.description] as const),
  );

  const visited = new Set<string>([isolateId]);
  const queue: string[] = [isolateId];
  const order: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dependent of dependents.get(current) ?? []) {
      if (visited.has(dependent)) continue;
      visited.add(dependent);
      order.push(dependent);
      queue.push(dependent);
    }
  }

  return order.map((id) => {
    const direct = graph.edges.find((e) => e.from === id && e.to === isolateId);
    const reason = direct
      ? `Depends on ${labels.get(isolateId) ?? isolateId}: ${direct.description}`
      : `Loses an upstream dependency chain to ${labels.get(isolateId) ?? isolateId}.`;
    return { id, label: labels.get(id) ?? id, reason };
  });
}

/** Unique edges (as "from->to") covered by a path list. */
export function uniquePathEdges(paths: string[][]): Set<string> {
  const keys = new Set<string>();
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i++) keys.add(`${path[i]}->${path[i + 1]}`);
  }
  return keys;
}

/**
 * Simulate isolating one component for the given incident source.
 * The original scenario is preserved in `before`; all after-values are
 * recomputed from the graph — never invented.
 */
export function simulateIsolation(
  graph: InfrastructureGraphData,
  sourceId: string,
  isolateId: string,
  preExistingIsolated: readonly string[] = [],
): ContainmentComparison {
  const before = analyze(graph, sourceId, preExistingIsolated);
  const after = analyze(graph, sourceId, [...preExistingIsolated, isolateId]);

  const beforeEdges = uniquePathEdges(before.paths);
  const afterEdges = uniquePathEdges(after.paths);
  let removedPathEdges = 0;
  for (const key of beforeEdges) if (!afterEdges.has(key)) removedPathEdges++;

  const beforeCritical = new Set(before.criticalReachable);
  const criticalMitigated = after.criticalReachable.filter((id) => !beforeCritical.has(id));
  const stillCritical = new Set(after.criticalReachable);
  const mitigated = [...beforeCritical].filter((id) => !stillCritical.has(id));

  const isolateNode = graph.nodes.find((n) => n.id === isolateId);
  const disrupted = isolateId === sourceId
    ? []
    : computeDisruption(graph, isolateId).map((d) => {
        // Components already unreachable before isolation are not *additional* disruption.
        return before.reachable.includes(d.id)
          ? d
          : { ...d, reason: `${d.reason} (already unreachable from the incident source before isolation)` };
      });

  return {
    isolatedId: isolateId,
    before,
    after,
    disrupted,
    removedPathEdges,
    criticalMitigated: mitigated.length > 0 ? mitigated : criticalMitigated.length > 0 ? criticalMitigated : [],
  };
}

/** Human label helper used by UI and reports. */
export function labelMap(nodes: InfraNode[]): Map<string, string> {
  return new Map(nodes.map((n) => [n.id, n.label] as const));
}
