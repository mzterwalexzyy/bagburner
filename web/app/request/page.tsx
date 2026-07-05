"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Topbar } from "@/components/Topbar";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { CONTRACT_ADDRESS, REPORT_PAYMENTS_ABI } from "@/lib/contract";
import { submitPaidRequest, type RequestReportResult } from "@/lib/api";

type Stage = "idle" | "paying" | "confirming" | "analyzing" | "done" | "error";

export default function RequestReportPage() {
  const { isConnected } = useAccount();
  const [wallet, setWallet] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RequestReportResult | null>(null);

  const { data: fee } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: REPORT_PAYMENTS_ABI,
    functionName: "reportFee",
  });

  const { writeContract, data: txHash, isPending: isPaying, error: writeError } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

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
    submitPaidRequest(wallet, txHash)
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

  return (
    <div>
      <Topbar title="Request Report" />
      <main className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-8">
          <h1 className="text-xl font-semibold mb-1">Request a Tax Report</h1>
          <p className="text-sm text-muted mb-6">
            Connect your wallet, pay the on-chain fee, and get a real crypto tax analysis PDF back — no Telegram needed.
          </p>

          {!isConnected ? (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted">Connect a wallet on BOT Chain testnet to get started.</p>
              <ConnectWalletButton />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1.5">Wallet address to analyze</label>
                <input
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value.trim())}
                  placeholder="0x..."
                  disabled={busy}
                  className="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent disabled:opacity-50"
                />
                {wallet.length > 0 && !isValidWallet && (
                  <p className="text-xs text-red mt-1">Enter a valid Ethereum address.</p>
                )}
              </div>

              <div className="flex items-center justify-between text-sm bg-surface-2 border border-border rounded-md px-3 py-2">
                <span className="text-muted">Fee</span>
                <span>{feeBot !== null ? `${feeBot} BOT` : "loading..."}</span>
              </div>

              <button
                onClick={handlePay}
                disabled={!isValidWallet || busy || !fee}
                className="w-full py-2.5 rounded-md bg-accent text-black font-medium text-sm hover:opacity-90 transition disabled:opacity-40"
              >
                {stage === "paying" && "Confirm payment in your wallet..."}
                {stage === "confirming" && "Waiting for on-chain confirmation..."}
                {stage === "analyzing" && "Host is analyzing the wallet..."}
                {(stage === "idle" || stage === "done" || stage === "error") && "Pay & Analyze"}
              </button>

              {error && <p className="text-sm text-red">{error}</p>}

              {result && (
                <div className="rounded-md border border-accent/40 bg-accent-dim p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Realized P&L</span>
                    <span>${result.realizedPnlUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Unrealized P&L</span>
                    <span>${result.unrealizedPnlUsd.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted pt-1">{result.llmSummary}</p>
                  <a
                    href={result.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-sm text-accent hover:underline pt-1"
                  >
                    Download PDF report ↗
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
