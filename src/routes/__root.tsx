import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { AppStoreProvider } from "@/state/app-store";
import { AppShell } from "@/components/layout/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-950/40 text-cyan-400">
        <span className="material-symbols-outlined text-[32px]">shield_question</span>
      </div>
      <h1 className="mt-4 font-mono text-4xl font-bold tracking-tight text-white">404</h1>
      <h2 className="mt-2 text-lg font-semibold text-slate-200">Telemetry Channel Not Found</h2>
      <p className="mt-1 max-w-md text-[13px] text-slate-400">
        The requested console route does not exist or has been redirected to another enclave.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded bg-cyan-500 px-4 py-2 font-mono text-xs font-semibold text-slate-950 shadow-md transition-colors hover:bg-cyan-400"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Return to Mission Control
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error("Router error:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/40 bg-rose-950/40 text-rose-400">
        <span className="material-symbols-outlined text-[32px]">error</span>
      </div>
      <h1 className="mt-4 text-xl font-bold text-white">Console Runtime Error</h1>
      <p className="mt-2 max-w-md text-[13px] text-slate-400">
        An unexpected fault occurred in the rendering pipeline. The error has been captured.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="rounded bg-cyan-500 px-4 py-2 font-mono text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
        >
          Retry View
        </button>
        <Link
          to="/"
          className="rounded border border-outline bg-surface px-4 py-2 font-mono text-xs text-slate-300 transition-colors hover:bg-surface-hover"
        >
          Go to Mission Control
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>
        <AppShell>
          <Outlet />
        </AppShell>
      </AppStoreProvider>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#131a2c",
            border: "1px solid #26334d",
            color: "#f1f5f9",
            fontSize: "12px",
          },
        }}
      />
    </QueryClientProvider>
  );
}

