export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

export const headerNav: NavItem[] = [
  { to: "/", label: "Overview", icon: "" },
  { to: "/security-alerts", label: "Security Alerts", icon: "" },
  { to: "/investigations", label: "Investigations", icon: "" },
  { to: "/infrastructure", label: "Infrastructure", icon: "" },
  { to: "/containment", label: "Containment", icon: "" },
];

export const telemetryNav: NavItem[] = [
  { to: "/", label: "Mission Control", icon: "dashboard" },
  { to: "/security-alerts", label: "Active Triage", icon: "notifications_active" },
  { to: "/infrastructure", label: "Infrastructure Map", icon: "hub" },
  { to: "/investigations", label: "Incident Cases", icon: "policy" },
  { to: "/containment", label: "Adversary Emulation", icon: "terminal" },
];

export const operationsNav: NavItem[] = [
  { to: "/blast-radius", label: "Blast-Radius Analysis", icon: "polyline" },
  { to: "/reports", label: "Investigation Reports", icon: "receipt_long" },
  { to: "/settings", label: "Settings", icon: "tune" },
];
