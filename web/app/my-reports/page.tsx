"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Search, FileText, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { FadeIn } from "@/components/FadeIn";
import { getMyReports, reportPdfUrl, type ActivityEntry } from "@/lib/api";

type Filter = "all" | "completed" | "processing" | "failed";
const PAGE_SIZE = 8;

function shortAddr(addr: string) {
  return addr && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}
function shortHash(hash: string) {
  return hash && hash.length > 10 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;
}

export default function MyReportsPage() {
  const { address, isConnected } = useAccount();
  const [reports, setReports] = useState<ActivityEntry[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    getMyReports(showAll ? undefined : address).then(setReports).catch(() => setReports([]));
  }, [address, showAll]);

  const counts = useMemo(
    () => ({
      all: reports.length,
      completed: reports.filter((r) => r.status === "completed").length,
      processing: 0,
      failed: reports.filter((r) => r.status === "failed").length,
    }),
    [reports]
  );

  const filtered = useMemo(() => {
    let list = reports;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.walletAnalyzed.toLowerCase().includes(q) || r.txHash.toLowerCase().includes(q));
    }
    return list;
  }, [reports, filter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => setPage(0), [filter, search, showAll]);

  return (
    <div>
      <Topbar title="My Reports" />
      <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">My Reports</h1>
            <p className="text-sm text-muted mt-1">View and download your tax analysis reports.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setShowAll((v) => !v)} className="text-xs text-accent hover:underline whitespace-nowrap">
              {showAll ? "Show only mine" : "Show all reports"}
            </button>
            {!isConnected && <ConnectWalletButton />}
          </div>
        </div>

        <div className="flex gap-1 border-b border-border overflow-x-auto">
          {(["all", "completed", "processing", "failed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-sm capitalize whitespace-nowrap border-b-2 -mb-px transition ${
                filter === f ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by wallet or tx hash..."
              className="w-full bg-surface-2 border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <FadeIn className="rounded-2xl border border-border bg-surface overflow-hidden block">
          {pageItems.length === 0 ? (
            <p className="text-sm text-muted p-6">
              {isConnected || showAll ? "No reports match." : "Connect a wallet to see your reports, or view all reports above."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border">
                    <th className="p-4 font-normal">Report</th>
                    <th className="p-4 font-normal">Wallet</th>
                    <th className="p-4 font-normal">Summary</th>
                    <th className="p-4 font-normal">Status</th>
                    <th className="p-4 font-normal">Date</th>
                    <th className="p-4 font-normal"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pageItems.map((r) => (
                    <tr key={r.requestId} className="hover:bg-surface-2 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-red shrink-0" />
                          <span className="font-mono text-xs">{shortHash(r.txHash)}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">{shortAddr(r.walletAnalyzed)}</td>
                      <td className="p-4 text-xs">
                        {r.status === "completed" ? (
                          <>
                            <div>Realized P&L: ${r.realizedPnlUsd?.toFixed(2)}</div>
                            <div className="text-muted">Unrealized P&L: ${r.unrealizedPnlUsd?.toFixed(2)}</div>
                            {r.potentialTaxOwedUsd !== undefined && (
                              <div className="text-muted">Est. Tax ({r.taxRatePercent}%): ${r.potentialTaxOwedUsd.toFixed(2)}</div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            r.status === "completed" ? "bg-accent-dim text-accent" : "bg-red-dim text-red"
                          }`}
                        >
                          {r.status === "completed" ? "Completed" : "Failed"}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-muted whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                      <td className="p-4">
                        {r.status === "completed" && (
                          <a href={reportPdfUrl(r.requestId)} target="_blank" rel="noreferrer" className="text-accent" aria-label="Download PDF">
                            <Download size={16} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FadeIn>

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md border border-border disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-7 h-7 rounded-md text-xs ${page === i ? "bg-accent text-accent-fg" : "border border-border text-muted"}`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              className="p-1.5 rounded-md border border-border disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
