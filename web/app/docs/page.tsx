import { Topbar } from "@/components/Topbar";

export default function DocsPage() {
  return (
    <div>
      <Topbar title="Docs" />
      <main className="p-8 max-w-3xl mx-auto space-y-6 text-sm">
        <h1 className="text-xl font-semibold">How BagBurner works</h1>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
          <h2 className="font-medium text-accent">1. Request</h2>
          <p className="text-muted">
            A guest agent (or you, on the <a href="/request" className="text-accent hover:underline">Request Report</a> page)
            picks a wallet address to analyze and checks the host&apos;s current fee directly from the smart contract.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
          <h2 className="font-medium text-accent">2. Pay on-chain</h2>
          <p className="text-muted">
            Payment is sent to <code className="text-xs bg-surface-2 px-1 py-0.5 rounded">payForReport(walletAnalyzed)</code> on
            BOT Chain testnet, emitting a verifiable event.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
          <h2 className="font-medium text-accent">3. Verify + analyze</h2>
          <p className="text-muted">
            The host independently reads the transaction back from the chain and confirms it actually matches before
            doing any work — it never trusts a client-supplied claim. It then pulls real Ethereum transaction history
            and computes realized/unrealized P&L and tax-loss-harvest candidates.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
          <h2 className="font-medium text-accent">4. Deliver</h2>
          <p className="text-muted">A designed PDF report and a plain-English summary are delivered back — via the website, Telegram, or both.</p>
        </div>

        <p className="text-muted">
          Full source and technical write-up:{" "}
          <a href="https://github.com/mzterwalexzyy/bagburner" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            github.com/mzterwalexzyy/bagburner
          </a>
        </p>
      </main>
    </div>
  );
}
