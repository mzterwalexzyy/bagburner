"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { botChain } from "@/lib/wagmi";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/request", label: "Request Report" },
  { href: "/my-reports", label: "My Reports" },
  { href: "/conversations", label: "Live Conversations" },
  { href: "/marketplace", label: "Agent Marketplace" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
];

export function Sidebar() {
  const pathname = usePathname();
  const explorerUrl = botChain.blockExplorers?.default.url;

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col justify-between h-screen sticky top-0">
      <div>
        <div className="px-5 py-5 flex items-center gap-2 border-b border-border">
          <span className="text-xl">🔥</span>
          <div>
            <div className="font-semibold leading-tight">BagBurner</div>
            <div className="text-xs text-accent leading-tight">AI Agent Tax Analyst</div>
          </div>
        </div>
        <nav className="px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm transition ${
                  active ? "bg-accent-dim text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-4 py-4 border-t border-border">
        <div className="rounded-lg bg-surface-2 border border-border p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted">On-chain Status</span>
            <span className="flex items-center gap-1 text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" /> Live
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Network</span>
            <span>{botChain.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Contract</span>
            <span className="font-mono">
              {CONTRACT_ADDRESS ? `${CONTRACT_ADDRESS.slice(0, 6)}...${CONTRACT_ADDRESS.slice(-4)}` : "—"}
            </span>
          </div>
          {explorerUrl && CONTRACT_ADDRESS && (
            <a
              href={`${explorerUrl}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="block text-accent hover:underline pt-1"
            >
              View on Explorer →
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
