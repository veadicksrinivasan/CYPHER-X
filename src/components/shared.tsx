import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AlertStatus, Criticality, Severity } from "@/data/types";

export function MS({ name, className }: { name: string; className?: string }) {
  return <span className={cn("material-symbols-outlined", className)}>{name}</span>;
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex flex-col rounded-lg border border-outline bg-surface shadow-sm", className)}>
      {(title || actions) && (
        <div className="flex flex-col gap-1 border-b border-outline pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-[15px] font-semibold leading-5 tracking-tight text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12px] leading-4 text-muted-foreground">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">{actions}</div>}
        </div>
      )}
      <div className={cn("flex flex-1 flex-col", bodyClassName)}>{children}</div>
    </section>
  );
}

const severityStyles: Record<Severity, string> = {
  critical: "bg-rose-500 text-white font-bold",
  high: "bg-rose-950/80 border border-rose-500/50 text-rose-300",
  medium: "bg-amber-950 border border-amber-500/40 text-amber-300",
  low: "bg-cyan-950 border border-cyan-500/40 text-cyan-300",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        severityStyles[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}

export function CriticalityBadge({ criticality }: { criticality: Criticality }) {
  const styles: Record<Criticality, string> = {
    critical: "text-rose-400 font-semibold",
    high: "text-amber-400 font-medium",
    medium: "text-slate-300",
    low: "text-slate-400",
  };
  return <span className={cn("font-mono text-[9px] uppercase tracking-wide", styles[criticality])}>{styles[criticality]}</span>;
}

const statusLabels: Record<AlertStatus, string> = {
  open: "Open",
  "needs-review": "Needs Review",
  "under-review": "Under Review",
  investigating: "Investigating",
  resolved: "Resolved",
};

const statusTones: Record<AlertStatus, string> = {
  open: "text-slate-400",
  "needs-review": "text-amber-300 font-medium",
  "under-review": "text-rose-300 font-medium",
  investigating: "text-cyan-300 font-medium",
  resolved: "text-teal-300 font-medium",
};

export function StatusLabel({ status }: { status: AlertStatus }) {
  return <span className={cn("font-mono text-[11px]", statusTones[status])}>{statusLabels[status]}</span>;
}

export function DemoPill({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-outline bg-surface-lowest px-2 py-0.5 font-mono text-[10px] text-slate-400",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
      <span>Demo Environment • Simulated Data</span>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  note,
  icon,
  valueClass,
  noteClass,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: string;
  valueClass?: string;
  noteClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col rounded border border-outline/70 bg-surface-low p-2", className)}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-slate-400">{label}</span>
        {icon && <MS name={icon} className="text-[14px] text-slate-400" />}
      </div>
      <span className={cn("mt-1 text-[18px] font-bold leading-6 text-white", valueClass)}>{value}</span>
      {note && <span className={cn("font-mono text-[10px] text-slate-400", noteClass)}>{note}</span>}
    </div>
  );
}
