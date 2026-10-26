/**
 * CYPHER-X shared data model.
 * Everything is local, simulated demo data — no live monitoring integration.
 */

export type ComponentType =
  | "workstation"
  | "gateway"
  | "service"
  | "server"
  | "database"
  | "storage"
  | "monitoring";

export type Criticality = "low" | "medium" | "high" | "critical";

export type ComponentStatus = "healthy" | "degraded" | "compromised" | "isolated";

export interface InfraNode {
  id: string;
  label: string;
  componentType: ComponentType;
  criticality: Criticality;
  status: ComponentStatus;
  ipAddress: string;
  zone: string;
  /** IDs of infrastructure this component depends on to function. */
  dependsOn: string[];
  description: string;
  /** Layout position for the dependency graph. */
  position: { x: number; y: number };
}

export interface DependencyEdge {
  id: string;
  /** The dependent component ("from" relies on "to"). */
  from: string;
  to: string;
  kind: "network" | "service" | "data" | "trust" | "monitoring" | "replication";
  /**
   * Whether the blast-radius engine may traverse this edge when modeling
   * attack propagation. Monitoring/replication links are traversable: false —
   * a compromised component does not grant access *through* them.
   */
  traversable: boolean;
  description: string;
}

export interface InfrastructureGraphData {
  nodes: InfraNode[];
  edges: DependencyEdge[];
}

export type Severity = "critical" | "high" | "medium" | "low";

export type AlertStatus = "open" | "needs-review" | "under-review" | "investigating" | "resolved";

export interface SecurityEvent {
  id: string;
  /** ISO timestamp (UTC). */
  timestamp: string;
  type:
    | "failed_login"
    | "successful_login"
    | "api_request"
    | "db_query"
    | "device_registration";
  account: string;
  sourceIp: string;
  deviceId?: string;
  /** Infrastructure node the event was observed on. */
  assetId: string;
  summary: string;
  details: Record<string, string | number>;
}

export interface AlertEvidenceItem {
  eventId: string;
  summary: string;
  detail: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  title: string;
  eventType: string;
  assetId: string;
  /** Infrastructure component the incident investigation starts from. */
  sourceNodeId: string;
  severity: Severity;
  detectedAt: string;
  status: AlertStatus;
  /** Plain-language explanation of why the rule fired. */
  detectionReason: string;
  evidence: AlertEvidenceItem[];
}

export interface DetectionConfig {
  rulesEnabled: {
    bruteForce: boolean;
    apiAnomaly: boolean;
    dbAccess: boolean;
    newDevice: boolean;
  };
  /** Failed logins per account within the window before the rule fires. */
  bruteForceThreshold: number;
  bruteForceWindowMinutes: number;
  /** API requests by one principal to sensitive endpoints within the window. */
  apiVolumeThreshold: number;
  apiWindowMinutes: number;
}

export interface TimelineEntry {
  time: string;
  tag: string;
  tone: "rose" | "amber" | "cyan" | "slate" | "teal";
  text: string;
}

export interface Incident {
  id: string;
  title: string;
  alertId: string;
  sourceNodeId: string;
  severity: Severity;
  status: "under-review" | "containment-staged" | "open" | "resolved";
  summary: string;
  timeline: TimelineEntry[];
}

