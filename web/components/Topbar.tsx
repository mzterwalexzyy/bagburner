"use client";

import { Menu } from "lucide-react";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { botChain } from "@/lib/wagmi";
import { useMobileMenu } from "@/lib/mobile-menu-context";

export function Topbar({ title }: { title: string }) {
  const { openMenu } = useMobileMenu();

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 bg-background/80 backdrop-blur z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={openMenu} className="md:hidden shrink-0 text-muted p-1 -ml-1" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <span className="hidden sm:flex px-3 py-1 rounded-full bg-surface-2 border border-border text-xs items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" /> {botChain.name} · Live
        </span>
        <h1 className="text-sm text-muted truncate">{title}</h1>
      </div>
      <ConnectWalletButton />
    </header>
  );
}
