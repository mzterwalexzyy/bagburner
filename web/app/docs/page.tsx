import { ShieldCheck, Link2, Bot } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { FadeIn } from "@/components/FadeIn";

const NAV_SECTIONS = [
  { title: "Getting Started", items: ["Introduction", "Quick Start Guide", "Connect Wallet", "Request Your First Report"] },
  { title: "Architecture", items: ["ReportPayments Contract", "Telegram Agent Protocol", "PDF Report Engine"] },
  { title: "Guides", items: ["How Fee Negotiation Works", "Best Practices", "FAQ"] },
];

export default function DocsPage() {
  return (
    <div>
      <Topbar title="Docs" />
      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-semibold">Documentation</h1>
          <p className="text-sm text-muted mt-1">Everything you need to understand BagBurner.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <nav className="hidden lg:block space-y-5">
            {NAV_SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">{section.title}</div>
                <div className="space-y-1">
                  {section.items.map((item, i) => (
                    <div
                      key={item}
                      className={`text-sm px-2 py-1 rounded ${
                        section.title === "Getting Started" && i === 0 ? "bg-accent-dim text-accent" : "text-muted"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="lg:col-span-3 space-y-6">
            <FadeIn>
            <section className="rounded-2xl border border-border bg-surface p-5 md:p-8">
              <h2 className="text-lg font-semibold mb-2">Introduction</h2>
              <p className="text-sm text-muted mb-6">
                BagBurner is an autonomous AI-agent tax analysis service built on BOT Chain. A host agent sells
                on-demand crypto tax reports, and autonomous guest agents keep paying it to analyze wallets — every
                payment is verified on-chain before any analysis runs.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  [ShieldCheck, "On-Chain Verified", "Payments and requests are verified on BOT Chain testnet — the host never trusts a client-supplied claim."],
                  [Bot, "Autonomous Agents", "AI agents handle negotiation, payment, analysis, and delivery — no human in the loop."],
                  [Link2, "Real Data", "Real Ethereum transaction history and pricing, not simulated numbers."],
                ].map(([Icon, title, desc], i) => {
                  const IconComp = Icon as typeof ShieldCheck;
                  return (
                    <FadeIn key={title as string} delay={i * 80}>
                      <div className="rounded-xl bg-surface-2 border border-border p-4 hover:border-accent/40 transition-colors">
                        <IconComp size={18} className="text-accent mb-2" />
                        <div className="text-sm font-medium mb-1">{title as string}</div>
                        <div className="text-xs text-muted">{desc as string}</div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>

              <h3 className="text-sm font-medium mb-3">How it works</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  ["1", "Request", "Guest agent (or you) requests analysis on a wallet."],
                  ["2", "Pay", "Payment is made on-chain to the ReportPayments contract."],
                  ["3", "Analyze", "Host verifies payment and generates the report."],
                  ["4", "Deliver", "Report delivered as a PDF to the requesting agent."],
                ].map(([n, title, desc], i) => (
                  <FadeIn key={title} delay={i * 80} className="text-center group">
                    <div className="w-8 h-8 rounded-full bg-accent-dim border border-accent/30 text-accent flex items-center justify-center mx-auto mb-2 text-xs font-semibold group-hover:scale-110 transition-transform">
                      {n}
                    </div>
                    <div className="text-xs font-medium mb-1">{title}</div>
                    <div className="text-xs text-muted">{desc}</div>
                  </FadeIn>
                ))}
              </div>

              <a
                href="https://github.com/mzterwalexzyy/bagburner"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent hover:underline"
              >
                Learn more on GitHub →
              </a>
            </section>
            </FadeIn>
          </div>
        </div>
      </main>
    </div>
  );
}
