"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Topbar } from "@/components/Topbar";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { getMyReports, reportPdfUrl, type ActivityEntry } from "@/lib/api";

export default function MyReportsPage() {
  const { address, isConnected } = useAccount();
  const [reports, setReports] = useState<ActivityEntry[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    getMyReports(showAll ? undefined : address).then(setReports).catch(() => setReports([]));
  }, [address, showAll]);

  return (
    <div>
      <Topbar title="My Reports" />
      <main className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">My Reports</h1>
            <p className="text-sm text-muted">
              {showAll ? "All completed reports across every agent." : "Reports paid for by your connected wallet."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAll((v) => !v)} className="text-xs text-accent hover:underline">
              {showAll ? "Show only mine" : "Show all reports"}
            </button>
            {!isConnected && <ConnectWalletButton />}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
          {reports.length === 0 && (
            <p className="text-sm text-muted p-6">
              {showAll ? "No reports generated yet." : isConnected ? "No reports paid for by this wallet yet." : "Connect a wallet to see your reports, or view all reports above."}
            </p>
          )}
          {reports.map((r) => (
            <div key={r.requestId} className="flex items-center justify-between p-4">
              <div>
                <div className="font-mono text-sm">{r.walletAnalyzed}</div>
                <div className="text-xs text-muted">
                  {new Date(r.createdAt).toLocaleString()} · via {r.source}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm">${r.realizedPnlUsd?.toFixed(2) ?? "—"} realized</div>
                <a href={reportPdfUrl(r.requestId)} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                  Download PDF ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
