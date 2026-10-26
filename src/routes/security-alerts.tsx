import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/state/app-store";
import { nodeLabel } from "@/data/infrastructure";
import { MS, SeverityBadge, StatusLabel, Panel } from "@/components/shared";
import { cn } from "@/lib/utils";

interface SecurityAlertsSearch {
  q?: string;
  status?: string;
}

export const Route = createFileRoute("/security-alerts")({
  validateSearch: (search: Record<string, unknown>): SecurityAlertsSearch => {
    return {
      q: typeof search.q === "string" ? search.q : undefined,
      status: typeof search.status === "string" ? search.status : undefined,
    };
  },
  component: SecurityAlertsPage,
});

function SecurityAlertsPage() {
  const { alerts, selectedIncident } = useApp();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState(search.q ?? "");
  const [statusFilter, setStatusFilter] = useState(search.status ?? "all");
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(search.q ?? (alerts[0]?.id ?? null));

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.id.toLowerCase().includes(term) ||
      a.title.toLowerCase().includes(term) ||
      a.ruleId.toLowerCase().includes(term) ||
      a.ruleName.toLowerCase().includes(term) ||
      a.assetId.toLowerCase().includes(term)
    );
  });

  const activeAlert = alerts.find((a) => a.id === selectedAlertId) ?? filteredAlerts[0] ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner */}
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3 shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
              <MS name="notifications_active" className="text-[20px]" />
            </span>
            <h1 className="text-[16px] font-bold text-white">Security Alerts &amp; Active Triage</h1>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-400">
            Real-time evaluation of simulated telemetry against transparent SOC detection rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/investigations" })}
            className="flex items-center gap-1 rounded bg-cyan-500 px-3 py-1.5 font-mono text-[11px] font-semibold text-slate-950 shadow-sm transition-all hover:bg-cyan-400"
          >
            <MS name="policy" className="text-[16px]" />
            Active Cases ({selectedIncident.id})
          </button>
        </div>
      </section>

      {/* Main Split View: Alerts Table + Evidence Inspector */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Alerts List */}
        <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm lg:col-span-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-outline pb-2">
            <div className="flex items-center gap-1 rounded border border-outline bg-surface-lowest px-2 py-1 w-full sm:w-64">
              <MS name="search" className="text-[16px] text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search alert, rule, asset..."
                className="w-full bg-transparent text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {["all", "open", "needs-review", "under-review", "investigating"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    "rounded px-2 py-0.5 font-mono text-[10px] transition-colors",
                    statusFilter === st
                      ? "border border-cyan-500/40 bg-cyan-950 text-cyan-300 font-semibold"
                      : "text-slate-400 hover:bg-surface-low hover:text-slate-200",
                  )}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-outline font-mono text-[10px] text-slate-400">
                  <th className="px-2 py-1.5">ID</th>
                  <th className="px-2 py-1.5">Rule / Event</th>
                  <th className="px-2 py-1.5">Target Asset</th>
                  <th className="px-2 py-1.5">Severity</th>
                  <th className="px-2 py-1.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline">
                {filteredAlerts.map((a) => {
                  const isSelected = activeAlert?.id === a.id;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAlertId(a.id)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected
                          ? "bg-cyan-950/40 border-l-2 border-l-cyan-400"
                          : "hover:bg-surface-low",
                      )}
                    >
                      <td className="px-2 py-2 font-mono text-[11px] font-semibold text-cyan-400">{a.id}</td>
                      <td className="px-2 py-2">
                        <div className="font-medium text-slate-200">{a.title}</div>
                        <div className="font-mono text-[10px] text-slate-400">{a.ruleId} — {a.ruleName}</div>
                      </td>
                      <td className="px-2 py-2 font-mono text-[11px] text-slate-300">{nodeLabel(a.assetId)}</td>
                      <td className="px-2 py-2"><SeverityBadge severity={a.severity} /></td>
                      <td className="px-2 py-2 text-right"><StatusLabel status={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Evidence & Deep Triage Inspector */}
        <div className="flex flex-col gap-2 rounded-lg border border-outline bg-surface p-3 shadow-sm lg:col-span-5">
          {activeAlert ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-outline pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] font-bold text-white">{activeAlert.id}</span>
                    <SeverityBadge severity={activeAlert.severity} />
                  </div>
                  <h2 className="mt-1 text-[14px] font-semibold text-slate-100">{activeAlert.title}</h2>
                </div>
                <StatusLabel status={activeAlert.status} />
              </div>

              <div className="rounded border border-outline bg-surface-low p-2">
                <span className="font-mono text-[10px] uppercase text-slate-400">Detection Reason</span>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-200">{activeAlert.detectionReason}</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Telemetry Evidence Log ({activeAlert.evidence.length} events)
                </span>
                <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
                  {activeAlert.evidence.map((ev, idx) => (
                    <div key={idx} className="rounded border border-outline/70 bg-surface-lowest p-2 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-cyan-400">
                        <span>Event ID: {ev.eventId}</span>
                      </div>
                      <div className="mt-1 font-sans text-[12px] font-medium text-slate-200">{ev.summary}</div>
                      {ev.detail && <div className="mt-1 text-[10px] text-slate-400 break-all">{ev.detail}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-outline pt-2">
                <button
                  onClick={() => navigate({ to: "/infrastructure", search: { node: activeAlert.assetId } })}
                  className="flex items-center gap-1 font-mono text-[11px] text-cyan-400 hover:underline"
                >
                  <MS name="hub" className="text-[16px]" />
                  Locate Asset on Map
                </button>
                <button
                  onClick={() => navigate({ to: "/investigations" })}
                  className="flex items-center gap-1 font-mono text-[11px] text-rose-300 hover:underline"
                >
                  <MS name="policy" className="text-[16px]" />
                  Escalate to Incident
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center font-mono text-[12px] text-slate-500">
              Select an alert from the table to inspect evidence
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

