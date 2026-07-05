import { ConnectWalletButton } from "./ConnectWalletButton";
import { botChain } from "@/lib/wagmi";

export function Topbar({ title }: { title: string }) {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6 sticky top-0 bg-background/80 backdrop-blur z-10">
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full bg-surface-2 border border-border text-xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" /> {botChain.name} · Live
        </span>
        <h1 className="text-sm text-muted">{title}</h1>
      </div>
      <ConnectWalletButton />
    </header>
  );
}
