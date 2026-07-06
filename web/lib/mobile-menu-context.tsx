"use client";

import { createContext, useContext, useState } from "react";

interface MobileMenuState {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const MobileMenuContext = createContext<MobileMenuState | null>(null);

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileMenuContext.Provider value={{ open, openMenu: () => setOpen(true), closeMenu: () => setOpen(false) }}>
      {children}
    </MobileMenuContext.Provider>
  );
}

export function useMobileMenu(): MobileMenuState {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) throw new Error("useMobileMenu must be used within MobileMenuProvider");
  return ctx;
}
