import type { SecurityEvent } from "./types";

/**
 * Simulated security telemetry for the demo environment.
 * These events are generated fixtures — no real hosts, networks, or logs.
 */
export const securityEvents: SecurityEvent[] = [
  // --- Brute-force pattern: 7 failed logins for a.williams inside ~100s ---
  { id: "E-101", timestamp: "2026-10-26T10:40:12Z", type: "failed_login", account: "a.williams", sourceIp: "10.0.20.10", deviceId: "DEV-ADM-01", assetId: "auth-svc", summary: "Failed login for a.williams", details: { method: "password", result: "INVALID_CREDENTIALS" } },
  { id: "E-102", timestamp: "2026-10-26T10:40:26Z", type: "failed_login", account: "a.williams", sourceIp: "10.0.20.10", deviceId: "DEV-ADM-01", assetId: "auth-svc", summary: "Failed login for a.williams", details: { method: "password", result: "INVALID_CREDENTIALS" } },
  { id: "E-103", timestamp: "2026-10-26T10:40:39Z", type: "failed_login", account: "a.williams", sourceIp: "10.0.20.10", deviceId: "DEV-ADM-01", assetId: "auth-svc", summary: "Failed login for a.williams", details: { method: "password", result: "INVALID_CREDENTIALS" } },
  { id: "E-104", timestamp: "2026-10-26T10:40:51Z", type: "failed_login", account: "a.williams", sourceIp: "10.0.20.10", deviceId: "DEV-ADM-01", assetId: "auth-svc", summary: "Failed login for a.williams", details: { method: "password", result: "INVALID_CREDENTIALS" } },
  { id: "E-105", timestamp: "2026-10-26T10:41:08Z", type: "failed_login", account: "a.williams", sourceIp: "10.0.20.10", deviceId: "DEV-ADM-01", assetId: "auth-svc", summary: "Failed login for a.williams", details: { method: "password", result: "INVALID_CREDENTIALS" } },
  { id: "E-106", timestamp: "2026-10-26T10:41:29Z", type: "failed_login", account: "a.williams", sourceIp: "10.0.20.10", deviceId: "DEV-ADM-01", assetId: "auth-svc", summary: "Failed login for a.williams", details: { method: "password", result: "INVALID_CREDENTIALS" } },
  { id: "E-107", timestamp: "2026-10-26T10:41:52Z", type: "failed_login", account: "a.williams", sourceIp: "10.0.20.10", deviceId: "DEV-ADM-01", assetId: "auth-svc", summary: "Failed login for a.williams", details: { method: "password", result: "INVALID_CREDENTIALS" } },
  { id: "E-108", timestamp: "2026-10-26T10:42:10Z", type: "successful_login", account: "a.williams", sourceIp: "10.0.20.10", deviceId: "DEV-ADM-01", assetId: "auth-svc", summary: "Successful login for a.williams after failures", details: { method: "password", mfa: "push-approved" } },

  // --- API anomaly: token replay from a second origin + elevated volume ---
  { id: "E-201", timestamp: "2026-10-26T10:38:02Z", type: "api_request", account: "svc-api", sourceIp: "10.0.1.5", assetId: "srv-api-prod-01", summary: "API request /v1/claims/search", details: { token: "tok-9f2a", endpoint: "/v1/claims/search", status: 200 } },
  { id: "E-202", timestamp: "2026-10-26T10:38:20Z", type: "api_request", account: "svc-api", sourceIp: "10.0.1.5", assetId: "srv-api-prod-01", summary: "API request /v1/payments/queue", details: { token: "tok-9f2a", endpoint: "/v1/payments/queue", status: 200 } },
  { id: "E-203", timestamp: "2026-10-26T10:39:00Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/users", details: { token: "tok-9f2a", endpoint: "/v1/admin/users", status: 200 } },
  { id: "E-204", timestamp: "2026-10-26T10:39:14Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/tokens", details: { token: "tok-9f2a", endpoint: "/v1/admin/tokens", status: 200 } },
  { id: "E-205", timestamp: "2026-10-26T10:39:41Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/tokens", details: { token: "tok-9f2a", endpoint: "/v1/admin/tokens", status: 200 } },
  { id: "E-206", timestamp: "2026-10-26T10:40:05Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/users", details: { token: "tok-9f2a", endpoint: "/v1/admin/users", status: 200 } },
  { id: "E-207", timestamp: "2026-10-26T10:40:30Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/tokens", details: { token: "tok-9f2a", endpoint: "/v1/admin/tokens", status: 200 } },
  { id: "E-208", timestamp: "2026-10-26T10:40:52Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/users", details: { token: "tok-9f2a", endpoint: "/v1/admin/users", status: 200 } },
  { id: "E-209", timestamp: "2026-10-26T10:41:15Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/tokens", details: { token: "tok-9f2a", endpoint: "/v1/admin/tokens", status: 200 } },
  { id: "E-210", timestamp: "2026-10-26T10:41:44Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/users", details: { token: "tok-9f2a", endpoint: "/v1/admin/users", status: 200 } },
  { id: "E-211", timestamp: "2026-10-26T10:42:03Z", type: "api_request", account: "svc-api", sourceIp: "10.0.1.5", assetId: "srv-api-prod-01", summary: "Token tok-9f2a replayed from gateway origin", details: { token: "tok-9f2a", endpoint: "/v1/admin/tokens", status: 200, note: "same token observed from two origins" } },
  { id: "E-212", timestamp: "2026-10-26T10:42:20Z", type: "api_request", account: "svc-api", sourceIp: "10.0.4.12", assetId: "srv-api-prod-01", summary: "API request /v1/admin/users", details: { token: "tok-9f2a", endpoint: "/v1/admin/users", status: 200 } },

  // --- Unexpected database access: principal not on the claims allowlist ---
  { id: "E-301", timestamp: "2026-10-26T10:44:01Z", type: "db_query", account: "j.mendoza", sourceIp: "10.0.4.30", assetId: "db-claims-01", summary: "SELECT 12,480 rows from claims.policies", details: { table: "claims.policies", rows: 12480, allowlisted: "no", statement: "SELECT * FROM claims.policies" } },

  // --- New device authentication ---
  { id: "E-401", timestamp: "2026-10-26T10:46:12Z", type: "successful_login", account: "s.okafor", sourceIp: "10.0.20.104", deviceId: "DEV-8841", assetId: "auth-svc", summary: "Login from unregistered device DEV-8841", details: { device: "DEV-8841", registered: "no", mfa: "push-approved" } },
  { id: "E-402", timestamp: "2026-10-26T10:46:40Z", type: "device_registration", account: "s.okafor", sourceIp: "10.0.20.104", deviceId: "DEV-8841", assetId: "auth-svc", summary: "Device DEV-8841 self-enrolled", details: { device: "DEV-8841", method: "self-enrollment" } },

  // --- Benign background activity (should not trigger rules) ---
  { id: "E-501", timestamp: "2026-10-26T10:30:00Z", type: "successful_login", account: "m.hughes", sourceIp: "10.0.20.61", deviceId: "DEV-3312", assetId: "auth-svc", summary: "Routine login for m.hughes", details: { device: "DEV-3312", registered: "yes" } },
  { id: "E-502", timestamp: "2026-10-26T10:31:10Z", type: "api_request", account: "svc-claims-api", sourceIp: "10.0.4.30", assetId: "srv-api-prod-01", summary: "API request /v1/claims/search", details: { token: "tok-claims", endpoint: "/v1/claims/search", status: 200 } },
  { id: "E-503", timestamp: "2026-10-26T10:32:05Z", type: "api_request", account: "svc-claims-api", sourceIp: "10.0.4.30", assetId: "srv-api-prod-01", summary: "API request /v1/claims/search", details: { token: "tok-claims", endpoint: "/v1/claims/search", status: 200 } },
  { id: "E-504", timestamp: "2026-10-26T10:33:02Z", type: "db_query", account: "svc-claims-api", sourceIp: "10.0.4.30", assetId: "db-claims-01", summary: "SELECT 210 rows from claims.policies", details: { table: "claims.policies", rows: 210, allowlisted: "yes" } },
  { id: "E-505", timestamp: "2026-10-26T10:35:00Z", type: "successful_login", account: "r.tanaka", sourceIp: "10.0.20.77", deviceId: "DEV-5520", assetId: "auth-svc", summary: "Routine login for r.tanaka", details: { device: "DEV-5520", registered: "yes" } },
];

/** Principals permitted to query the claims datastore. */
export const CLAIMS_DB_ALLOWLIST = ["svc-claims-api", "svc-reporting", "db-migrator"];

/** Device IDs known to be registered per account (simulated CMDB snapshot). */
export const REGISTERED_DEVICES: Record<string, string[]> = {
  "a.williams": ["DEV-ADM-01"],
  "s.okafor": ["DEV-5520", "DEV-3312"],
  "m.hughes": ["DEV-3312"],
  "r.tanaka": ["DEV-5520"],
  "j.mendoza": ["DEV-7781"],
};

