import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/state/app-store";
import { MS } from "@/components/shared";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, clearHistory } = useApp();

  return (
    <div className="flex flex-col gap-3">
      {/* Top Banner */}
      <section className="flex flex-col justify-between gap-3 rounded-lg border border-outline bg-surface p-3.5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-300">
              <MS name="tune" className="text-[20px]" />
            </span>
            <h1 className="text-[16px] font-bold text-white">Console Configuration &amp; Project Information</h1>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-400">
            System settings, engine configuration parameters, and technical architecture documentation
          </p>
        </div>
      </section>

      {/* Grid: Settings Form + Project Info Card */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Settings Form */}
        <div className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-4 shadow-sm lg:col-span-6">
          <div className="border-b border-outline pb-2">
            <h2 className="text-[14px] font-bold text-white">Engine Simulation Preferences</h2>
            <p className="text-[11px] text-slate-400">Configure how graph traversal and intelligence features behave</p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Auto AI Analysis */}
            <div className="flex items-center justify-between rounded border border-outline bg-surface-low p-3">
              <div>
                <div className="font-semibold text-white text-[13px]">AI-Assisted Security Reasoning</div>
                <div className="text-[11px] text-slate-400">
                  Automatically generate executive summaries and containment advice on simulation runs
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoAIAnalysis}
                onChange={(e) => updateSettings({ autoAIAnalysis: e.target.checked })}
                className="h-4 w-4 rounded border-outline bg-surface text-cyan-400 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Highlight Attack Paths */}
            <div className="flex items-center justify-between rounded border border-outline bg-surface-low p-3">
              <div>
                <div className="font-semibold text-white text-[13px]">Animated Attack Path Highlighting</div>
                <div className="text-[11px] text-slate-400">
                  Render animated rose dashed pulses on all active lateral attack paths
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.highlightAttackPaths}
                onChange={(e) => updateSettings({ highlightAttackPaths: e.target.checked })}
                className="h-4 w-4 rounded border-outline bg-surface text-cyan-400 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Strict Propagation Only */}
            <div className="flex items-center justify-between rounded border border-outline bg-surface-low p-3">
              <div>
                <div className="font-semibold text-white text-[13px]">Strict Propagation Enforcement</div>
                <div className="text-[11px] text-slate-400">
                  Enforce allowsPropagation === true checks during traversal (blocks monitoring &amp; air-gaps)
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.strictPropagationOnly}
                onChange={(e) => updateSettings({ strictPropagationOnly: e.target.checked })}
                className="h-4 w-4 rounded border-outline bg-surface text-cyan-400 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Reset History */}
            <div className="mt-2 flex items-center justify-between border-t border-outline pt-3">
              <div>
                <div className="font-semibold text-white text-[13px]">Local Demonstration Storage</div>
                <div className="text-[11px] text-slate-400">Clear cached history records and reset preferences</div>
              </div>
              <button
                onClick={clearHistory}
                className="rounded border border-rose-500/40 bg-rose-950/60 px-3 py-1.5 font-mono text-[11px] text-rose-300 hover:bg-rose-900"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        {/* Project Information & Hackathon Details */}
        <div className="flex flex-col gap-3 rounded-lg border border-outline bg-surface p-4 shadow-sm lg:col-span-6">
          <div className="border-b border-outline pb-2">
            <h2 className="text-[14px] font-bold text-white">CYPHER-X Project Metadata</h2>
            <p className="text-[11px] text-slate-400">College Hackathon Demonstration Details</p>
          </div>

          <div className="flex flex-col gap-2 font-mono text-[11px]">
            <div className="flex justify-between rounded border border-outline bg-surface-lowest p-2">
              <span className="text-slate-400">PROJECT NAME:</span>
              <span className="font-bold text-white">CYPHER-X</span>
            </div>
            <div className="flex justify-between rounded border border-outline bg-surface-lowest p-2">
              <span className="text-slate-400">TAGLINE:</span>
              <span className="text-cyan-400 font-bold">ANALYZE / SIMULATE / DEFEND</span>
            </div>
            <div className="flex justify-between rounded border border-outline bg-surface-lowest p-2">
              <span className="text-slate-400">ARCHITECTURE:</span>
              <span className="text-white">Deterministic BFS Graph Traversal</span>
            </div>
            <div className="flex justify-between rounded border border-outline bg-surface-lowest p-2">
              <span className="text-slate-400">FRONTEND STACK:</span>
              <span className="text-white">React 19, TypeScript, Vite, Tailwind CSS</span>
            </div>
            <div className="flex justify-between rounded border border-outline bg-surface-lowest p-2">
              <span className="text-slate-400">TEST SUITE:</span>
              <span className="text-teal-400 font-bold">Vitest (39 Engine Unit Tests Passing)</span>
            </div>
            <div className="flex justify-between rounded border border-outline bg-surface-lowest p-2">
              <span className="text-slate-400">GITHUB REPOSITORY:</span>
              <span className="text-cyan-300 truncate">github.com/veadicksrinivasan/CYPHER-X</span>
            </div>
          </div>

          <div className="rounded border border-outline bg-surface-low p-3 text-[12px] leading-relaxed text-slate-300">
            <strong className="text-white">Core Value Proposition:</strong> In complex enterprise cloud networks,
            security teams struggle to predict the cascading blast radius of compromised credentials and exposed
            assets. CYPHER-X delivers automated, deterministic reachability simulation—allowing defenders to rehearse
            and evaluate network containment strategies in seconds before touching live production infrastructure.
          </div>
        </div>
      </div>
    </div>
  );
}

