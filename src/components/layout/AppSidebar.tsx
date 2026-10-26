import { Link, useRouterState } from "@tanstack/react-router";
import { operationsNav, telemetryNav } from "./nav";
import { MS } from "@/components/shared";
import { useApp } from "@/state/app-store";
import { cn } from "@/lib/utils";

function SidebarLink({ to, label, icon }: { to: string; label: string; icon: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors",
        active
          ? "border border-cyan-500/30 bg-cyan-500/15 text-[13px] font-semibold text-cyan-300"
          : "text-[12px] text-slate-400 hover:bg-surface-hover hover:text-slate-200",
      )}
    >
      <MS name={icon} className="text-[17px]" />
      <span>{label}</span>
    </Link>
  );
}

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { graph, blastBefore, hasSimulated } = useApp();
  const total = graph.nodes.length;
  const critical = graph.nodes.filter((n) => n.isCritical).length;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-40 flex w-60 flex-col justify-between border-r border-outline bg-surface-low p-3 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col gap-1 overflow-y-auto">
          <div className="px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Defensive Operations
          </div>
          <nav className="flex flex-col gap-0.5">
            {telemetryNav.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </nav>

          <div className="mt-3 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Intelligence &amp; Reports
          </div>
          <nav className="flex flex-col gap-0.5">
            {operationsNav.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </nav>
        </div>

        {/* Bottom Engine Telemetry Pill */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-outline bg-surface-lowest p-2.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              ENGINE: GRAPH-BLAST
            </span>
            <span className="font-semibold text-cyan-400">BFS v1.0</span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
            <span>Topology Assets:</span>
            <span className="font-bold text-white">{total} nodes</span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
            <span>Critical Tier-1:</span>
            <span className="font-bold text-rose-400">{critical} assets</span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] text-slate-300">
            <span>Simulation State:</span>
            <span className={cn("font-bold font-mono", hasSimulated ? "text-amber-400" : "text-teal-400")}>
              {hasSimulated ? "ISOLATION ACTIVE" : "BASELINE POSTURE"}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
