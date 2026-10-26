import type { InfrastructureGraph, InfrastructureNode, DependencyEdge, NodeType } from "@/types/infrastructure";

/**
 * CYPHER-X — Synthetic Infrastructure Topology
 *
 * Modeled for defensive graph reachability analysis under explicit propagation rules.
 * All nodes and edges conform 1:1 with the shared data model in src/types/infrastructure.ts.
 */

export interface EnrichedNode extends InfrastructureNode {
  position: { x: number; y: number };
  ipAddress: string;
  zone: string;
  description: string;
}

export interface EnrichedEdge extends DependencyEdge {
  id: string;
  kind: "network" | "service" | "data" | "trust" | "monitoring" | "replication";
  description: string;
}

export const syntheticNodes: EnrichedNode[] = [
  {
    id: "srv-web-01",
    label: "Web Server (DMZ)",
    type: "server",
    isIsolated: false,
    isCritical: false,
    ipAddress: "10.0.1.10",
    zone: "Public DMZ",
    description: "Public edge web server hosting customer portals. Primary ingress for Scenario A.",
    position: { x: 30, y: 220 },
    metadata: { ip: "10.0.1.10", zone: "Public DMZ" },
  },
  {
    id: "ws-admin-01",
    label: "Admin Workstation",
    type: "workstation",
    isIsolated: false,
    isCritical: true,
    ipAddress: "10.0.20.10",
    zone: "Management VLAN",
    description: "Privileged jump host used by infrastructure administrators. Primary ingress for Scenario B.",
    position: { x: 30, y: 80 },
    metadata: { ip: "10.0.20.10", zone: "Management VLAN" },
  },
  {
    id: "ws-emp-104",
    label: "Employee Workstation 104",
    type: "workstation",
    isIsolated: false,
    isCritical: false,
    ipAddress: "10.0.20.104",
    zone: "Corporate LAN",
    description: "Standard analyst-managed endpoint used by customer-support staff.",
    position: { x: 30, y: 380 },
    metadata: { ip: "10.0.20.104", zone: "Corporate LAN" },
  },
  {
    id: "vpn-gw-01",
    label: "Remote Access Gateway",
    type: "server",
    isIsolated: false,
    isCritical: true,
    ipAddress: "10.0.1.5",
    zone: "Ingress Edge",
    description: "Terminates remote-access tunnels and routes ingress into internal tiers.",
    position: { x: 250, y: 220 },
    metadata: { ip: "10.0.1.5", zone: "Ingress Edge" },
  },
  {
    id: "auth-svc",
    label: "Identity & Auth Service",
    type: "application",
    isIsolated: false,
    isCritical: true,
    ipAddress: "10.0.2.20",
    zone: "Identity Zone",
    description: "Tier-1 identity provider issuing session tokens for every internal tier.",
    position: { x: 470, y: 80 },
    metadata: { ip: "10.0.2.20", zone: "Identity Zone" },
  },
  {
    id: "srv-api-prod-01",
    label: "API Server",
    type: "api",
    isIsolated: false,
    isCritical: true,
    ipAddress: "10.0.4.12",
    zone: "Application Tier",
    description: "Core REST API server cluster node. Primary ingress for Scenario C.",
    position: { x: 470, y: 240 },
    metadata: { ip: "10.0.4.12", zone: "Application Tier" },
  },
  {
    id: "app-srv-03",
    label: "Application Server",
    type: "application",
    isIsolated: false,
    isCritical: false,
    ipAddress: "10.0.4.30",
    zone: "Application Tier",
    description: "Runs internal business logic behind the API cluster.",
    position: { x: 700, y: 220 },
    metadata: { ip: "10.0.4.30", zone: "Application Tier" },
  },
  {
    id: "db-claims-01",
    label: "Claims Database",
    type: "database",
    isIsolated: false,
    isCritical: true,
    ipAddress: "10.0.5.10",
    zone: "Data Tier",
    description: "Tier-1 customer claims datastore holding encrypted policyholder records.",
    position: { x: 930, y: 100 },
    metadata: { ip: "10.0.5.10", zone: "Data Tier" },
  },
  {
    id: "pay-svc-01",
    label: "Payment Settlement Service",
    type: "application",
    isIsolated: false,
    isCritical: true,
    ipAddress: "10.0.6.20",
    zone: "Payments Zone",
    description: "Tier-1 settlement service writing payment audit records to the database.",
    position: { x: 930, y: 280 },
    metadata: { ip: "10.0.6.20", zone: "Payments Zone" },
  },
  {
    id: "bk-vault-01",
    label: "Air-Gapped Backup Vault",
    type: "server",
    isIsolated: false,
    isCritical: true,
    ipAddress: "10.0.7.5",
    zone: "Isolated Backup Net",
    description: "Receives one-way encrypted snapshots; propagation is strictly blocked.",
    position: { x: 930, y: 440 },
    metadata: { ip: "10.0.7.5", zone: "Isolated Backup Net" },
  },
  {
    id: "mon-srv-01",
    label: "Monitoring Telemetry Server",
    type: "server",
    isIsolated: false,
    isCritical: false,
    ipAddress: "10.0.8.8",
    zone: "Observability Zone",
    description: "Health telemetry collector. Read-only link; blocks propagation.",
    position: { x: 250, y: 420 },
    metadata: { ip: "10.0.8.8", zone: "Observability Zone" },
  },
  {
    id: "acc-admin-sec",
    label: "Privileged Security Account",
    type: "account",
    isIsolated: false,
    isCritical: true,
    ipAddress: "N/A (IAM)",
    zone: "Identity Domain",
    description: "High-privilege security credentials mapped to identity services.",
    position: { x: 470, y: 420 },
    metadata: { zone: "Identity Domain" },
  },
];

export const syntheticEdges: EnrichedEdge[] = [
  {
    id: "e-web-gw",
    source: "srv-web-01",
    target: "vpn-gw-01",
    allowsPropagation: true,
    kind: "network",
    description: "Web server forwards authenticated sessions through gateway.",
  },
  {
    id: "e-emp-web",
    source: "ws-emp-104",
    target: "srv-web-01",
    allowsPropagation: true,
    kind: "network",
    description: "Employee terminal accesses public web endpoints.",
  },
  {
    id: "e-adm-gw",
    source: "ws-admin-01",
    target: "vpn-gw-01",
    allowsPropagation: true,
    kind: "network",
    description: "Admin workstation connects to internal infrastructure via gateway.",
  },
  {
    id: "e-gw-auth",
    source: "vpn-gw-01",
    target: "auth-svc",
    allowsPropagation: true,
    kind: "service",
    description: "Gateway validates credentials with identity service.",
  },
  {
    id: "e-gw-api",
    source: "vpn-gw-01",
    target: "srv-api-prod-01",
    allowsPropagation: true,
    kind: "network",
    description: "Gateway routes ingress traffic to API cluster.",
  },
  {
    id: "e-api-auth",
    source: "srv-api-prod-01",
    target: "auth-svc",
    allowsPropagation: true,
    kind: "trust",
    description: "API server verifies token signatures against identity service.",
  },
  {
    id: "e-api-app",
    source: "srv-api-prod-01",
    target: "app-srv-03",
    allowsPropagation: true,
    kind: "service",
    description: "API server delegates business operations to application server.",
  },
  {
    id: "e-api-db",
    source: "srv-api-prod-01",
    target: "db-claims-01",
    allowsPropagation: true,
    kind: "data",
    description: "API server executes direct read queries against claims database.",
  },
  {
    id: "e-api-pay",
    source: "srv-api-prod-01",
    target: "pay-svc-01",
    allowsPropagation: true,
    kind: "service",
    description: "API server triggers payment transactions.",
  },
  {
    id: "e-app-db",
    source: "app-srv-03",
    target: "db-claims-01",
    allowsPropagation: true,
    kind: "data",
    description: "Application server reads and writes claims data.",
  },
  {
    id: "e-app-pay",
    source: "app-srv-03",
    target: "pay-svc-01",
    allowsPropagation: true,
    kind: "service",
    description: "Application server orchestrates settlement flows.",
  },
  {
    id: "e-pay-db",
    source: "pay-svc-01",
    target: "db-claims-01",
    allowsPropagation: true,
    kind: "data",
    description: "Payment service commits settlement ledgers to claims datastore.",
  },
  {
    id: "e-db-bk",
    source: "db-claims-01",
    target: "bk-vault-01",
    allowsPropagation: false, // ⚠️ Non-traversable air-gap replication!
    kind: "replication",
    description: "Air-gapped database snapshot replication. Blocks attack propagation.",
  },
  {
    id: "e-mon-api",
    source: "mon-srv-01",
    target: "srv-api-prod-01",
    allowsPropagation: false, // ⚠️ Read-only telemetry!
    kind: "monitoring",
    description: "Read-only metrics ingestion link. Blocks attack propagation.",
  },
  {
    id: "e-adm-acc",
    source: "ws-admin-01",
    target: "acc-admin-sec",
    allowsPropagation: true,
    kind: "trust",
    description: "Admin workstation holds active kerberos credentials for privileged account.",
  },
  {
    id: "e-acc-auth",
    source: "acc-admin-sec",
    target: "auth-svc",
    allowsPropagation: true,
    kind: "trust",
    description: "Privileged account has administrative rights on identity service.",
  },
];

export const syntheticGraph: InfrastructureGraph = {
  nodes: syntheticNodes,
  edges: syntheticEdges,
};

export function getNodeById(graph: InfrastructureGraph, id: string): EnrichedNode | undefined {
  return (graph.nodes as EnrichedNode[]).find((n) => n.id === id);
}

export function getNodeLabel(id: string): string {
  const node = syntheticNodes.find((n) => n.id === id);
  return node ? node.label : id;
}
