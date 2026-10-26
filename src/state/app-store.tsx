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

const DEFAULT_SETTINGS: AppSettings = {
  autoAIAnalysis: true,
  highlightAttackPaths: true,
  strictPropagationOnly: true,
  maxPathsDisplayed: 20,
  soundAlerts: false,
};

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

  // Actions
  selectScenario: (scenarioId: string) => void;
  isolateNode: (nodeId: string) => void;
  resetScenario: () => void;
  clearHistory: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(DEFAULT_SCENARIO_ID);
  const [isolatedIds, setIsolatedIds] = useState<string[]>([]);
  const [lastIsolatedId, setLastIsolatedId] = useState<string | null>(null);
  const [hasSimulated, setHasSimulated] = useState<boolean>(false);
  const [history, setHistory] = useState<SimulationHistoryRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Restore history and settings from browser storage on mount
  useEffect(() => {
    try {
      const rawHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (rawHistory) {
        setHistory(JSON.parse(rawHistory));
      }
      const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (rawSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
      }
    } catch {
      // Storage unavailable or malformed; defaults stay
    }
  }, []);

  const selectedScenario = useMemo(() => getScenarioById(selectedScenarioId), [selectedScenarioId]);

  const sourceNode = useMemo(
    () => getNodeById(syntheticGraph, selectedScenario.sourceNodeId)!,
    [selectedScenario.sourceNodeId],
  );

  // 1. Calculate baseline blast radius using Veadick's Engine
  const blastBefore = useMemo(
    () => calculateBlastRadius(syntheticGraph, selectedScenario.sourceNodeId),
    [selectedScenario.sourceNodeId],
  );

  // 2. Calculate isolated blast radius & comparison using Veadick's Engine
  const comparison = useMemo(() => {
    if (!hasSimulated || !lastIsolatedId) return null;
    return simulateIsolation(syntheticGraph, selectedScenario.sourceNodeId, lastIsolatedId);
  }, [hasSimulated, lastIsolatedId, selectedScenario.sourceNodeId]);

  const blastAfter = useMemo(() => (comparison ? comparison.after : null), [comparison]);

  // 3. AI Security Reasoning
  const aiReport = useMemo(
    () => generateAIAnalysis(syntheticGraph, selectedScenario.sourceNodeId, blastBefore, comparison),
    [selectedScenario.sourceNodeId, blastBefore, comparison],
  );

  // Action: Select Scenario
  const selectScenario = (id: string) => {
    setSelectedScenarioId(id);
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

    // Record into simulation history
    const comp = simulateIsolation(syntheticGraph, selectedScenario.sourceNodeId, nodeId);
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
        // storage ignored
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
      // storage ignored
    }
  };

  // Action: Update settings
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // storage ignored
      }
      return updated;
    });
  };

  const value: AppContextValue = {
    graph: syntheticGraph,
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
    selectScenario,
    isolateNode,
    resetScenario,
    clearHistory,
    updateSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppStoreProvider>");
  return ctx;
}
