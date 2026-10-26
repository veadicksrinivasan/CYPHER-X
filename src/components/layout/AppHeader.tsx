import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { headerNav } from "./nav";
import { DemoPill, MS } from "@/components/shared";
import { useApp } from "@/state/app-store";
import { cn } from "@/lib/utils";

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { alerts } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-14 border-b border-outline bg-surface/95 px-4 backdrop-blur-sm">
      <div className="flex h-14 w-full items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="rounded p-1 text-slate-400 hover:bg-raised hover:text-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <MS name="menu" className="text-[20px]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-cyan-400/40 bg-cyan-500/20 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
              <MS name="shield" className="text-[18px]" />
            </div>
            <span className="text-[15px] font-bold uppercase tracking-tight text-white">CYPHER-X</span>
          </div>
          <nav className="hidden items-center gap-1 xl:flex">
            {headerNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-[11px] transition-colors",
                  isActive(item.to)
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:bg-hover-strong hover:text-slate-200",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <form
            className="relative hidden md:flex items-center"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/security-alerts", search: { q: query || undefined } });
            }}
          >
            <MS name="search" className="absolute left-2 text-[16px] text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-64 rounded border border-outline bg-surface-lowest pl-8 pr-2 text-[12px] text-slate-100 placeholder:text-slate-500 transition-colors focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
              placeholder="Search alerts, assets, rules..."
            />
          </form>
          <DemoPill className="hidden sm:flex" />
          <div
            className="hidden items-center gap-1 rounded-full border border-outline bg-surface-lowest p-1 sm:flex"
            title="Console theme"
          >
            <span className="flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300">
              <MS name="dark_mode" className="text-[13px]" />
              <span>Dark</span>
            </span>
            <button
              aria-label="Light mode is not available in this demo console"
              className="rounded-full px-1.5 py-0.5 text-[11px] text-slate-400 transition-all hover:text-slate-200"
              onClick={() =>
                toast.info("This demo console ships with the designed dark theme only.", {
                  description: "Theme switching is not part of the imported design.",
                })
              }
            >
              <MS name="light_mode" className="text-[13px]" />
            </button>
          </div>
          <Link
            to="/security-alerts"
            className="relative rounded p-1 text-slate-400 transition-colors hover:bg-raised hover:text-slate-100"
            aria-label={`${alerts.length} active alerts`}
          >
            <MS name="notifications" className="text-[20px]" />
            {alerts.length > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-surface" />
            )}
          </Link>
          <div className="flex items-center gap-2 border-l border-outline pl-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/20">
              <MS name="person" className="text-[18px] text-cyan-300" />
            </div>
            <div className="hidden flex-col text-left lg:flex">
              <span className="font-mono text-[11px] leading-tight text-slate-100">David Chen</span>
              <span className="font-mono text-[10px] leading-tight text-slate-400">Security Analyst</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
