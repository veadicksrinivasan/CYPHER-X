import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { headerNav } from "./nav";
import { DemoPill, MS } from "@/components/shared";
import { useApp } from "@/state/app-store";
import { cn } from "@/lib/utils";

export function AppHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { selectedScenario, history } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate({
      to: "/infrastructure",
      search: { node: query.trim() },
    });
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-14 border-b border-outline bg-surface/95 px-4 backdrop-blur-sm">
      <div className="flex h-14 w-full items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="rounded p-1 text-slate-400 hover:bg-surface-raised hover:text-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <MS name="menu" className="text-[20px]" />
          </button>

          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded border border-cyan-400/40 bg-cyan-500/20 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
              <MS name="shield" className="text-[18px]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold tracking-tight text-white font-mono">CYPHER-X</span>
              <span className="text-[8px] font-mono tracking-widest text-cyan-400 uppercase">ANALYZE / SIMULATE / DEFEND</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {headerNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-[11px] transition-colors",
                  isActive(item.to)
                    ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:bg-surface-hover hover:text-slate-200",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <form className="relative hidden md:flex items-center" onSubmit={handleSearch}>
            <MS name="search" className="absolute left-2 text-[16px] text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-8 w-60 rounded border border-outline bg-surface-lowest pl-8 pr-2 text-[12px] text-slate-100 placeholder:text-slate-500 transition-colors focus:border-cyan-400 focus:outline-none"
              placeholder="Search components, IPs..."
            />
          </form>

          <DemoPill className="hidden sm:flex" />

          <Link
            to="/history"
            className="relative rounded p-1 text-slate-400 transition-colors hover:bg-surface-raised hover:text-slate-100"
            title={`${history.length} simulations recorded`}
          >
            <MS name="history" className="text-[20px]" />
            {history.length > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500 text-[8px] font-mono font-bold text-slate-950">
                {history.length > 9 ? "9+" : history.length}
              </span>
            )}
          </Link>

          <div className="flex items-center gap-2 border-l border-outline pl-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/20">
              <MS name="person" className="text-[18px] text-cyan-300" />
            </div>
            <div className="hidden flex-col text-left lg:flex">
              <span className="font-mono text-[11px] leading-tight text-slate-100">Analyst Console</span>
              <span className="font-mono text-[9px] leading-tight text-cyan-400 font-medium">
                {selectedScenario.scenarioCode} Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
