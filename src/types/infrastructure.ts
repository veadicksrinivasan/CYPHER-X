/**
 * CYPHER-X — Shared Infrastructure Data Model
 *
 * ⚠️  SIMULATION DISCLAIMER
 * This module defines types for a defensive graph simulation. Graph
 * reachability shows which nodes are *structurally reachable* under the
 * configured propagation rules. It does NOT prove that an actual attack is
 * exploitable, that any real system is compromised, or that an attacker
 * would succeed in practice. Always use synthetic or explicitly authorized
 * data. Human review is required before applying any containment action to
 * real infrastructure.
 *
 * Design principle: this file is the single source of truth for the shared
 * data model. Every engine function and React component must import from
 * here. Never duplicate these type definitions elsewhere.
 */

// ---------------------------------------------------------------------------
// NodeType — the category of infrastructure component
// ---------------------------------------------------------------------------

/**
 * The category of an infrastructure node.
 *
 * Using a string-literal union instead of a plain `string` field achieves
 * two things:
 *   1. TypeScript will catch a typo like "Srever" at compile time.
 *   2. The UI can use exhaustive switch statements to colour-code nodes
 *      without risk of an unhandled case.
 *
 * Add new values here if the domain grows (e.g. "container", "iot_device").
 * Every team member who adds a value must also handle it in the UI switch.
 */
export type NodeType =
  | "server"
  | "application"
  | "database"
  | "workstation"
  | "api"
  | "account";

// ---------------------------------------------------------------------------
// InfrastructureNode — a single modeled component
// ---------------------------------------------------------------------------

/**
 * Represents one modeled infrastructure component: a server, application,
 * database, workstation, API endpoint, or user/service account.
 *
 * Design decisions:
 * - `id` is a plain string so callers control the key space (e.g. "srv-001",
 *   UUIDs, or slugs). Never use array index as an ID — indexes change when
 *   the array is mutated.
 * - `isIsolated` is the *simulated* isolation state of this node. An isolated
 *   node is skipped in both directions: the engine will not enter it and will
 *   not use it as a transit node. This mirrors the cybersecurity concept of
 *   network segmentation or account disablement.
 * - `isCritical` marks high-value assets (e.g. production database,
 *   privileged account). The engine flags these in the blast-radius result
 *   so the caller can prioritise them for containment or reporting.
 * - `metadata` is an open extension point. Team members can attach arbitrary
 *   key-value pairs (IP addresses, OS version, owner) without modifying this
 *   interface. The engine ignores metadata; the UI may display it.
 */
export interface InfrastructureNode {
  /** Unique stable identifier. Must be unique across the entire graph. */
  readonly id: string;

  /** Human-readable display name used in the UI and simulation reports. */
  readonly label: string;

  /** The category of infrastructure component this node represents. */
  readonly type: NodeType;

  /**
   * When true, this node is simulated as isolated (quarantined / disabled).
   * The engine will not traverse into or through an isolated node.
   */
  readonly isIsolated: boolean;

  /**
   * When true, this node is a high-value asset. The blast-radius result
   * will list critical nodes separately so defenders can prioritise them.
   */
  readonly isCritical: boolean;

  /**
   * Optional freeform metadata. Use for display or reporting only.
   * The engine does not read this field during traversal.
   *
   * Example: { ip: "10.0.0.5", os: "Ubuntu 22.04", owner: "ops-team" }
   */
  readonly metadata?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// DependencyEdge — a directed connection between two nodes
// ---------------------------------------------------------------------------

/**
 * Represents a directed dependency or access relationship between two nodes.
 *
 * Direction matters:  source → target  means "source depends on target" or
 * "source can access target". The reverse is NOT implied. Model bidirectional
 * relationships with two separate edges if required.
 *
 * `allowsPropagation` separates *connectivity* from *traversability*:
 * - A monitoring connection (source observes target) might exist in the graph
 *   but an attacker likely cannot move through it — set allowsPropagation to
 *   false to model that assumption.
 * - A database access credential, API call, or shared secret is a prime
 *   propagation vector — set allowsPropagation to true.
 *
 * Design note: edges are identified by the (source, target) pair. The engine
 * does not require a separate edge `id` field today, but one can be added to
 * `metadata` if the UI needs to address individual edges.
 */
export interface DependencyEdge {
  /** The node ID where this connection originates. */
  readonly source: string;

  /** The node ID where this connection terminates. */
  readonly target: string;

  /**
   * When true, a simulated attacker can move from `source` to `target`
   * through this edge. When false, the edge exists in the model but blocks
   * propagation (e.g. a read-only monitoring link).
   */
  readonly allowsPropagation: boolean;

  /**
   * Optional freeform metadata. Use for display or reporting only.
   * The engine does not read this field during traversal.
   *
   * Example: { protocol: "HTTPS", port: "443", credential: "svc-account-A" }
   */
  readonly metadata?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// InfrastructureGraph — the complete modeled environment
// ---------------------------------------------------------------------------

/**
 * The complete simulated infrastructure: all nodes and all directed edges.
 *
 * Design decisions:
 * - Arrays are used instead of Maps so the graph can be JSON-serialised and
 *   deserialised without custom reviver functions. This matters for future
 *   persistence (localStorage, REST API, file import).
 * - The engine builds internal Map/Set structures from these arrays at runtime
 *   for O(1) lookup. Those internal structures are never stored back here.
 * - The graph itself is treated as immutable by all engine functions. Any
 *   "what-if" simulation (e.g. isolation) operates on a derived copy.
 */
export interface InfrastructureGraph {
  /** All nodes in the simulated environment. */
  readonly nodes: readonly InfrastructureNode[];

  /** All directed dependency/access edges between nodes. */
  readonly edges: readonly DependencyEdge[];
}

// ---------------------------------------------------------------------------
// AttackPath — one discovered propagation path
// ---------------------------------------------------------------------------

/**
 * A single simulated propagation path from the source node to a reachable
 * target node.
 *
 * `nodeIds` is the ordered list of node IDs visited, including both the
 * source and the final node. Example: ["api-01", "srv-02", "db-03"] means
 * the simulated attacker moved api-01 → srv-02 → db-03.
 *
 * All paths are *simple*: no node ID appears more than once within a single
 * path. This prevents infinite loops in graphs with cycles.
 */
export interface AttackPath {
  /** Ordered sequence of node IDs from source to this reachable node. */
  readonly nodeIds: readonly string[];
}

// ---------------------------------------------------------------------------
// AttackPathResult — full output of calculateBlastRadius
// ---------------------------------------------------------------------------

/**
 * The complete result returned by `calculateBlastRadius`.
 *
 * ⚠️  SIMULATION DISCLAIMER — see module header.
 *
 * Fields:
 * - `sourceNodeId`: the node the simulation started from.
 * - `reachableNodeIds`: every node that is structurally reachable from the
 *   source under the current propagation rules (not including the source
 *   itself unless there is a cycle back to it, which simple-path traversal
 *   prevents).
 * - `criticalNodesReached`: subset of `reachableNodeIds` whose nodes have
 *   `isCritical === true`. Useful for executive-level risk summaries.
 * - `paths`: every distinct simple path from the source to each reachable
 *   node. A single node may be reachable via multiple paths; all are listed.
 * - `isolatedNodesSkipped`: IDs of nodes that were encountered during
 *   traversal but skipped because `isIsolated === true`. Useful to confirm
 *   that isolation is working as intended.
 * - `assumptions`: human-readable notes about what the simulation assumes.
 *   Always include these in any report shown to a user.
 */
export interface AttackPathResult {
  readonly sourceNodeId: string;
  readonly reachableNodeIds: readonly string[];
  readonly criticalNodesReached: readonly string[];
  readonly paths: readonly AttackPath[];
  readonly isolatedNodesSkipped: readonly string[];
  readonly assumptions: readonly string[];
}

// ---------------------------------------------------------------------------
// IsolationComparisonResult — output of simulateIsolation
// ---------------------------------------------------------------------------

/**
 * The result returned by `simulateIsolation`.
 *
 * Contains two blast-radius results computed on the *same source node*:
 * - `before`: calculated on the original, unmodified graph.
 * - `after`:  calculated on a copy of the graph where `isolatedNodeId` has
 *   been marked as isolated.
 *
 * The caller can compare `before.reachableNodeIds` and
 * `after.reachableNodeIds` to measure the containment effect.
 *
 * The original graph passed to `simulateIsolation` is NEVER modified.
 *
 * `isolatedNodeId`: the node that was isolated in the "after" scenario. This
 * is included so reports can name the containment action unambiguously.
 */
export interface IsolationComparisonResult {
  /** The node that was isolated in the "after" simulation. */
  readonly isolatedNodeId: string;

  /**
   * Blast-radius result calculated on the original graph, before isolation.
   * This is the baseline risk posture.
   */
  readonly before: AttackPathResult;

  /**
   * Blast-radius result calculated after marking `isolatedNodeId` as
   * isolated in a copy of the graph.
   */
  readonly after: AttackPathResult;
}
