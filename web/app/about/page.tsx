"use client";

import { useEffect, useState } from "react";
import { Link2, MessageSquare, FileText, Download } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { FadeIn } from "@/components/FadeIn";
import { TiltCard } from "@/components/TiltCard";
import { CountUp } from "@/components/CountUp";
import { getStats, type Stats } from "@/lib/api";

const BUILT_WITH = [
  { icon: Link2, name: "BOT Chain", desc: "On-Chain Verification" },
  { icon: MessageSquare, name: "Telegram Agents", desc: "Autonomous Negotiation" },
  { icon: FileText, name: "PDF Reports", desc: "Real Tax Analysis" },
];

export default function AboutPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div>
      <Topbar title="About" />
      <main className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">About BagBurner</h1>
          <p className="text-sm text-muted mt-1">Building the future of autonomous tax analysis.</p>
        </div>

        <FadeIn>
        <TiltCard className="rounded-2xl border border-border bg-surface p-5 md:p-8 block">
          <h2 className="text-lg font-semibold mb-3">Our Mission</h2>
          <p className="text-sm text-muted mb-2">
            To make crypto tax analysis accessible and autonomous through AI agents that transact with each other on
            real, verifiable on-chain payments — no shared database, no trusted intermediary, no fake demos.
          </p>
          <p className="text-sm text-muted">
            Built for the BOT Chain Builder Challenge (AI Agent track). A host agent sells on-demand crypto tax
            analysis, and autonomous guest agents keep paying it to analyze wallets — every payment is verified
            on-chain before any analysis runs.
          </p>

          <div className="grid grid-cols-3 gap-4 my-6 text-center">
            <div>
              <div className="text-2xl font-semibold text-accent">{stats ? <><CountUp value={stats.reportsGenerated} />+</> : "…"}</div>
              <div className="text-xs text-muted mt-1">Reports Generated</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-accent">{stats ? <CountUp value={stats.activeAgents} /> : "…"}</div>
              <div className="text-xs text-muted mt-1">Active Agents</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-accent">{stats ? <><CountUp value={stats.successRate} />%</> : "…"}</div>
              <div className="text-xs text-muted mt-1">On-Chain Verified</div>
            </div>
          </div>

          <p className="text-xs text-muted border-t border-border pt-4">
            This is a mathematical analysis tool, not tax advice. Consult a qualified tax professional for your
            jurisdiction — rules vary significantly by country.
          </p>
        </TiltCard>
        </FadeIn>

        <FadeIn delay={100}>
        <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
          <h2 className="font-medium text-sm mb-4">Built With</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {BUILT_WITH.map((b, i) => (
              <FadeIn key={b.name} delay={i * 80}>
                <div className="flex items-center gap-3 rounded-xl bg-surface-2 border border-border p-4 hover:border-accent/40 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-accent-dim border border-accent/30 flex items-center justify-center text-accent shrink-0">
                    <b.icon size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-muted">{b.desc}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
        </FadeIn>

        <FadeIn delay={160}>
        <a
          href="/bagburner-demo-script.pdf"
          download
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 md:p-6 hover:border-accent/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-accent-dim border border-accent/30 flex items-center justify-center text-accent shrink-0">
            <Download size={16} />
          </div>
          <div>
            <div className="text-sm font-medium">Download Demo Video Script (PDF)</div>
            <div className="text-xs text-muted">The script behind our submission demo video — problem, solution, and why BOT Chain.</div>
          </div>
        </a>
        </FadeIn>
      </main>
    </div>
  );
}
