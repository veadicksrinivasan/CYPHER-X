import type { DependencyEdge, InfrastructureGraphData, InfraNode } from "./types";

/**
 * Simulated infrastructure dependency graph.
 *
 * Edge semantics (documented contract used by the blast-radius engine):
 * - `from -> to` means "from depends on to": the dependent component relies on
 *   the target to function. A compromised component may be used to reach what
 *   it depends on (it holds credentials/routes toward it), so the blast-radius
 *   engine traverses edges in the dependency direction.
 * - Isolating a component disrupts every component that depends on it,
 *   directly or transitively.
 * - Edges with `traversable: false` (monitoring, replication) are *not*
 *   traversal paths for attack modeling: they exist for context only.
 */
export const infrastructureNodes: InfraNode[] = [
  {
    id: "ws-emp-104",
    label: "Employee Workstation 104",
    componentType: "workstation",
    criticality: "low",
    status: "healthy",
    ipAddress: "10.0.20.104",
    zone: "Corporate LAN",
    dependsOn: ["vpn-gw-01"],
    description: "Standard analyst-managed endpoint used by customer-support staff.",
    position: { x: 20, y: 330 },
  },
  {
    id: "ws-admin-01",
    label: "Admin Workstation",
    componentType: "workstation",
    criticality: "high",
    status: "healthy",
    ipAddress: "10.0.20.10",
    zone: "Management VLAN",
    dependsOn: ["vpn-gw-01"],
    description: "Privileged jump host for infrastructure administration. Repeated failed logins observed.",
    position: { x: 20, y: 110 },
  },
  {
    id: "vpn-gw-01",
    label: "Remote Access Gateway (VPN)",
    componentType: "gateway",
    criticality: "high",
    status: "degraded",
    ipAddress: "10.0.1.5",
    zone: "DMZ",
    dependsOn: ["auth-svc", "srv-api-prod-01"],
    description: "Terminates remote-access tunnels and routes ingress to internal tiers. Elevated ingress anomaly under review.",
    position: { x: 210, y: 220 },
  },
  {
    id: "auth-svc",
    label: "Authentication Service",
    componentType: "service",
    criticality: "critical",
    status: "healthy",
    ipAddress: "10.0.2.20",
    zone: "Identity Zone",
    dependsOn: [],
    description: "Tier-1 identity provider issuing session tokens for every internal tier.",
    position: { x: 430, y: 70 },
  },
  {
    id: "srv-api-prod-01",
    label: "API Server",
    componentType: "server",
    criticality: "high",
    status: "healthy",
    ipAddress: "10.0.4.12",
    zone: "Application Tier",
    dependsOn: ["auth-svc", "app-srv-03", "db-claims-01", "pay-svc-01"],
    description: "Public API cluster node. Simulated incident source for token-replay investigation INC-2026-004.",
    position: { x: 430, y: 250 },
  },
  {
    id: "app-srv-03",
    label: "Application Server",
    componentType: "server",
    criticality: "medium",
    status: "healthy",
    ipAddress: "10.0.4.30",
    zone: "Application Tier",
    dependsOn: ["db-claims-01", "pay-svc-01"],
    description: "Runs claims business logic behind the API tier.",
    position: { x: 660, y: 210 },
  },
  {
    id: "db-claims-01",
    label: "Claims Database",
    componentType: "database",
    criticality: "critical",
    status: "healthy",
    ipAddress: "10.0.5.10",
    zone: "Data Tier",
    dependsOn: ["bk-vault-01"],
    description: "Tier-1 customer claims datastore. Unexpected query activity flagged by rule R-DATA-772.",
    position: { x: 900, y: 110 },
  },
  {
    id: "pay-svc-01",
    label: "Payment Service",
    componentType: "service",
    criticality: "critical",
    status: "healthy",
    ipAddress: "10.0.6.20",
    zone: "Payments Zone",
    dependsOn: ["db-claims-01"],
    description: "Tier-1 settlement service writing payment records to the claims datastore.",
    position: { x: 900, y: 300 },
  },
  {
    id: "bk-vault-01",
    label: "Backup Server",
    componentType: "storage",
    criticality: "high",
    status: "healthy",
    ipAddress: "10.0.7.5",
    zone: "Isolated Backup Net",
    dependsOn: [],
    description: "Air-gapped backup vault receiving replication streams only.",
    position: { x: 900, y: 440 },
  },
  {
    id: "mon-srv-01",
    label: "Monitoring Server",
    componentType: "monitoring",
    criticality: "medium",
    status: "healthy",
    ipAddress: "10.0.8.8",
    zone: "Observability Zone",
    dependsOn: ["srv-api-prod-01", "vpn-gw-01"],
    description: "Health telemetry collector. Compromise of monitored hosts does not grant access through this link.",
    position: { x: 210, y: 440 },
  },
];

export const infrastructureEdges: DependencyEdge[] = [
  {
    id: "e-ws-emp-gw",
    from: "ws-emp-104",
    to: "vpn-gw-01",
    kind: "network",
    traversable: true,
    description: "Workstation reaches internal apps through the VPN gateway.",
  },
  {
    id: "e-ws-adm-gw",
    from: "ws-admin-01",
    to: "vpn-gw-01",
    kind: "network",
    traversable: true,
    description: "Admin jump host connects to internal tiers via the VPN gateway.",
  },
  {
    id: "e-gw-auth",
    from: "vpn-gw-01",
    to: "auth-svc",
    kind: "service",
    traversable: true,
    description: "Gateway authenticates users against the identity service.",
  },
  {
    id: "e-gw-api",
    from: "vpn-gw-01",
    to: "srv-api-prod-01",
    kind: "network",
    traversable: true,
    description: "Gateway routes ingress traffic to the API cluster.",
  },
  {
    id: "e-api-auth",
    from: "srv-api-prod-01",
    to: "auth-svc",
    kind: "trust",
    traversable: true,
    description: "API validates session tokens with the identity service.",
  },
  {
    id: "e-api-app",
    from: "srv-api-prod-01",
    to: "app-srv-03",
    kind: "service",
    traversable: true,
    description: "API delegates business logic to the application server.",
  },
  {
    id: "e-api-db",
    from: "srv-api-prod-01",
    to: "db-claims-01",
    kind: "data",
    traversable: true,
    description: "API reads and writes claims data directly.",
  },
  {
    id: "e-api-pay",
    from: "srv-api-prod-01",
    to: "pay-svc-01",
    kind: "service",
    traversable: true,
    description: "API calls the payment service for transaction processing.",
  },
  {
    id: "e-app-db",
    from: "app-srv-03",
    to: "db-claims-01",
    kind: "data",
    traversable: true,
    description: "Application server reads and writes claims data.",
  },
  {
    id: "e-app-pay",
    from: "app-srv-03",
    to: "pay-svc-01",
    kind: "service",
    traversable: true,
    description: "Application server triggers payment flows.",
  },
  {
    id: "e-pay-db",
    from: "pay-svc-01",
    to: "db-claims-01",
    kind: "data",
    traversable: true,
    description: "Payment service writes settlement records to the claims datastore.",
  },
  {
    id: "e-db-bk",
    from: "db-claims-01",
    to: "bk-vault-01",
    kind: "replication",
    traversable: false,
    description: "Claims database streams encrypted snapshots to the air-gapped backup vault (one-way, not an access path).",
  },
  {
    id: "e-mon-api",
    from: "mon-srv-01",
    to: "srv-api-prod-01",
    kind: "monitoring",
    traversable: false,
    description: "Monitoring polls API health (read-only telemetry link, not an access path).",
  },
  {
    id: "e-mon-gw",
    from: "mon-srv-01",
    to: "vpn-gw-01",
    kind: "monitoring",
    traversable: false,
    description: "Monitoring polls gateway health (read-only telemetry link, not an access path).",
  },
];

export const infrastructureGraph: InfrastructureGraphData = {
  nodes: infrastructureNodes,
  edges: infrastructureEdges,
};

export const nodeById = (id: string): InfraNode | undefined =>
  infrastructureNodes.find((n) => n.id === id);

export const nodeLabel = (id: string): string =>
  infrastructureNodes.find((n) => n.id === id)?.label ?? id;
