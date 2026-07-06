"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CheckCircle2, Wallet as WalletIcon, CreditCard } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { CONTRACT_ADDRESS, REPORT_PAYMENTS_ABI } from "@/lib/contract";
import { submitPaidRequest, getFeed, type RequestReportResult, type ActivityEntry } from "@/lib/api";

type Stage = "idle" | "paying" | "confirming" | "analyzing" | "done" | "error";

const RECEIVE_ITEMS = [
  "Comprehensive tax analysis (PDF)",
  "Realized & unrealized P&L",
  "Harvest opportunities",
  "Position-level recommendations",
  "Optional tax-owed estimate",
  "Plain-English summary",
];

function shortAddr(addr: string) {
  return addr && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}
function shortHash(hash: string) {
  return hash && hash.length > 10 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;
}

export default function RequestReportPage() {
  const { isConnected } = useAccount();
  const [wallet, setWallet] = useState("");
  const [label, setLabel] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RequestReportResult | null>(null);
  const [recent, setRecent] = useState<ActivityEntry[]>([]);

  const { data: fee } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: REPORT_PAYMENTS_ABI,
    functionName: "reportFee",
  });

  const { writeContract, data: txHash, isPending: isPaying, error: writeError } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    const load = () => getFeed(6).then(setRecent).catch(() => {});
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isPaying) setStage("paying");
  }, [isPaying]);

  useEffect(() => {
    if (txHash && !isConfirmed) setStage("confirming");
  }, [txHash, isConfirmed]);

  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
      setStage("error");
    }
  }, [writeError]);

  useEffect(() => {
    if (!isConfirmed || !txHash) return;
    setStage("analyzing");
    const parsedTaxRate = taxRate.trim() ? Number(taxRate) : undefined;
    submitPaidRequest(wallet, txHash, parsedTaxRate)
      .then((res) => {
        setResult(res);
        setStage("done");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        setStage("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, txHash]);

  const feeBot = fee ? Number(fee) / 1e18 : null;
  const isValidWallet = /^0x[a-fA-F0-9]{40}$/.test(wallet);
  const busy = stage === "paying" || stage === "confirming" || stage === "analyzing";

  function handlePay() {
    setError(null);
    setResult(null);
    if (!fee) return;
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: REPORT_PAYMENTS_ABI,
      functionName: "payForReport",
      args: [wallet as `0x${string}`],
      value: fee,
    });
  }

  function payLabel() {
    if (stage === "paying") return "Confirm payment in your wallet...";
    if (stage === "confirming") return "Waiting for on-chain confirmation...";
    if (stage === "analyzing") return "Host is analyzing the wallet...";
    return "Pay & Request Report →";
  }

  return (
    <div>
      <Topbar title="Request Report" />
      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Request a Tax Analysis Report</h1>
          <p className="text-sm text-muted mt-1">Submit a wallet address and pay on-chain to receive a comprehensive tax analysis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-accent-dim text-accent text-xs font-semibold flex items-center justify-center shrink-0">1</span>
                <h2 className="font-medium text-sm">Wallet to analyze</h2>
              </div>
              <label className="text-xs text-muted block mb-1.5">Wallet address</label>
              <input
                value={wallet}
                onChange={(e) => setWallet(e.target.value.trim())}
                placeholder="0x..."
                disabled={busy}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent disabled:opacity-50"
              />
              {wallet.length > 0 && !isValidWallet && <p className="text-xs text-red mt-1">Enter a valid Ethereum address.</p>}
              <label className="text-xs text-muted block mt-4 mb-1.5">Add a label (optional)</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Personal trading wallet"
                disabled={busy}
                className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
              />
              <label className="text-xs text-muted block mt-4 mb-1.5">Tax rate estimate (optional)</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="e.g. 24"
                  disabled={busy}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:border-accent disabled:opacity-50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
              </div>
              <p className="text-xs text-muted mt-1">If set, the report estimates tax owed on realized gains at this rate.</p>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-accent-dim text-accent text-xs font-semibold flex items-center justify-center shrink-0">2</span>
                <h2 className="font-medium text-sm">On-chain payment</h2>
              </div>

              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted">Fee (on-chain)</span>
                <span className="font-medium">{feeBot !== null ? `${feeBot} BOT` : "loading..."}</span>
              </div>
              <p className="text-xs text-muted mb-4">Fee is paid on BOT Chain Testnet.</p>

              {!isConnected ? (
                <ConnectWalletButton />
              ) : (
                <button
                  onClick={handlePay}
                  disabled={!isValidWallet || busy || !fee}
                  className="w-full py-2.5 rounded-md bg-accent text-accent-fg font-medium text-sm hover:opacity-90 transition disabled:opacity-40"
                >
                  {payLabel()}
                </button>
              )}
              <p className="text-xs text-muted mt-2">You will be asked to confirm the transaction in your wallet.</p>

              {error && <p className="text-sm text-red mt-3">{error}</p>}

              {result && (
                <div className="rounded-md border border-accent/40 bg-accent-dim p-4 space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Realized P&L</span>
                    <span>${result.realizedPnlUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Unrealized P&L</span>
                    <span>${result.unrealizedPnlUsd.toFixed(2)}</span>
                  </div>
                  {result.potentialTaxOwedUsd !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Est. Tax Owed ({result.taxRatePercent}%)</span>
                      <span>${result.potentialTaxOwedUsd.toFixed(2)}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted pt-1">{result.llmSummary}</p>
                  {result.quip && <p className="text-xs italic text-accent border-t border-accent/20 mt-1 pt-2">{result.quip}</p>}
                  <a href={result.pdfUrl} target="_blank" rel="noreferrer" className="inline-block text-sm text-accent hover:underline pt-1">
                    Download PDF report ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 flex flex-col">
            <h2 className="font-medium text-sm mb-4">What you&apos;ll receive</h2>
            <ul className="space-y-2.5 flex-1">
              {RECEIVE_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-accent-dim border border-accent/30 p-6 flex items-center justify-center gap-3">
              <WalletIcon size={28} className="text-accent" />
              <CreditCard size={28} className="text-accent" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 md:p-6">
          <h2 className="font-medium text-sm mb-4">Recent requests</h2>
          <div className="overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs text-muted border-b border-border">
                  <th className="pb-2 font-normal">TX Hash</th>
                  <th className="pb-2 font-normal">Wallet</th>
                  <th className="pb-2 font-normal">Status</th>
                  <th className="pb-2 font-normal">Requested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-xs text-muted">
                      No requests yet.
                    </td>
                  </tr>
                )}
                {recent.map((r) => (
                  <tr key={`${r.requestId}-${r.createdAt}`}>
                    <td className="py-2.5 font-mono text-xs">{shortHash(r.txHash)}</td>
                    <td className="py-2.5 font-mono text-xs">{shortAddr(r.walletAnalyzed)}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === "completed" ? "bg-accent-dim text-accent" : "bg-red-dim text-red"}`}>
                        {r.status === "completed" ? "Completed" : "Failed"}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-muted">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
