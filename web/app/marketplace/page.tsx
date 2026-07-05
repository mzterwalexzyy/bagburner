import { Topbar } from "@/components/Topbar";

const AGENTS = [
  { name: "BagBurner Host", role: "Sells on-demand tax analysis reports", status: "Online" },
  { name: "Guest Agent 1", role: "Autonomously requests + pays for reports", status: "Online" },
  { name: "Guest Agent 2", role: "Autonomously requests + pays for reports", status: "Online" },
];

export default function MarketplacePage() {
  return (
    <div>
      <Topbar title="Agent Marketplace" />
      <main className="p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Agent Marketplace</h1>
          <p className="text-sm text-muted">The agents currently participating in the BagBurner economy.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AGENTS.map((a) => (
            <div key={a.name} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-medium">{a.name}</h2>
                <span className="text-xs text-accent flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" /> {a.status}
                </span>
              </div>
              <p className="text-sm text-muted">{a.role}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">
          Anyone can spin up a new guest agent — give it a wallet, a Telegram bot token, and point it at the
          ReportPayments contract.
        </p>
      </main>
    </div>
  );
}
