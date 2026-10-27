import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { calculateBlastRadius, simulateIsolation } from "@/engine/blastRadius";
import type {
  InfrastructureGraph,
  InfrastructureNode,
  AttackPathResult,
  IsolationComparisonResult,
} from "@/types/infrastructure";
import {
  syntheticGraph,
  getNodeById,
  getNodeLabel,
  type EnrichedNode,
} from "@/data/infrastructure";
import {
  incidentScenarios,
  getScenarioById,
  DEFAULT_SCENARIO_ID,
  type IncidentScenario,
} from "@/data/incidents";
import { generateAIAnalysis, type AIAnalysisReport } from "@/engine/aiReasoning";

export interface SimulationHistoryRecord {
  id: string;
  timestamp: string;
  scenarioId: string;
  scenarioTitle: string;
  sourceNodeId: string;
  isolatedNodeId: string | null;
  beforeReachableCount: number;
  afterReachableCount: number;
  mitigatedCount: number;
  criticalMitigatedCount: number;
  assumptions: readonly string[];
}

const HISTORY_STORAGE_KEY = "cypherx.simulation-history.v1";
const SETTINGS_STORAGE_KEY = "cypherx.settings.v1";

export interface AppSettings {
  autoAIAnalysis: boolean;
  highlightAttackPaths: boolean;
  strictPropagationOnly: boolean;
  maxPathsDisplayed: number;
  soundAlerts: boolean;
}

/*** Personal Vault Types ***/
export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
}
export interface Device {
  id: string;
  name: string;
  ip: string;
  lastSeen: string;
}
export interface VaultAlert {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  asset: string;
  timestamp: string;
  status: string;
  simulated?: boolean;
}
export interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
}
export interface VaultSettings {
  theme: "dark" | "light";
  emailNotifications: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoAIAnalysis: true,
  highlightAttackPaths: true,
  strictPropagationOnly: true,
  maxPathsDisplayed: 20,
  soundAlerts: false,
};

export interface ConnectServerParams {
  url: string;
  label?: string;
  targetNodeId?: string;
  isCritical?: boolean;
  zone?: string;
}

interface AppContextValue {
  graph: InfrastructureGraph;
  scenarios: IncidentScenario[];
  selectedScenario: IncidentScenario;
  sourceNode: EnrichedNode;
  isolatedIds: string[];
  lastIsolatedId: string | null;
  hasSimulated: boolean;

  // Real Engine Outputs
  blastBefore: AttackPathResult;
  blastAfter: AttackPathResult | null;
  comparison: IsolationComparisonResult | null;
  aiReport: AIAnalysisReport;

  // History & Settings
  history: SimulationHistoryRecord[];
  settings: AppSettings;

  // Vault State
  currentUserId: string | null;
  profile: UserProfile | null;
  devices: Device[];
  alerts: VaultAlert[];
  activityLogs: ActivityLog[];
  vaultSettings: VaultSettings;

  // Actions
  selectScenario: (scenarioId: string) => void;
  isolateNode: (nodeId: string) => void;
  resetScenario: () => void;
  clearHistory: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  connectServerByUrl: (params: ConnectServerParams) => EnrichedNode;
  resetGraph: () => void;

  // Vault Actions
  loginUser: (email: string) => void;
  logoutUser: () => void;
  updateProfile: (userId: string, profile: UserProfile) => void;
  addDevice: (userId: string, device: Device) => void;
  removeDevice: (userId: string, deviceId: string) => void;
  addAlert: (userId: string, alert: VaultAlert) => void;
  addActivity: (userId: string, log: ActivityLog) => void;
  updateVaultSettings: (userId: string, newSettings: Partial<VaultSettings>) => void;
  exportVaultData: (userId: string) => void;
  deleteAccount: (userId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [graph, setGraph] = useState<InfrastructureGraph>(syntheticGraph);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(DEFAULT_SCENARIO_ID);
  const [isolatedIds, setIsolatedIds] = useState<string[]>([]);
  const [lastIsolatedId, setLastIsolatedId] = useState<string | null>(null);
  const [hasSimulated, setHasSimulated] = useState<boolean>(false);
  const [history, setHistory] = useState<SimulationHistoryRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Personal Vault state (per‑user maps)
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile>>({});
  const [deviceMap, setDeviceMap] = useState<Record<string, Device[]>>({});
  const [alertMap, setAlertMap] = useState<Record<string, VaultAlert[]>>({});
  const [logMap, setLogMap] = useState<Record<string, ActivityLog[]>>({});
  const [settingsMap, setVaultSettingsMap] = useState<Record<string, VaultSettings>>({});

  // Restore history and settings from browser storage on mount
  useEffect(() => {
    try {
      const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (rawHistory) setHistory(JSON.parse(rawHistory));

      const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
    } catch {
      // ignore storage errors
    }
  }, []);

  const selectedScenario = useMemo(() => getScenarioById(selectedScenarioId), [selectedScenarioId]);

  const sourceNode = useMemo(
    () => (getNodeById(graph, selectedScenario.sourceNodeId) as EnrichedNode) || (graph.nodes[0] as EnrichedNode),
    [graph, selectedScenario.sourceNodeId],
  );

  // 1. Calculate baseline blast radius
  const blastBefore = useMemo(
    () => calculateBlastRadius(graph, selectedScenario.sourceNodeId),
    [graph, selectedScenario.sourceNodeId],
  );

  // 2. Calculate isolated blast radius & comparison
  const comparison = useMemo(() => {
    if (!hasSimulated || !lastIsolatedId) return null;
    return simulateIsolation(graph, selectedScenario.sourceNodeId, lastIsolatedId);
  }, [graph, hasSimulated, lastIsolatedId, selectedScenario.sourceNodeId]);

  const blastAfter = useMemo(() => (comparison ? comparison.after : null), [comparison]);

  // 3. AI Security Reasoning
  const aiReport = useMemo(
    () => generateAIAnalysis(graph, selectedScenario.sourceNodeId, blastBefore, comparison),
    [graph, selectedScenario.sourceNodeId, blastBefore, comparison],
  );

  // Action: Select Scenario
  const selectScenario = (id: string) => {
    setSelectedScenarioId(id);
    setIsolatedIds([]);
    setLastIsolatedId(null);
    setHasSimulated(false);
  };

  // Action: Connect a new server by URL
  const connectServerByUrl = (params: ConnectServerParams): EnrichedNode => {
    const rawUrl = params.url.trim();
    let hostname = "server-node";
    let port = "443";
    try {
      const parsed = new URL(
        rawUrl.startsWith("http://") || rawUrl.startsWith("https://") ? rawUrl : `https://${rawUrl}`
      );
      hostname = parsed.hostname || "custom-server";
      port = parsed.port || (parsed.protocol === "http:" ? "80" : "443");
    } catch {
      hostname = rawUrl.replace(/[^a-zA-Z0-9.-]/g, "").slice(0, 30) || "custom-server";
    }
    const cleanId = `srv-${hostname.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 16)}-${Math.floor(Math.random() * 900 + 100)}`;
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    const assignedIp = isIp ? hostname : `10.0.1.${Math.floor(Math.random() * 150 + 40)}`;

    const existingLeftNodes = (graph.nodes as EnrichedNode[]).filter((n) => n.position && n.position.x <= 80);
    const nextY = 20 + existingLeftNodes.length * 85;

    const newNode: EnrichedNode = {
      id: cleanId,
      label: params.label?.trim() || `${hostname}${port !== "443" && port !== "80" ? `:${port}` : ""}`,
      type: "server",
      isIsolated: false,
      isCritical: Boolean(params.isCritical),
      ipAddress: assignedIp,
      zone: params.zone || "Public DMZ",
      description: `Server connected via URL ${rawUrl}. Listening on port ${port}.`,
      position: { x: 30, y: nextY },
      metadata: { url: rawUrl, port, host: hostname },
    };

    const targetId = params.targetNodeId || selectedScenario.sourceNodeId || "srv-web-01";
    const newEdge = {
      id: `edge-${newNode.id}->${targetId}`,
      source: newNode.id,
      target: targetId,
      allowsPropagation: true,
      kind: "network" as const,
      description: `Inbound connection from ${newNode.label} (${rawUrl}) to ${targetId}`,
    };

    setGraph((prev) => ({
      nodes: [newNode, ...prev.nodes],
      edges: [...prev.edges, newEdge],
    }));

    return newNode;
  };

  // Action: Reset graph to baseline synthetic topology
  const resetGraph = () => {
    setGraph(syntheticGraph);
    setIsolatedIds([]);
    setLastIsolatedId(null);
    setHasSimulated(false);
  };

  // Action: Simulate Isolation
  const isolateNode = (nodeId: string) => {
    if (isolatedIds.includes(nodeId)) return;
    const nextIsolated = [...isolatedIds, nodeId];
    setIsolatedIds(nextIsolated);
    setLastIsolatedId(nodeId);
    setHasSimulated(true);

    const comp = simulateIsolation(graph, selectedScenario.sourceNodeId, nodeId);
    const beforeCount = comp.before.reachableNodeIds.length;
    const afterCount = comp.after.reachableNodeIds.length;
    const mitigated = beforeCount - afterCount;
    const critMitigated = comp.before.criticalNodesReached.filter(
      (c) => !comp.after.criticalNodesReached.includes(c),
    ).length;

    const newRecord: SimulationHistoryRecord = {
      id: `SIM-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toISOString(),
      scenarioId: selectedScenario.id,
      scenarioTitle: selectedScenario.title,
      sourceNodeId: selectedScenario.sourceNodeId,
      isolatedNodeId: nodeId,
      beforeReachableCount: beforeCount,
      afterReachableCount: afterCount,
      mitigatedCount: mitigated,
      criticalMitigatedCount: critMitigated,
      assumptions: comp.after.assumptions,
    };

    setHistory((prev) => {
      const updated = [newRecord, ...prev].slice(0, 50);
      try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage errors
      }
      return updated;
    });
  };

  // Action: Reset scenario
  const resetScenario = () => {
    setIsolatedIds([]);
    setLastIsolatedId(null);
    setHasSimulated(false);
  };

  // Action: Clear history
  const clearHistory = () => {
    setHistory([]);
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Helper to compute storage key for a user
  const vaultKey = (userId: string, suffix: string) => `vault:${userId}:${suffix}`;

  // Action: Login (email only)
  const loginUser = (email: string) => {
    const userId = btoa(email).replace(/=+$/g, "");
    sessionStorage.setItem('cypherx.userId', userId);
    try {
      const p = localStorage.getItem(vaultKey(userId, 'profile'));
      if (p) setProfileMap((prev) => ({ ...prev, [userId]: JSON.parse(p) }));
    } catch {}
    try {
      const d = localStorage.getItem(vaultKey(userId, 'devices'));
      if (d) setDeviceMap((prev) => ({ ...prev, [userId]: JSON.parse(d) }));
    } catch {}
    try {
      const a = localStorage.getItem(vaultKey(userId, 'alerts'));
      if (a) setAlertMap((prev) => ({ ...prev, [userId]: JSON.parse(a) }));
    } catch {}
    try {
      const l = localStorage.getItem(vaultKey(userId, 'logs'));
      if (l) setLogMap((prev) => ({ ...prev, [userId]: JSON.parse(l) }));
    } catch {}
    try {
      const s = localStorage.getItem(vaultKey(userId, 'settings'));
      if (s) setVaultSettingsMap((prev) => ({ ...prev, [userId]: JSON.parse(s) }));
    } catch {}
  };

  // Action: Logout
  const logoutUser = () => {
    sessionStorage.removeItem('cypherx.userId');
  };

  // Action: Update profile
  const updateProfile = (userId: string, profile: UserProfile) => {
    setProfileMap((prev) => {
      const updated = { ...prev, [userId]: profile };
      try { localStorage.setItem(vaultKey(userId, 'profile'), JSON.stringify(profile)); } catch {}
      return updated;
    });
  };

  // Action: Add device
  const addDevice = (userId: string, device: Device) => {
    setDeviceMap((prev) => {
      const list = prev[userId] ? [...prev[userId], device] : [device];
      try { localStorage.setItem(vaultKey(userId, 'devices'), JSON.stringify(list)); } catch {}
      return { ...prev, [userId]: list };
    });
    addActivity(userId, { id: `ACT-${Date.now()}`, action: `Added device ${device.name}`, timestamp: new Date().toISOString() });
  };

  // Action: Remove device
  const removeDevice = (userId: string, deviceId: string) => {
    setDeviceMap((prev) => {
      const list = (prev[userId] || []).filter((d) => d.id !== deviceId);
      try { localStorage.setItem(vaultKey(userId, 'devices'), JSON.stringify(list)); } catch {}
      return { ...prev, [userId]: list };
    });
    addActivity(userId, { id: `ACT-${Date.now()}`, action: `Removed device ${deviceId}`, timestamp: new Date().toISOString() });
  };

  // Action: Add alert
  const addAlert = (userId: string, alert: VaultAlert) => {
    setAlertMap((prev) => {
      const list = prev[userId] ? [...prev[userId], alert] : [alert];
      try { localStorage.setItem(vaultKey(userId, 'alerts'), JSON.stringify(list)); } catch {}
      return { ...prev, [userId]: list };
    });
    addActivity(userId, { id: `ACT-${Date.now()}`, action: `Received alert ${alert.title}`, timestamp: new Date().toISOString() });
  };

  // Action: Add activity log entry
  const addActivity = (userId: string, log: ActivityLog) => {
    setLogMap((prev) => {
      const list = prev[userId] ? [...prev[userId], log] : [log];
      try { localStorage.setItem(vaultKey(userId, 'logs'), JSON.stringify(list)); } catch {}
      return { ...prev, [userId]: list };
    });
  };

  // Action: Update vault settings
  const updateVaultSettings = (userId: string, newSettings: Partial<VaultSettings>) => {
    setVaultSettingsMap((prev) => {
      const current = prev[userId] || { theme: 'dark', emailNotifications: false };
      const updated = { ...current, ...newSettings };
      try { localStorage.setItem(vaultKey(userId, 'settings'), JSON.stringify(updated)); } catch {}
      return { ...prev, [userId]: updated };
    });
  };

  // Action: Export vault data
  const exportVaultData = (userId: string) => {
    const data = {
      profile: profileMap[userId] || null,
      devices: deviceMap[userId] || [],
      alerts: alertMap[userId] || [],
      logs: logMap[userId] || [],
      settings: settingsMap[userId] || { theme: 'dark', emailNotifications: false },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cypherx-vault-${userId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Action: Delete account
  const deleteAccount = (userId: string) => {
    const prefixes = ['profile', 'devices', 'alerts', 'logs', 'settings'];
    prefixes.forEach((s) => { try { localStorage.removeItem(vaultKey(userId, s)); } catch {} });
    setProfileMap((prev) => {
      const { [userId]: _, ...rest } = prev;
      return rest;
    });
    setDeviceMap((prev) => {
      const { [userId]: _, ...rest } = prev;
      return rest;
    });
    setAlertMap((prev) => {
      const { [userId]: _, ...rest } = prev;
      return rest;
    });
    setLogMap((prev) => {
      const { [userId]: _, ...rest } = prev;
      return rest;
    });
    setVaultSettingsMap((prev) => {
      const { [userId]: _, ...rest } = prev;
      return rest;
    });
    logoutUser();
  };

  // Compute current user ID and expose per‑user slices
  const currentUserId = sessionStorage.getItem('cypherx.userId');
  const profile = currentUserId ? profileMap[currentUserId] ?? null : null;
  const devices = currentUserId ? deviceMap[currentUserId] ?? [] : [];
  const alerts = currentUserId ? alertMap[currentUserId] ?? [] : [];
  const activityLogs = currentUserId ? logMap[currentUserId] ?? [] : [];
  const vaultSettings = currentUserId ? settingsMap[currentUserId] ?? { theme: 'dark', emailNotifications: false } : { theme: 'dark', emailNotifications: false };

  // Action: Update Settings (App Settings)
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try { window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const value: AppContextValue = {
    graph,
    scenarios: incidentScenarios,
    selectedScenario,
    sourceNode,
    isolatedIds,
    lastIsolatedId,
    hasSimulated,
    blastBefore,
    blastAfter,
    comparison,
    aiReport,
    history,
    settings,
    currentUserId,
    profile,
    devices,
    alerts,
    activityLogs,
    vaultSettings,
    selectScenario,
    isolateNode,
    resetScenario,
    clearHistory,
    updateSettings,
    connectServerByUrl,
    resetGraph,
    loginUser,
    logoutUser,
    updateProfile,
    addDevice,
    removeDevice,
    addAlert,
    addActivity,
    updateVaultSettings,
    exportVaultData,
    deleteAccount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppStoreProvider>");
  return ctx;
}
