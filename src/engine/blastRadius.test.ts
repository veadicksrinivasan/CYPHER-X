/**
 * CYPHER-X — Blast-Radius Engine Unit Tests
 *
 * Test strategy:
 *   Each test is self-contained and builds only the graph data it needs.
 *   Tests are grouped by scenario so a failing test's location is instantly
 *   clear from the test name alone.
 *
 * Naming convention:
 *   describe("feature or scenario") → it("observable behaviour")
 *   Example: describe("calculateBlastRadius") → it("returns empty for an
 *            invalid source node ID")
 *
 * Graph diagrams:
 *   Each complex graph is drawn as an ASCII diagram directly above the test
 *   that uses it. Edge direction: A → B means A can reach B.
 *   A --x→ B means allowsPropagation === false (blocked edge).
 *   [ISO] = node is isolated.
 */

import { describe, expect, it } from "vitest";
import {
  calculateBlastRadius,
  simulateIsolation,
} from "./blastRadius";
import type {
  DependencyEdge,
  InfrastructureGraph,
  InfrastructureNode,
} from "../types/infrastructure";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Creates a minimal non-isolated, non-critical node with a given ID. */
function makeNode(
  id: string,
  overrides: Partial<InfrastructureNode> = {}
): InfrastructureNode {
  return {
    id,
    label: id,
    type: "server",
    isIsolated: false,
    isCritical: false,
    ...overrides,
  };
}

/** Creates a propagation-enabled edge from source to target. */
function makeEdge(
  source: string,
  target: string,
  overrides: Partial<DependencyEdge> = {}
): DependencyEdge {
  return {
    source,
    target,
    allowsPropagation: true,
    ...overrides,
  };
}

/** Sorts an array of strings so order-insensitive comparisons work. */
function sorted(arr: readonly string[]): string[] {
  return [...arr].sort();
}

// ---------------------------------------------------------------------------
// describe: calculateBlastRadius
// ---------------------------------------------------------------------------

describe("calculateBlastRadius", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Group: invalid / edge-case inputs
  // ─────────────────────────────────────────────────────────────────────────

  describe("invalid or edge-case inputs", () => {
    it("returns an empty result when the source node ID does not exist", () => {
      // Graph: A → B
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B")],
        edges: [makeEdge("A", "B")],
      };

      const result = calculateBlastRadius(graph, "DOES_NOT_EXIST");

      expect(result.sourceNodeId).toBe("DOES_NOT_EXIST");
      expect(result.reachableNodeIds).toHaveLength(0);
      expect(result.paths).toHaveLength(0);
      expect(result.criticalNodesReached).toHaveLength(0);
      expect(result.isolatedNodesSkipped).toHaveLength(0);
      // The engine should tell the caller WHY the result is empty.
      expect(result.assumptions.some((a) => a.includes("DOES_NOT_EXIST"))).toBe(true);
    });

    it("returns an empty result for an empty graph (no nodes, no edges)", () => {
      const graph: InfrastructureGraph = { nodes: [], edges: [] };
      const result = calculateBlastRadius(graph, "anything");

      expect(result.reachableNodeIds).toHaveLength(0);
      expect(result.paths).toHaveLength(0);
    });

    it("returns an empty result when the graph has nodes but no edges", () => {
      // Graph: A   B   C  (fully disconnected — no edges at all)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).toHaveLength(0);
      expect(result.paths).toHaveLength(0);
    });

    it("does not mutate the original graph", () => {
      // Freeze the input to detect any accidental mutation.
      const nodes = Object.freeze([
        Object.freeze(makeNode("A")),
        Object.freeze(makeNode("B")),
      ]);
      const edges = Object.freeze([Object.freeze(makeEdge("A", "B"))]);
      const graph = Object.freeze({ nodes, edges }) as InfrastructureGraph;

      // Should not throw despite the frozen objects.
      expect(() => calculateBlastRadius(graph, "A")).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: basic reachability
  // ─────────────────────────────────────────────────────────────────────────

  describe("basic reachability", () => {
    it("reaches a directly connected neighbour", () => {
      // Graph: A → B
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B")],
        edges: [makeEdge("A", "B")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).toContain("B");
      expect(result.reachableNodeIds).not.toContain("A"); // source never in reachable
    });

    it("does not include the source node in reachableNodeIds", () => {
      // Graph: A → B → C
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).not.toContain("A");
    });

    it("reaches a node two hops away", () => {
      // Graph: A → B → C
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(sorted(result.reachableNodeIds)).toEqual(["B", "C"]);
    });

    it("does not traverse edges where allowsPropagation is false", () => {
      // Graph: A → B --x→ C
      //               (blocked)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [
          makeEdge("A", "B"),
          makeEdge("B", "C", { allowsPropagation: false }),
        ],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).toContain("B");
      expect(result.reachableNodeIds).not.toContain("C");
    });

    it("respects edge direction — does not traverse backwards", () => {
      // Graph: A → B   (only A can reach B; B cannot reach A)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B")],
        edges: [makeEdge("A", "B")],
      };

      const resultFromB = calculateBlastRadius(graph, "B");

      expect(resultFromB.reachableNodeIds).not.toContain("A");
      expect(resultFromB.reachableNodeIds).toHaveLength(0);
    });

    it("reaches nodes in a disconnected component only if there are edges", () => {
      // Graph: A → B    C → D    (two separate components)
      // Source: A — should reach B but NOT C or D
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")],
        edges: [makeEdge("A", "B"), makeEdge("C", "D")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).toContain("B");
      expect(result.reachableNodeIds).not.toContain("C");
      expect(result.reachableNodeIds).not.toContain("D");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: isolation
  // ─────────────────────────────────────────────────────────────────────────

  describe("node isolation", () => {
    it("skips an isolated target node and records it in isolatedNodesSkipped", () => {
      // Graph: A → B[ISO] → C
      const graph: InfrastructureGraph = {
        nodes: [
          makeNode("A"),
          makeNode("B", { isIsolated: true }),
          makeNode("C"),
        ],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).not.toContain("B");
      expect(result.reachableNodeIds).not.toContain("C");
      expect(result.isolatedNodesSkipped).toContain("B");
    });

    it("returns an empty result when the source node is isolated", () => {
      // Graph: A[ISO] → B → C
      const graph: InfrastructureGraph = {
        nodes: [
          makeNode("A", { isIsolated: true }),
          makeNode("B"),
          makeNode("C"),
        ],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).toHaveLength(0);
      expect(result.paths).toHaveLength(0);
      expect(result.isolatedNodesSkipped).toContain("A");
    });

    it("can still reach nodes beyond an isolated node via alternate paths", () => {
      // Graph:
      //   A → B[ISO] → D
      //   A → C      → D
      // D should be reachable via A → C → D, not via A → B → D.
      const graph: InfrastructureGraph = {
        nodes: [
          makeNode("A"),
          makeNode("B", { isIsolated: true }),
          makeNode("C"),
          makeNode("D"),
        ],
        edges: [
          makeEdge("A", "B"),
          makeEdge("A", "C"),
          makeEdge("B", "D"),
          makeEdge("C", "D"),
        ],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).not.toContain("B");
      expect(result.reachableNodeIds).toContain("C");
      expect(result.reachableNodeIds).toContain("D");
      expect(result.isolatedNodesSkipped).toContain("B");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: cycles
  // ─────────────────────────────────────────────────────────────────────────

  describe("cycle handling", () => {
    it("handles a simple 2-node cycle without infinite loop", () => {
      // Graph: A ⇄ B   (A → B and B → A)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B")],
        edges: [makeEdge("A", "B"), makeEdge("B", "A")],
      };

      // Should terminate and find B reachable from A.
      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).toContain("B");
      expect(result.reachableNodeIds).not.toContain("A");
    });

    it("handles a 3-node cycle without infinite loop", () => {
      // Graph: A → B → C → A
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C"), makeEdge("C", "A")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(sorted(result.reachableNodeIds)).toEqual(["B", "C"]);
    });

    it("handles a self-loop without infinite loop", () => {
      // Graph: A → A (self-loop)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A")],
        edges: [makeEdge("A", "A")],
      };

      const result = calculateBlastRadius(graph, "A");

      // A cannot re-enter its own path; no new reachable nodes.
      expect(result.reachableNodeIds).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: multiple paths
  // ─────────────────────────────────────────────────────────────────────────

  describe("multiple paths", () => {
    it("discovers all simple paths to a node reachable via multiple routes", () => {
      // Graph:
      //   A → B → D
      //   A → C → D
      // D is reachable via two distinct simple paths.
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")],
        edges: [
          makeEdge("A", "B"),
          makeEdge("A", "C"),
          makeEdge("B", "D"),
          makeEdge("C", "D"),
        ],
      };

      const result = calculateBlastRadius(graph, "A");

      // D must appear in reachableNodeIds exactly once (deduplicated).
      expect(result.reachableNodeIds.filter((id) => id === "D")).toHaveLength(1);

      // But there should be at least two paths that end at D.
      const pathsToD = result.paths.filter(
        (p) => p.nodeIds[p.nodeIds.length - 1] === "D"
      );
      expect(pathsToD.length).toBeGreaterThanOrEqual(2);

      // One path should go through B, the other through C.
      const pathThroughB = pathsToD.find((p) => p.nodeIds.includes("B"));
      const pathThroughC = pathsToD.find((p) => p.nodeIds.includes("C"));
      expect(pathThroughB).toBeDefined();
      expect(pathThroughC).toBeDefined();
    });

    it("each path starts with the source node ID", () => {
      // Graph: A → B → C
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = calculateBlastRadius(graph, "A");

      for (const path of result.paths) {
        expect(path.nodeIds[0]).toBe("A");
      }
    });

    it("each path ends with a reachable node, not the source", () => {
      // Graph: A → B → C
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = calculateBlastRadius(graph, "A");

      for (const path of result.paths) {
        expect(path.nodeIds[path.nodeIds.length - 1]).not.toBe("A");
      }
    });

    it("no path contains a repeated node ID (all paths are simple)", () => {
      // Graph: A → B ⇄ C → D   (B and C form a cycle)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")],
        edges: [
          makeEdge("A", "B"),
          makeEdge("B", "C"),
          makeEdge("C", "B"),
          makeEdge("C", "D"),
        ],
      };

      const result = calculateBlastRadius(graph, "A");

      for (const path of result.paths) {
        const nodeSet = new Set(path.nodeIds);
        // If the Set size equals the array length, there are no duplicates.
        expect(nodeSet.size).toBe(path.nodeIds.length);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: critical nodes
  // ─────────────────────────────────────────────────────────────────────────

  describe("critical node detection", () => {
    it("lists critical nodes that are reachable from the source", () => {
      // Graph: A → B → C[CRITICAL]
      const graph: InfrastructureGraph = {
        nodes: [
          makeNode("A"),
          makeNode("B"),
          makeNode("C", { isCritical: true }),
        ],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.criticalNodesReached).toContain("C");
      expect(result.criticalNodesReached).not.toContain("A");
      expect(result.criticalNodesReached).not.toContain("B");
    });

    it("does not include the source in criticalNodesReached even if it is critical", () => {
      // Graph: A[CRITICAL] → B
      const graph: InfrastructureGraph = {
        nodes: [
          makeNode("A", { isCritical: true }),
          makeNode("B"),
        ],
        edges: [makeEdge("A", "B")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.criticalNodesReached).not.toContain("A");
    });

    it("returns an empty criticalNodesReached when no critical node is reachable", () => {
      // Graph: A → B → C  (none are critical)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.criticalNodesReached).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: dangling edges
  // ─────────────────────────────────────────────────────────────────────────

  describe("dangling edges (referencing non-existent nodes)", () => {
    it("silently ignores an edge whose target node does not exist", () => {
      // Graph: A → GHOST  (GHOST is in the edge but not in nodes)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A")],
        edges: [makeEdge("A", "GHOST")],
      };

      const result = calculateBlastRadius(graph, "A");

      expect(result.reachableNodeIds).toHaveLength(0);
      expect(result.paths).toHaveLength(0);
    });

    it("silently ignores an edge whose source node does not exist", () => {
      // Graph: GHOST → B  (GHOST is in the edge but not in nodes)
      const graph: InfrastructureGraph = {
        nodes: [makeNode("B")],
        edges: [makeEdge("GHOST", "B")],
      };

      const result = calculateBlastRadius(graph, "B");

      expect(result.reachableNodeIds).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: sourceNodeId field on result
  // ─────────────────────────────────────────────────────────────────────────

  describe("result metadata", () => {
    it("result.sourceNodeId always equals the provided sourceNodeId", () => {
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B")],
        edges: [makeEdge("A", "B")],
      };

      const result = calculateBlastRadius(graph, "A");
      expect(result.sourceNodeId).toBe("A");
    });

    it("result.assumptions is always a non-empty array", () => {
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A")],
        edges: [],
      };

      const result = calculateBlastRadius(graph, "A");
      expect(result.assumptions.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// describe: simulateIsolation
// ---------------------------------------------------------------------------

describe("simulateIsolation", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Group: basic before/after structure
  // ─────────────────────────────────────────────────────────────────────────

  describe("result structure", () => {
    it("returns the correct isolatedNodeId", () => {
      // Graph: A → B → C
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = simulateIsolation(graph, "A", "B");
      expect(result.isolatedNodeId).toBe("B");
    });

    it("before result matches a standalone calculateBlastRadius call", () => {
      // Graph: A → B → C
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const standalone = calculateBlastRadius(graph, "A");
      const comparison = simulateIsolation(graph, "A", "B");

      expect(sorted(comparison.before.reachableNodeIds)).toEqual(
        sorted(standalone.reachableNodeIds)
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: containment effect
  // ─────────────────────────────────────────────────────────────────────────

  describe("containment effect", () => {
    it("after result has fewer reachable nodes when an intermediate is isolated", () => {
      // Graph: A → B → C
      // Isolating B should block C from being reachable.
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = simulateIsolation(graph, "A", "B");

      expect(result.before.reachableNodeIds).toContain("B");
      expect(result.before.reachableNodeIds).toContain("C");

      expect(result.after.reachableNodeIds).not.toContain("B");
      expect(result.after.reachableNodeIds).not.toContain("C");
    });

    it("isolating a leaf node removes only that node from reachable set", () => {
      // Graph: A → B → C   (C is a leaf)
      // Isolating C should leave B reachable.
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = simulateIsolation(graph, "A", "C");

      expect(result.before.reachableNodeIds).toContain("C");
      expect(result.after.reachableNodeIds).toContain("B");
      expect(result.after.reachableNodeIds).not.toContain("C");
    });

    it("after result still reaches nodes on alternate paths when one route is isolated", () => {
      // Graph:
      //   A → B → D
      //   A → C → D
      // Isolating B: D is still reachable via C.
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")],
        edges: [
          makeEdge("A", "B"),
          makeEdge("A", "C"),
          makeEdge("B", "D"),
          makeEdge("C", "D"),
        ],
      };

      const result = simulateIsolation(graph, "A", "B");

      expect(result.before.reachableNodeIds).toContain("D");
      expect(result.after.reachableNodeIds).not.toContain("B");
      expect(result.after.reachableNodeIds).toContain("C");
      expect(result.after.reachableNodeIds).toContain("D");
    });

    it("after result is empty when the source itself is isolated", () => {
      // Graph: A → B → C
      // Isolating A prevents all propagation.
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = simulateIsolation(graph, "A", "A");

      expect(result.before.reachableNodeIds.length).toBeGreaterThan(0);
      expect(result.after.reachableNodeIds).toHaveLength(0);
    });

    it("containment effect shows reduction in criticalNodesReached", () => {
      // Graph: A → B → C[CRITICAL]
      // Isolating B should remove C from criticalNodesReached.
      const graph: InfrastructureGraph = {
        nodes: [
          makeNode("A"),
          makeNode("B"),
          makeNode("C", { isCritical: true }),
        ],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = simulateIsolation(graph, "A", "B");

      expect(result.before.criticalNodesReached).toContain("C");
      expect(result.after.criticalNodesReached).not.toContain("C");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: immutability guarantee
  // ─────────────────────────────────────────────────────────────────────────

  describe("immutability — original graph must not be mutated", () => {
    it("does not change isIsolated on the original node object", () => {
      const nodeB = makeNode("B");

      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), nodeB, makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      simulateIsolation(graph, "A", "B");

      // The original nodeB object must be unchanged.
      expect(nodeB.isIsolated).toBe(false);
    });

    it("does not change the length of the original nodes array", () => {
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const originalLength = graph.nodes.length;
      simulateIsolation(graph, "A", "B");

      expect(graph.nodes.length).toBe(originalLength);
    });

    it("does not mutate graph when called with a frozen input", () => {
      const nodes = Object.freeze([
        Object.freeze(makeNode("A")),
        Object.freeze(makeNode("B")),
      ]);
      const edges = Object.freeze([Object.freeze(makeEdge("A", "B"))]);
      const graph = Object.freeze({ nodes, edges }) as InfrastructureGraph;

      // Should not throw despite frozen objects.
      expect(() => simulateIsolation(graph, "A", "B")).not.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: non-existent isolatedNodeId
  // ─────────────────────────────────────────────────────────────────────────

  describe("non-existent isolatedNodeId", () => {
    it("returns before === after when isolatedNodeId does not exist", () => {
      // Graph: A → B → C
      const graph: InfrastructureGraph = {
        nodes: [makeNode("A"), makeNode("B"), makeNode("C")],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      const result = simulateIsolation(graph, "A", "GHOST");

      // Both results should reach the same nodes.
      expect(sorted(result.before.reachableNodeIds)).toEqual(
        sorted(result.after.reachableNodeIds)
      );

      // The after result should note that the target was not found.
      expect(
        result.after.assumptions.some((a) => a.includes("GHOST"))
      ).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Group: already-isolated node
  // ─────────────────────────────────────────────────────────────────────────

  describe("isolating an already-isolated node", () => {
    it("works without error when the target is already isolated", () => {
      // Graph: A → B[ISO] → C
      const graph: InfrastructureGraph = {
        nodes: [
          makeNode("A"),
          makeNode("B", { isIsolated: true }),
          makeNode("C"),
        ],
        edges: [makeEdge("A", "B"), makeEdge("B", "C")],
      };

      expect(() => simulateIsolation(graph, "A", "B")).not.toThrow();

      const result = simulateIsolation(graph, "A", "B");

      // Before and after should both reflect B as isolated.
      expect(result.before.reachableNodeIds).not.toContain("B");
      expect(result.after.reachableNodeIds).not.toContain("B");
    });
  });
});
