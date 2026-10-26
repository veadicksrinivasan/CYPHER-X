/**
 * CYPHER-X — Blast-Radius Engine
 *
 * ⚠️  SIMULATION DISCLAIMER
 * This engine performs graph reachability analysis on a modeled infrastructure
 * graph. Results indicate which nodes are *structurally reachable* under the
 * configured propagation rules — they do NOT prove that a real attack is
 * exploitable, that any real system is compromised, or that an attacker would
 * succeed in practice. All results must be reviewed by a qualified security
 * professional. Use only synthetic or explicitly authorized data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ALGORITHM OVERVIEW
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * calculateBlastRadius uses a Breadth-First Search (BFS) variant that
 * discovers ALL simple paths (no repeated node within a single path) from the
 * source to every reachable node.
 *
 * Why BFS instead of DFS?
 *   BFS processes nodes level-by-level (1 hop away, then 2 hops, ...).
 *   This means shorter paths are discovered and reported first, which is more
 *   informative for blast-radius communication: a node that is only 2 hops
 *   from the attacker's entry point is more urgently at risk than one that is
 *   5 hops away through a convoluted path.
 *
 * Why track ALL paths, not just shortest paths?
 *   A defender needs to know every route an attacker might take so that every
 *   path can be cut. Showing only the shortest path would hide alternative
 *   attack routes that survive after a containment action.
 *
 * Cycle handling:
 *   Each path being explored carries its own visited Set. A node can appear in
 *   multiple *different* paths, but it cannot appear twice within the *same*
 *   path. This prevents infinite loops on cyclic graphs while still finding
 *   all distinct simple paths.
 *
 * Isolation:
 *   A node with isIsolated === true is skipped entirely. It is recorded in
 *   `isolatedNodesSkipped` so the caller can confirm isolation is working.
 *
 * Immutability:
 *   Neither function ever mutates the input graph. simulateIsolation creates
 *   a shallow structural copy where only the targeted node's isIsolated flag
 *   is changed.
 */

import type {
  AttackPath,
  AttackPathResult,
  InfrastructureGraph,
  InfrastructureNode,
  IsolationComparisonResult,
} from "../types/infrastructure";

// ---------------------------------------------------------------------------
// Internal types used only within this module
// ---------------------------------------------------------------------------

/**
 * A work item in the BFS queue.
 *
 * `currentNodeId` — the node we are currently visiting.
 * `pathSoFar`     — the ordered list of node IDs we followed to reach it.
 * `visitedInPath` — fast O(1) membership test for cycle detection; mirrors
 *                   the contents of `pathSoFar` as a Set.
 *
 * We store both the array (for ordered output) and the Set (for O(1) lookup)
 * because converting an array to a Set on every step would cost O(n) per
 * node per path, turning the overall algorithm quadratic.
 */
interface BfsQueueItem {
  currentNodeId: string;
  pathSoFar: readonly string[];
  visitedInPath: ReadonlySet<string>;
}

// ---------------------------------------------------------------------------
// buildAdjacencyMap — O(E) preprocessing step
// ---------------------------------------------------------------------------

/**
 * Converts the flat edges array into a Map<sourceId, Set<targetId>> for O(1)
 * neighbour lookup during traversal.
 *
 * Only edges where `allowsPropagation === true` are included. Edges involving
 * a node ID that does not appear in the node index are silently ignored
 * (dangling edge defence).
 *
 * @param graph       The graph whose edges will be indexed.
 * @param nodeIndex   A Map from node ID → InfrastructureNode for validation.
 * @returns           Adjacency map: sourceId → Set of reachable targetIds.
 */
function buildAdjacencyMap(
  graph: InfrastructureGraph,
  nodeIndex: ReadonlyMap<string, InfrastructureNode>
): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  for (const edge of graph.edges) {
    // Skip non-traversable edges.
    if (!edge.allowsPropagation) continue;

    // Guard against dangling edges that reference non-existent nodes.
    if (!nodeIndex.has(edge.source) || !nodeIndex.has(edge.target)) continue;

    // Initialise the neighbour set for this source if not yet present.
    if (!adjacency.has(edge.source)) {
      adjacency.set(edge.source, new Set<string>());
    }

    // Non-null assertion is safe: we just ensured the key exists above.
    adjacency.get(edge.source)!.add(edge.target);
  }

  return adjacency;
}

// ---------------------------------------------------------------------------
// buildNodeIndex — O(N) preprocessing step
// ---------------------------------------------------------------------------

/**
 * Builds a Map<id, InfrastructureNode> for O(1) node lookup by ID.
 *
 * This avoids repeated O(N) array.find() calls during traversal.
 *
 * If the graph contains duplicate node IDs (a data integrity violation), the
 * last node with that ID wins. The engine does not throw in this case because
 * defensive tools should degrade gracefully; however, callers should validate
 * their data before passing it to the engine.
 *
 * @param graph The graph whose nodes will be indexed.
 * @returns     Map from node ID → InfrastructureNode.
 */
function buildNodeIndex(
  graph: InfrastructureGraph
): Map<string, InfrastructureNode> {
  const index = new Map<string, InfrastructureNode>();
  for (const node of graph.nodes) {
    index.set(node.id, node);
  }
  return index;
}

// ---------------------------------------------------------------------------
// calculateBlastRadius — public API
// ---------------------------------------------------------------------------

/**
 * Calculates the blast radius of a simulated security incident starting at
 * `sourceNodeId`.
 *
 * Returns every node that is structurally reachable from the source via
 * propagation-enabled edges, together with all distinct simple paths that
 * lead to each reachable node.
 *
 * ⚠️  SIMULATION DISCLAIMER — see module header.
 *
 * Edge cases handled:
 *   • `sourceNodeId` does not exist in the graph → returns an empty result
 *     with an explanatory assumption note. No exception is thrown so the UI
 *     can display the result gracefully.
 *   • Source node is isolated → returns an empty result (an isolated source
 *     cannot propagate even if it is the origin of an incident). This is a
 *     deliberate simulation assumption: isolation is applied before the
 *     attacker can move.
 *   • Cyclic graphs → handled by the per-path visited Set; no infinite loop.
 *   • Disconnected components → the BFS only follows edges, so unreachable
 *     subgraphs are simply never visited.
 *   • Edges with allowsPropagation === false → excluded from the adjacency
 *     map at build time; they are invisible to the traversal.
 *
 * @param graph        The infrastructure graph to analyse. Not mutated.
 * @param sourceNodeId The ID of the node where the simulated incident starts.
 * @returns            The full blast-radius result including paths and flags.
 */
export function calculateBlastRadius(
  graph: InfrastructureGraph,
  sourceNodeId: string
): AttackPathResult {
  // --- Phase 1: Build indexes ---
  const nodeIndex = buildNodeIndex(graph);
  const adjacency = buildAdjacencyMap(graph, nodeIndex);

  // Accumulate simulation assumption notes for transparency.
  const assumptions: string[] = [
    "Graph reachability does not prove exploitability. An attacker must still have the means, motive, and opportunity to move along each path.",
    "Only edges with allowsPropagation === true are traversed.",
    "Isolated nodes (isIsolated === true) are skipped in all directions.",
    "All paths are simple: a node is never revisited within a single path.",
    "This engine models a single-source incident. Simultaneous multi-source incidents are not simulated here.",
  ];

  // --- Phase 2: Validate source node ---
  const sourceNode = nodeIndex.get(sourceNodeId);

  if (sourceNode === undefined) {
    assumptions.push(
      `Source node ID "${sourceNodeId}" was not found in the graph. The result is empty.`
    );
    return {
      sourceNodeId,
      reachableNodeIds: [],
      criticalNodesReached: [],
      paths: [],
      isolatedNodesSkipped: [],
      assumptions,
    };
  }

  if (sourceNode.isIsolated) {
    assumptions.push(
      `Source node "${sourceNodeId}" is marked as isolated. The simulation assumes isolation prevents outbound propagation from this node.`
    );
    return {
      sourceNodeId,
      reachableNodeIds: [],
      criticalNodesReached: [],
      paths: [],
      isolatedNodesSkipped: [sourceNodeId],
      assumptions,
    };
  }

  // --- Phase 3: BFS traversal ---

  // `allPaths` collects every complete simple path from source to a reachable
  // node. A path is "complete" when it terminates at a node (i.e. it has at
  // least two entries — the source plus at least one more node).
  const allPaths: AttackPath[] = [];

  // `reachableSet` deduplicates the reachable node IDs across all paths.
  const reachableSet = new Set<string>();

  // `isolatedSkippedSet` records isolated nodes that blocked traversal.
  const isolatedSkippedSet = new Set<string>();

  // Seed the queue with the source node. The source is in its own
  // `visitedInPath` so that cycles back to the source are correctly blocked.
  const initialVisited = new Set<string>([sourceNodeId]);
  const queue: BfsQueueItem[] = [
    {
      currentNodeId: sourceNodeId,
      pathSoFar: [sourceNodeId],
      visitedInPath: initialVisited,
    },
  ];

  while (queue.length > 0) {
    // BFS: process items in FIFO order.
    // `shift()` is O(N) on a plain array. For very large graphs, replace with
    // a proper queue implementation (e.g. a doubly-linked list or index-based
    // deque). For the prototype's expected graph sizes this is acceptable.
    const item = queue.shift()!;
    const { currentNodeId, pathSoFar, visitedInPath } = item;

    // Get the set of neighbours reachable from this node.
    const neighbours = adjacency.get(currentNodeId);
    if (neighbours === undefined) continue; // No outgoing propagation edges.

    for (const neighbourId of neighbours) {
      // Do not revisit a node within the same path (cycle prevention).
      if (visitedInPath.has(neighbourId)) continue;

      const neighbourNode = nodeIndex.get(neighbourId);
      // Dangling edge guard (target node was removed from graph but edge
      // remains). Should not happen with valid data, but we guard it.
      if (neighbourNode === undefined) continue;

      // Skip isolated nodes.
      if (neighbourNode.isIsolated) {
        isolatedSkippedSet.add(neighbourId);
        continue;
      }

      // Build the extended path for this neighbour.
      const extendedPath = [...pathSoFar, neighbourId];

      // Record this node as reachable and record the completed path.
      reachableSet.add(neighbourId);
      allPaths.push({ nodeIds: extendedPath });

      // Continue the BFS from this neighbour with a new visited set.
      // We create a new Set (not mutate the parent's) so each active path
      // branch has its own independent visited state.
      const newVisited = new Set(visitedInPath);
      newVisited.add(neighbourId);

      queue.push({
        currentNodeId: neighbourId,
        pathSoFar: extendedPath,
        visitedInPath: newVisited,
      });
    }
  }

  // --- Phase 4: Identify critical nodes reached ---
  const criticalNodesReached = [...reachableSet].filter((id) => {
    const node = nodeIndex.get(id);
    return node !== undefined && node.isCritical;
  });

  return {
    sourceNodeId,
    reachableNodeIds: [...reachableSet],
    criticalNodesReached,
    paths: allPaths,
    isolatedNodesSkipped: [...isolatedSkippedSet],
    assumptions,
  };
}

// ---------------------------------------------------------------------------
// simulateIsolation — public API
// ---------------------------------------------------------------------------

/**
 * Simulates isolating `isolatedNodeId` and measures the containment effect
 * by comparing blast-radius results before and after isolation.
 *
 * The original `graph` is NEVER modified. The function creates a shallow
 * structural copy with only the targeted node's `isIsolated` flag changed.
 *
 * ⚠️  SIMULATION DISCLAIMER — see module header.
 *
 * Design decisions:
 *   • Shallow copy is sufficient because the engine never mutates node or
 *     edge objects during traversal. Only the `nodes` array reference changes;
 *     all other node properties are reused from the original objects.
 *   • The "before" result is calculated first, then the copy is made, then
 *     the "after" result is calculated. This ensures both results reflect the
 *     same graph topology (minus the one changed flag).
 *   • If `isolatedNodeId` does not exist in the graph, the "after" result
 *     equals the "before" result (there is nothing to isolate).
 *   • If `isolatedNodeId` equals `sourceNodeId`, the "after" result will be
 *     empty because the source itself is isolated.
 *
 * Edge cases handled:
 *   • Non-existent `isolatedNodeId` → after === before, assumption note added.
 *   • `isolatedNodeId` === `sourceNodeId` → after result is empty.
 *   • Already-isolated node → "before" and "after" are identical; the
 *     function still works correctly.
 *
 * @param graph           The infrastructure graph. Not mutated.
 * @param sourceNodeId    The incident's origin node.
 * @param isolatedNodeId  The node to be simulated as isolated in the "after"
 *                        scenario.
 * @returns               Both blast-radius results plus the isolated node ID.
 */
export function simulateIsolation(
  graph: InfrastructureGraph,
  sourceNodeId: string,
  isolatedNodeId: string
): IsolationComparisonResult {
  // Step 1: Calculate the baseline blast radius (before isolation).
  const before = calculateBlastRadius(graph, sourceNodeId);

  // Step 2: Build a modified copy of the graph.
  //
  // We spread the nodes array to produce a new array, replacing only the
  // node that matches `isolatedNodeId` with a new object that has
  // `isIsolated: true`. All other nodes are passed through by reference —
  // no deep clone is needed because the engine reads but never writes to
  // node/edge objects.
  //
  // Using `map` (rather than `splice` or direct index mutation) ensures we
  // never alter the original array or any original node object.
  const nodeIndex = buildNodeIndex(graph);
  const targetExists = nodeIndex.has(isolatedNodeId);

  const modifiedNodes = graph.nodes.map((node) => {
    if (node.id === isolatedNodeId) {
      // Spread the existing node and override only isIsolated.
      return { ...node, isIsolated: true };
    }
    return node;
  });

  const modifiedGraph: InfrastructureGraph = {
    nodes: modifiedNodes,
    edges: graph.edges, // Edges are unchanged; pass by reference is safe.
  };

  // Step 3: Calculate the blast radius after isolation.
  const after = calculateBlastRadius(modifiedGraph, sourceNodeId);

  // Step 4: Append a note if the target node did not exist.
  // We cannot mutate `after.assumptions` (it is readonly), so we rebuild the
  // result object when needed.
  if (!targetExists) {
    const noteAboutMissingNode = `Isolation target "${isolatedNodeId}" was not found in the graph. The after result is identical to the before result.`;

    return {
      isolatedNodeId,
      before,
      after: {
        ...after,
        assumptions: [...after.assumptions, noteAboutMissingNode],
      },
    };
  }

  return {
    isolatedNodeId,
    before,
    after,
  };
}
