import { useState, type ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-cyan-500/30 selection:text-cyan-300">
      <AppHeader onMenuClick={() => setSidebarOpen((prev) => !prev)} />
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="pt-14 lg:pl-60">
        <main className="flex flex-col gap-3 p-3 lg:p-4">{children}</main>
      </div>
    </div>
  );
}

