import { CLAIMS_DB_ALLOWLIST, REGISTERED_DEVICES, securityEvents } from "./events";
import type {
  Alert,
  AlertEvidenceItem,
  AlertStatus,
  DetectionConfig,
  SecurityEvent,
  Severity,
} from "./types";

export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  rulesEnabled: { bruteForce: true, apiAnomaly: true, dbAccess: true, newDevice: true },
  bruteForceThreshold: 5,
  bruteForceWindowMinutes: 2,
  apiVolumeThreshold: 10,
  apiWindowMinutes: 5,
};

/** Initial triage state per alert id (simulated analyst queue). */
const INITIAL_ALERT_STATUS: Partial<Record<string, AlertStatus>> = {
  "ALT-001": "needs-review",
  "ALT-002": "under-review",
  "ALT-003": "investigating",
  "ALT-004": "open",
};

const initialStatus = (id: string): AlertStatus => INITIAL_ALERT_STATUS[id] ?? "open";

const MS_PER_MINUTE = 60_000;

function withinWindow(ts: string, base: string, minutes: number): boolean {
  return new Date(base).getTime() - new Date(ts).getTime() <= minutes * MS_PER_MINUTE;
}

function ev(item: Omit<AlertEvidenceItem, "detail"> & { detail?: string }): AlertEvidenceItem {
  return { eventId: item.eventId, summary: item.summary, detail: item.detail ?? "" };
}

/**
 * Rule R-LOGIN-112 — Repeated Failed Login Attempts.
 * Fires when one account records >= threshold failed logins inside the window.
 */
function detectBruteForce(events: SecurityEvent[], config: DetectionConfig): Alert | null {
  if (!config.rulesEnabled.bruteForce) return null;
  const failed = events
    .filter((e) => e.type === "failed_login")
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const byAccount = new Map<string, SecurityEvent[]>();
  for (const e of failed) {
    const list = byAccount.get(e.account) ?? [];
    list.push(e);
    byAccount.set(e.account, list);
  }
  for (const [account, list] of byAccount) {
    for (const first of list) {
      const windowEvents = list.filter(
        (e) => e.timestamp >= first.timestamp && withinWindow(e.timestamp, first.timestamp, config.bruteForceWindowMinutes),
      );
      if (windowEvents.length >= config.bruteForceThreshold) {
        const last = windowEvents[windowEvents.length - 1]!;
        const isAdmin = account === "a.williams";
        return {
          id: "ALT-001",
          ruleId: "R-LOGIN-112",
          ruleName: "Repeated Failed Login Attempts",
          title: `Repeated Failed Login Attempts — ${account}`,
          eventType: "Repeated failed login attempts",
          assetId: "auth-svc",
          sourceNodeId: "ws-admin-01",
          severity: isAdmin ? "high" : "medium",
          detectedAt: last.timestamp,
          status: initialStatus("ALT-001"),
          detectionReason: `Account ${account} recorded ${windowEvents.length} failed logins within ${config.bruteForceWindowMinutes} minutes (rule threshold: ${config.bruteForceThreshold}). This pattern matches possible password guessing or account misuse — it has not been confirmed as an attack.`,
          evidence: windowEvents.map((e) =>
            ev({
              eventId: e.id,
              summary: e.summary,
              detail: `${new Date(e.timestamp).toISOString().slice(11, 19)} UTC • source ${e.sourceIp} • device ${e.deviceId ?? "n/a"} • ${JSON.stringify(e.details)}`,
            }),
          ),
        };
      }
    }
  }
  return null;
}

/**
 * Rule R-AUTH-409 — Unusual API Access.
 * Fires when one principal issues >= volumeThreshold requests to sensitive
 * endpoints within the window, or replays one token from two different origins.
 */
function detectApiAnomaly(events: SecurityEvent[], config: DetectionConfig): Alert | null {
  if (!config.rulesEnabled.apiAnomaly) return null;
  const sensitive = (e: SecurityEvent) =>
    e.type === "api_request" && String(e.details["endpoint"] ?? "").startsWith("/v1/admin");
  const apiEvents = events.filter(sensitive).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Token replay: same token id seen from two source IPs.
  const byToken = new Map<string, Set<string>>();
  for (const e of apiEvents) {
    const token = String(e.details["token"] ?? "");
    const origins = byToken.get(token) ?? new Set<string>();
    origins.add(e.sourceIp);
    byToken.set(token, origins);
  }
  const replayedToken = [...byToken.entries()].find(([, origins]) => origins.size > 1);

  for (const first of apiEvents) {
    const windowEvents = apiEvents.filter(
      (e) => e.timestamp >= first.timestamp && withinWindow(e.timestamp, first.timestamp, config.apiWindowMinutes),
    );
    const replay = replayedToken !== undefined && windowEvents.some((e) => e.details["token"] === replayedToken[0]);
    if (windowEvents.length >= config.apiVolumeThreshold || replay) {
      const last = windowEvents[windowEvents.length - 1]!;
      const reasons: string[] = [];
      if (windowEvents.length >= config.apiVolumeThreshold) {
        reasons.push(
          `principal svc-api issued ${windowEvents.length} requests to sensitive /v1/admin endpoints within ${config.apiWindowMinutes} minutes (threshold: ${config.apiVolumeThreshold})`,
        );
      }
      if (replayedToken) {
        reasons.push(
          `token ${replayedToken[0]} was observed from ${replayedToken[1].size} origins (${[...replayedToken[1]].join(", ")}) — consistent with token replay`,
        );
      }
      return {
        id: "ALT-002",
        ruleId: "R-AUTH-409",
        ruleName: "Unusual API Access",
        title: "Unusual API Access — Elevated /v1/admin Activity",
        eventType: "Unusual API access pattern",
        assetId: "srv-api-prod-01",
        sourceNodeId: "srv-api-prod-01",
        severity: "high",
        detectedAt: last.timestamp,
        status: initialStatus("ALT-002"),
        detectionReason: `Flagged as Suspicious Activity because ${reasons.join("; and ")}.`,
        evidence: windowEvents.map((e) =>
          ev({
            eventId: e.id,
            summary: e.summary,
            detail: `${new Date(e.timestamp).toISOString().slice(11, 19)} UTC • origin ${e.sourceIp} • token ${e.details["token"]}`,
          }),
        ),
      };
    }
  }
  return null;
}

/**
 * Rule R-DATA-772 — Unexpected Database Access.
 * Fires when a principal outside the claims allowlist queries the datastore.
 */
function detectDbAccess(events: SecurityEvent[], config: DetectionConfig): Alert | null {
  if (!config.rulesEnabled.dbAccess) return null;
  const violating = events
    .filter((e) => e.type === "db_query" && e.assetId === "db-claims-01")
    .filter((e) => String(e.details["allowlisted"] ?? "no") !== "yes" && !CLAIMS_DB_ALLOWLIST.includes(e.account))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (violating.length === 0) return null;
  const first = violating[0]!;
  return {
    id: "ALT-003",
    ruleId: "R-DATA-772",
    ruleName: "Unexpected Database Access",
    title: `Unexpected Claims Database Access — ${first.account}`,
    eventType: "Unexpected database access",
    assetId: "db-claims-01",
    sourceNodeId: "db-claims-01",
    severity: "high",
    detectedAt: first.timestamp,
    status: initialStatus("ALT-003"),
    detectionReason: `Principal ${first.account} is not on the claims-datasource allowlist (${CLAIMS_DB_ALLOWLIST.join(", ")}) but queried ${first.details["table"]} and read ${Number(first.details["rows"]).toLocaleString()} rows. Possible Account Misuse — needs investigation before any conclusion.`,
    evidence: violating.map((e) =>
      ev({
        eventId: e.id,
        summary: e.summary,
        detail: `${new Date(e.timestamp).toISOString().slice(11, 19)} UTC • account ${e.account} • origin ${e.sourceIp} • ${e.details["statement"]}`,
      }),
    ),
  };
}

/**
 * Rule R-DEVICE-035 — New Device Authentication.
 * Fires on successful login from a device not registered for the account.
 */
function detectNewDevice(events: SecurityEvent[], config: DetectionConfig): Alert | null {
  if (!config.rulesEnabled.newDevice) return null;
  const hits = events
    .filter(
      (e) =>
        e.type === "successful_login" &&
        e.deviceId !== undefined &&
        !(REGISTERED_DEVICES[e.account] ?? []).includes(e.deviceId),
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (hits.length === 0) return null;
  const first = hits[0]!;
  return {
    id: "ALT-004",
    ruleId: "R-DEVICE-035",
    ruleName: "New Device Authentication",
    title: `New Device Authentication — ${first.account}`,
    eventType: "New-device authentication",
    assetId: "auth-svc",
    sourceNodeId: "ws-emp-104",
    severity: "low",
    detectedAt: first.timestamp,
    status: initialStatus("ALT-004"),
    detectionReason: `Device ${first.deviceId} was not registered for account ${first.account} at login time. Could be legitimate travel hardware — informational unless corroborated by other signals.`,
    evidence: hits.map((e) =>
      ev({
        eventId: e.id,
        summary: e.summary,
        detail: `${new Date(e.timestamp).toISOString().slice(11, 19)} UTC • account ${e.account} • device ${e.deviceId} • origin ${e.sourceIp} • ${JSON.stringify(e.details)}`,
      }),
    ),
  };
}

/**
 * Run every enabled detection rule over the simulated telemetry.
 * Deterministic: the same events and config always produce the same alerts.
 */
export function runDetections(
  events: SecurityEvent[] = securityEvents,
  config: DetectionConfig = DEFAULT_DETECTION_CONFIG,
): Alert[] {
  const alerts = [
    detectBruteForce(events, config),
    detectApiAnomaly(events, config),
    detectDbAccess(events, config),
    detectNewDevice(events, config),
  ].filter((a): a is Alert => a !== null);

  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
