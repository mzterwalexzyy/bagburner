"use client";

import { Sidebar } from "./Sidebar";
import { MobileMenuProvider, useMobileMenu } from "@/lib/mobile-menu-context";

function Shell({ children }: { children: React.ReactNode }) {
  const { open, closeMenu } = useMobileMenu();
  return (
    <div>
      <Sidebar open={open} onClose={closeMenu} />
      <div className="min-w-0 md:ml-64">{children}</div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MobileMenuProvider>
      <Shell>{children}</Shell>
    </MobileMenuProvider>
  );
}
