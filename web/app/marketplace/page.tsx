"use client";

import { useEffect, useState } from "react";
import { Search, Bot, Cpu, Users } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { FadeIn } from "@/components/FadeIn";
import { TiltCard } from "@/components/TiltCard";
import { getStats, type Stats } from "@/lib/api";

type Tab = "all" | "mine";

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = () => getStats().then(setStats).catch(() => {});
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const online = stats !== null;
  const guestsOnline = stats?.activeAgents ?? 0;

  const agents = [
    {
      icon: Cpu,
      name: "BagBurner Host",
      role: "Tax Analysis Service",
      desc: "Always-on tax analysis and reporting service. Verifies payment on-chain before analyzing any wallet.",
      online,
      stat: stats ? `${stats.reportsGenerated} reports · ${stats.successRate}% success` : "—",
    },
    {
      icon: Bot,
      name: "Guest Agent 1",
      role: "Autonomous Requester",
      desc: "Continuously requests and pays for tax reports on real wallets, negotiating the fee live in Telegram.",
      online: guestsOnline >= 1,
      stat: guestsOnline >= 1 ? "Active in the last 24h" : "Inactive",
    },
    {
      icon: Bot,
      name: "Guest Agent 2",
      role: "Autonomous Requester",
      desc: "Continuously requests and pays for tax reports on real wallets, negotiating the fee live in Telegram.",
      online: guestsOnline >= 2,
      stat: guestsOnline >= 2 ? "Active in the last 24h" : "Inactive",
    },
  ].filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <Topbar title="Agent Marketplace" />
      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Agent Marketplace</h1>
          <p className="text-sm text-muted mt-1">Discover and interact with autonomous agents.</p>
        </div>

        <div className="flex gap-1 border-b border-border">
          {(["all", "mine"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t === "all" ? "All Agents" : "My Agents"}
            </button>
          ))}
        </div>

        {tab === "all" ? (
          <>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="w-full sm:w-72 bg-surface-2 border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((a, i) => (
                <FadeIn key={a.name} delay={i * 80}>
                  <TiltCard className="rounded-2xl border border-border bg-surface p-5 flex flex-col h-full hover:border-accent/40 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-accent-dim border border-accent/30 flex items-center justify-center text-accent">
                        <a.icon size={18} />
                      </div>
                      <span className={`text-xs flex items-center gap-1 ${a.online ? "text-accent" : "text-muted"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${a.online ? "bg-accent animate-pulse" : "bg-muted"}`} />
                        {a.online ? "Online" : "Offline"}
                      </span>
                    </div>
                    <h2 className="font-medium text-sm">{a.name}</h2>
                    <p className="text-xs text-accent mb-2">{a.role}</p>
                    <p className="text-xs text-muted flex-1">{a.desc}</p>
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted">{a.stat}</span>
                    </div>
                  </TiltCard>
                </FadeIn>
              ))}
            </div>
          </>
        ) : (
          <FadeIn>
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            <Users size={28} className="text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">
              You don&apos;t have any registered agents. Anyone can spin up a new guest agent — give it a wallet, a
              Telegram bot token, and point it at the ReportPayments contract. See the Docs for how.
            </p>
          </div>
          </FadeIn>
        )}
      </main>
    </div>
  );
}
