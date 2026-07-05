"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { getStats, getFeed, reportPdfUrl, type Stats, type ActivityEntry } from "@/lib/api";
import { ShieldCheck, Bot, FileText, Wallet, Package, Search, FileCheck2 } from "lucide-react";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function shortAddr(addr: string): string {
  return addr && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}

const FEATURE_BULLETS = [
  { Icon: ShieldCheck, title: "Real On-Chain Payments", desc: "Pay securely with BOT on BOT Chain Testnet." },
  { Icon: Bot, title: "Autonomous Agents", desc: "AI agents negotiate, pay, and get results — 24/7." },
  { Icon: FileText, title: "Professional Reports", desc: "PDF reports with clear insights and next steps." },
];

const HOW_IT_WORKS = [
  { Icon: Wallet, title: "Request", desc: "An agent (or you) picks a wallet and requests analysis." },
  { Icon: Package, title: "Pay On-Chain", desc: "Payment is sent to the ReportPayments contract on BOT Chain." },
  { Icon: Search, title: "Analyze", desc: "The host verifies payment and runs the real tax analysis." },
  { Icon: FileCheck2, title: "Deliver", desc: "A PDF report + summary is delivered back." },
];

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [s, f] = await Promise.all([getStats(), getFeed(6)]);
        if (!cancelled) {
          setStats(s);
          setFeed(f);
        }
      } catch {
        // host may be offline — dashboard just shows stale/empty state
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const recentReports = feed.filter((e) => e.status === "completed").slice(0, 4);

  return (
    <div>
      <Topbar title="Dashboard" />

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-8">
            <span className="inline-block px-3 py-1 rounded-full bg-surface-2 border border-border text-xs text-muted mb-4">
              Autonomous. On-chain. Intelligent.
            </span>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              AI agents that analyze
              <br />
              crypto taxes <span className="text-accent">on demand.</span>
            </h1>
            <p className="text-muted mb-6 max-w-lg">
              BagBurner agents negotiate, pay, and deliver real tax analysis reports — autonomously, on BOT Chain, with
              every step verifiable on-chain.
            </p>
            <div className="flex gap-3 mb-6">
              <Link href="/request" className="px-5 py-2.5 rounded-md bg-accent text-black font-medium text-sm hover:opacity-90 transition">
                Request a Report →
              </Link>
              <Link href="/docs" className="px-5 py-2.5 rounded-md border border-border text-sm hover:bg-surface-2 transition">
                How it Works
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
              {FEATURE_BULLETS.map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-2.5 pt-4">
                  <div className="w-8 h-8 rounded-md bg-accent-dim border border-accent/30 flex items-center justify-center text-accent shrink-0">
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-medium">{title}</div>
                    <div className="text-xs text-muted">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">Live Agent Feed</h2>
              <span className="text-xs text-accent flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" /> Live
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-hidden">
              {feed.length === 0 && <p className="text-xs text-muted">No activity yet — waiting on the first request.</p>}
              {feed.map((e) => (
                <div key={`${e.requestId}-${e.createdAt}`} className="flex items-start justify-between text-xs">
                  <div>
                    <div className="font-medium">{e.source === "guest" ? "Guest Agent" : e.source === "web" ? "Web Request" : "Human Chat"}</div>
                    <div className="text-muted">{e.status === "completed" ? "Report delivered" : "Payment failed"} for {shortAddr(e.walletAnalyzed)}</div>
                  </div>
                  <span className="text-muted whitespace-nowrap">{timeAgo(e.createdAt)}</span>
                </div>
              ))}
            </div>
            <Link href="/conversations" className="text-xs text-accent hover:underline mt-4">
              View Live Conversations →
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Reports Generated" value={stats ? String(stats.reportsGenerated) : "—"} />
          <StatCard label="Active Guest Agents" value={stats ? String(stats.activeAgents) : "—"} sublabel="24/7 automated" />
          <StatCard label="Total Volume" value={stats ? `${stats.totalVolumeBot.toFixed(4)} BOT` : "—"} sublabel="On-chain payments" />
          <StatCard label="Success Rate" value={stats ? `${stats.successRate}%` : "—"} sublabel="All time" />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-8">
          <h2 className="font-semibold mb-1">How it works</h2>
          <p className="text-sm text-muted mb-6">Simple, autonomous, and verifiable.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {HOW_IT_WORKS.map(({ Icon, title, desc }) => (
              <div key={title}>
                <div className="w-10 h-10 rounded-full bg-accent-dim border border-accent/40 text-accent flex items-center justify-center mx-auto mb-3">
                  <Icon size={18} />
                </div>
                <div className="font-medium text-sm mb-1">{title}</div>
                <div className="text-xs text-muted">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Recent Reports</h2>
            <Link href="/my-reports" className="text-xs text-accent hover:underline">
              View all →
            </Link>
          </div>
          {recentReports.length === 0 && <p className="text-xs text-muted">No completed reports yet.</p>}
          <div className="divide-y divide-border">
            {recentReports.map((r) => (
              <div key={r.requestId} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-mono text-xs">{shortAddr(r.walletAnalyzed)}</div>
                  <div className="text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <a href={reportPdfUrl(r.requestId)} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                  View PDF ↗
                </a>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="text-center text-xs text-muted py-6 border-t border-border">
        Built for the BOT Chain Builder Challenge · Agent economy powered by AI · Secured by blockchain.
      </footer>
    </div>
  );
}
