export interface IncidentScenario {
  id: string;
  scenarioCode: "SCENARIO_A" | "SCENARIO_B" | "SCENARIO_C";
  title: string;
  sourceNodeId: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "active" | "under-review" | "containment-staged" | "contained";
  summary: string;
  adversaryTTP: string;
  timeline: Array<{
    time: string;
    tag: string;
    tone: "rose" | "amber" | "cyan" | "slate" | "teal";
    text: string;
  }>;
}

export const incidentScenarios: IncidentScenario[] = [
  {
    id: "INC-2026-001",
    scenarioCode: "SCENARIO_A",
    title: "Scenario A: Compromised DMZ Web Server",
    sourceNodeId: "srv-web-01",
    severity: "high",
    status: "active",
    summary:
      "Public-facing web server compromised via reverse-shell vulnerability. Ingress traversal attempting pivot through Remote Access Gateway.",
    adversaryTTP: "T1190 (Exploit Public-Facing Application) -> T1021 (Remote Services)",
    timeline: [
      { time: "10:14 UTC", tag: "INGRESS", tone: "rose", text: "Anomalous outbound socket spawned on Web Server (srv-web-01) port 4444." },
      { time: "10:18 UTC", tag: "LATERAL", tone: "amber", text: "Session establishes authenticated traversal towards Remote Access Gateway (vpn-gw-01)." },
      { time: "10:21 UTC", tag: "ALERT", tone: "cyan", text: "Blast-radius engine invoked to map reachable downstream tiers." },
      { time: "10:25 UTC", tag: "STAGED", tone: "teal", text: "Automated network segmentation plan staged for simulation." },
    ],
  },
  {
    id: "INC-2026-002",
    scenarioCode: "SCENARIO_B",
    title: "Scenario B: Compromised Admin Workstation",
    sourceNodeId: "ws-admin-01",
    severity: "critical",
    status: "containment-staged",
    summary:
      "Privileged workstation compromised via spear-phishing credential theft. Active Kerberos tickets targeting Identity and API tiers.",
    adversaryTTP: "T1566 (Phishing) -> T1558 (Steal or Forge Kerberos Tickets)",
    timeline: [
      { time: "09:40 UTC", tag: "CORAL", tone: "rose", text: "Burst of 7 failed logins against admin account followed by abnormal success." },
      { time: "09:44 UTC", tag: "AMBER", tone: "amber", text: "Ticket Granting Service (TGS) request issued targeting auth-svc and srv-api-prod-01." },
      { time: "09:47 UTC", tag: "HIGH-RISK", tone: "cyan", text: "Threat propagation engine calculates structural path to Production Database." },
      { time: "09:50 UTC", tag: "STAGED", tone: "teal", text: "Host quarantine and credential revocation staged in sandbox simulator." },
    ],
  },
  {
    id: "INC-2026-003",
    scenarioCode: "SCENARIO_C",
    title: "Scenario C: Compromised Production API Server",
    sourceNodeId: "srv-api-prod-01",
    severity: "critical",
    status: "under-review",
    summary:
      "Core API server token-replay anomaly observed. Attacker executing privileged data queries against Claims Database.",
    adversaryTTP: "T1550 (Use Alternate Authentication Material) -> T1005 (Data from Local System)",
    timeline: [
      { time: "10:38 UTC", tag: "REPLAY", tone: "rose", text: "Stolen JWT administrative token replayed from unauthorized secondary IP address." },
      { time: "10:41 UTC", tag: "SURGE", tone: "amber", text: "High-volume SELECT queries issued across claims.policies table (12,480 records)." },
      { time: "10:43 UTC", tag: "ANALYSIS", tone: "cyan", text: "Deterministic blast-radius BFS flags Database and Payment tiers exposed." },
      { time: "10:48 UTC", tag: "TRIAGE", tone: "teal", text: "API node isolation simulated to evaluate trade-off with upstream dependents." },
    ],
  },
];

export const DEFAULT_SCENARIO_ID = "INC-2026-001";

export function getScenarioById(id: string): IncidentScenario {
  return incidentScenarios.find((s) => s.id === id) ?? incidentScenarios[0];
}
