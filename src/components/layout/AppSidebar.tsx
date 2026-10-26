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
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
        active
          ? "border border-cyan-500/30 bg-cyan-500/15 text-[15px] font-semibold text-cyan-300"
          : "text-[12px] text-slate-400 hover:bg-hover hover:text-slate-200",
      )}
    >
      <MS name={icon} className="text-[18px]" />
      <span>{label}</span>
    </Link>
  );
}

export function AppSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { graph } = useApp();
  const healthy = graph.nodes.filter((n) => n.status === "healthy").length;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-40 flex w-60 flex-col justify-between border-r border-outline bg-surface-low p-2 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col gap-1 overflow-y-auto">
          <div className="px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            SOC Telemetry
          </div>
          <nav className="flex flex-col gap-0.5">
            {telemetryNav.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </nav>
          <div className="mt-2 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Operations Hub
          </div>
          <nav className="flex flex-col gap-0.5">
            {operationsNav.map((item) => (
              <SidebarLink key={item.to} {...item} />
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-1 rounded border border-outline bg-surface-lowest p-2">
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
            <span>INGESTION STATUS</span>
            <span className="font-semibold text-cyan-400">{Math.round((healthy / graph.nodes.length) * 100)}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-hover">
            <div
              className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"
              style={{ width: `${(healthy / graph.nodes.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400">
            <span>SIMULATED ASSETS</span>
            <span className="font-medium text-slate-200">{graph.nodes.length}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
