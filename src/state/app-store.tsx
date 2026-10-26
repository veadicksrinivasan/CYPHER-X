import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_DETECTION_CONFIG, runDetections } from "@/data/detection";
import { infrastructureGraph, nodeById } from "@/data/infrastructure";
import {
  DEFAULT_INCIDENT_ID,
  incidentById,
  incidentForAlert,
  incidents,
} from "@/data/incidents";
import { analyze, simulateIsolation, type BlastResult, type ContainmentComparison } from "@/lib/blast-radius";
import type { Alert, DetectionConfig, Incident, InfraNode } from "@/data/types";

const STORAGE_KEY = "cypherx.detection-config.v1";

interface AppContextValue {
  graph: typeof infrastructureGraph;
  alerts: Alert[];
  incidents: Incident[];
  selectedIncident: Incident;
  sourceNode: InfraNode;
  /** Components isolated in the active simulation. */
  isolatedIds: string[];
  /** Isolation state captured before the current simulation started. */
  scenarioBaseline: string[];
  hasSimulated: boolean;
  lastIsolatedId: string | null;
  detectionConfig: DetectionConfig;
  blastBefore: BlastResult;
  /** Null until a containment has been simulated in the current scenario. */
  blastAfter: BlastResult | null;
  comparison: ContainmentComparison | null;
  selectIncident: (id: string) => void;
  isolateNode: (id: string) => void;
  resetScenario: () => void;
  setDetectionConfig: (config: DetectionConfig) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [selectedIncidentId, setSelectedIncidentId] = useState(DEFAULT_INCIDENT_ID);
  const [scenarioBaseline, setScenarioBaseline] = useState<string[]>([]);
  const [isolatedIds, setIsolatedIds] = useState<string[]>([]);
  const [hasSimulated, setHasSimulated] = useState(false);
  const [lastIsolatedId, setLastIsolatedId] = useState<string | null>(null);
  const [detectionConfig, setDetectionConfigState] = useState<DetectionConfig>(DEFAULT_DETECTION_CONFIG);

  // Restore saved detection settings after hydration (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setDetectionConfigState({ ...DEFAULT_DETECTION_CONFIG, ...JSON.parse(raw) });
    } catch {
      // Ignore malformed local settings; defaults stay in effect.
    }
  }, []);

  const setDetectionConfig = (config: DetectionConfig) => {
    setDetectionConfigState(config);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Storage may be unavailable; the in-memory config still applies.
    }
  };

  const alerts = useMemo(() => runDetections(undefined, detectionConfig), [detectionConfig]);

  const selectedIncident =
    incidentById(selectedIncidentId) ?? incidentById(DEFAULT_INCIDENT_ID)!;
  const sourceNode = nodeById(selectedIncident.sourceNodeId)!;

  const blastBefore = useMemo(
    () => analyze(infrastructureGraph, selectedIncident.sourceNodeId, scenarioBaseline),
    [selectedIncident.sourceNodeId, scenarioBaseline],
  );

  const blastAfter = useMemo(
    () => (hasSimulated ? analyze(infrastructureGraph, selectedIncident.sourceNodeId, isolatedIds) : null),
    [hasSimulated, selectedIncident.sourceNodeId, isolatedIds],
  );

  const comparison = useMemo(
    () =>
      hasSimulated && lastIsolatedId
        ? simulateIsolation(infrastructureGraph, selectedIncident.sourceNodeId, lastIsolatedId, scenarioBaseline)
        : null,
    [hasSimulated, lastIsolatedId, selectedIncident.sourceNodeId, scenarioBaseline],
  );

  const selectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setScenarioBaseline([]);
    setIsolatedIds([]);
    setHasSimulated(false);
    setLastIsolatedId(null);
  };

  const isolateNode = (id: string) => {
    if (isolatedIds.includes(id)) return;
    if (!hasSimulated) setScenarioBaseline(isolatedIds.length > 0 ? isolatedIds : []);
    setIsolatedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setHasSimulated(true);
    setLastIsolatedId(id);
  };

  const resetScenario = () => {
    setIsolatedIds(scenarioBaseline);
    setHasSimulated(false);
    setLastIsolatedId(null);
  };

  const value: AppContextValue = {
    graph: infrastructureGraph,
    alerts,
    incidents,
    selectedIncident,
    sourceNode,
    isolatedIds,
    scenarioBaseline,
    hasSimulated,
    lastIsolatedId,
    detectionConfig,
    blastBefore,
    blastAfter,
    comparison,
    selectIncident,
    isolateNode,
    resetScenario,
    setDetectionConfig,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppStoreProvider>");
  return ctx;
}

/** Alert lookup helpers shared across pages. */
export function useAlertLookup() {
  const { alerts } = useApp();
  return useMemo(() => {
    const byId = new Map(alerts.map((a) => [a.id, a] as const));
    return {
      byId,
      incidentFor: (alertId: string) => incidentForAlert(alertId),
    };
  }, [alerts]);
}
