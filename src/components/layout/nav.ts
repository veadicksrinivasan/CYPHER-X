export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

export const headerNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/infrastructure", label: "Infrastructure Map", icon: "hub" },
  { to: "/investigations", label: "Scenarios", icon: "policy" },
  { to: "/blast-radius", label: "Blast-Radius", icon: "polyline" },
  { to: "/containment", label: "Containment", icon: "security" },
];

export const telemetryNav: NavItem[] = [
  { to: "/", label: "Mission Control", icon: "dashboard" },
  { to: "/infrastructure", label: "Infrastructure Map", icon: "hub" },
  { to: "/investigations", label: "Incident Scenarios", icon: "policy" },
  { to: "/blast-radius", label: "Blast-Radius Analysis", icon: "polyline" },
  { to: "/containment", label: "Isolation Simulation", icon: "security" },
];

export const operationsNav: NavItem[] = [
  { to: "/security-alerts", label: "Security Alerts", icon: "notifications_active" },
  { to: "/reports", label: "Impact Reports", icon: "receipt_long" },
  { to: "/history", label: "Simulation History", icon: "history" },
  { to: "/settings", label: "Settings & Info", icon: "tune" },
];
