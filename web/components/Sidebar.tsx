"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Files, MessagesSquare, Store, BookOpen, Info, Flame, ExternalLink, X } from "lucide-react";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { botChain } from "@/lib/wagmi";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/request", label: "Request Report", icon: FileText },
  { href: "/my-reports", label: "My Reports", icon: Files },
  { href: "/conversations", label: "Live Conversations", icon: MessagesSquare },
  { href: "/marketplace", label: "Agent Marketplace", icon: Store },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/about", label: "About", icon: Info },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const explorerUrl = botChain.blockExplorers?.default.url;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />}

      <aside
        className={`w-64 shrink-0 border-r border-border bg-surface flex flex-col justify-between h-screen fixed top-0 left-0 z-50 transition-transform duration-200 md:sticky md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="px-5 py-5 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <Flame size={22} className="text-accent" fill="currentColor" />
              <div>
                <div className="font-semibold leading-tight">BagBurner</div>
                <div className="text-xs text-accent leading-tight">AI Agent Tax Analyst</div>
              </div>
            </div>
            <button onClick={onClose} className="md:hidden text-muted p-1" aria-label="Close menu">
              <X size={20} />
            </button>
          </div>
          <nav className="px-3 py-4 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`px-3 py-2 rounded-md text-sm transition flex items-center gap-2.5 ${
                    active ? "bg-accent-dim text-accent" : "text-muted hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-4 py-4 border-t border-border space-y-3">
          <ThemeToggle />
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
                className="flex items-center gap-1 text-accent hover:underline pt-1"
              >
                View on Explorer <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
