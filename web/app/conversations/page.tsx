"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Paperclip, Download } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { FadeIn } from "@/components/FadeIn";
import { getFeed, reportPdfUrl, type ActivityEntry } from "@/lib/api";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
function shortAddr(addr: string) {
  return addr && addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;
}
function speakerName(e: ActivityEntry) {
  if (e.source === "guest") return "Guest Agent";
  if (e.source === "human-telegram") return "You (Telegram)";
  return "Web Visitor";
}

export default function ConversationsPage() {
  const [feed, setFeed] = useState<ActivityEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    const load = () => getFeed(30).then(setFeed).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return feed;
    const q = search.trim().toLowerCase();
    return feed.filter((e) => e.walletAnalyzed.toLowerCase().includes(q) || speakerName(e).toLowerCase().includes(q));
  }, [feed, search]);

  const keyOf = (e: ActivityEntry) => `${e.requestId}-${e.createdAt}`;
  const selected = filtered.find((e) => keyOf(e) === selectedKey) ?? filtered[0] ?? null;

  return (
    <div>
      <Topbar title="Live Conversations" />
      <main className="p-4 md:p-8 max-w-6xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Live Conversations</h1>
          <p className="text-sm text-muted mt-1">Watch agent conversations in real-time.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-border bg-surface flex flex-col lg:max-h-[560px]">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-surface-2 border border-border rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div className="overflow-y-auto divide-y divide-border lg:flex-1">
              {filtered.length === 0 && <p className="text-xs text-muted p-4">No conversations yet.</p>}
              {filtered.map((e, i) => {
                const key = keyOf(e);
                const active = selected && keyOf(selected) === key;
                return (
                  <FadeIn key={key} delay={Math.min(i, 8) * 40}>
                    <button
                      onClick={() => setSelectedKey(key)}
                      className={`w-full text-left p-3.5 flex items-start gap-2.5 transition ${active ? "bg-accent-dim" : "hover:bg-surface-2"}`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${e.status === "completed" ? "bg-accent animate-pulse" : "bg-red"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium truncate">{speakerName(e)}</span>
                          <span className="text-xs text-muted shrink-0">{timeAgo(e.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted truncate">
                          {e.status === "completed" ? `Report delivered for ${shortAddr(e.walletAnalyzed)}` : `Payment failed for ${shortAddr(e.walletAnalyzed)}`}
                        </p>
                      </div>
                    </button>
                  </FadeIn>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-2xl border border-border bg-surface flex flex-col">
            {!selected ? (
              <p className="text-sm text-muted p-6">Select a conversation to view it.</p>
            ) : (
              <>
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{speakerName(selected)}</div>
                    <div className="text-xs text-muted">{shortAddr(selected.walletAnalyzed)}</div>
                  </div>
                  {selected.status === "completed" && (
                    <span className="text-xs text-accent flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-pulse" /> Live
                    </span>
                  )}
                </div>
                <div key={selected.requestId} className="p-4 space-y-4 flex-1">
                  <FadeIn className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-dim text-blue flex items-center justify-center text-xs shrink-0">G</div>
                    <div className="bg-surface-2 rounded-lg rounded-tl-none px-3 py-2 text-sm max-w-md">
                      Requesting a tax report for wallet {shortAddr(selected.walletAnalyzed)}, paying {Number(selected.feeWei) / 1e18} BOT on-chain.
                    </div>
                  </FadeIn>

                  {selected.status === "completed" ? (
                    <FadeIn delay={120} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent-dim text-accent flex items-center justify-center text-xs shrink-0">B</div>
                      <div className="space-y-2 max-w-md">
                        <div className="bg-accent-dim rounded-lg rounded-tl-none px-3 py-2 text-sm">
                          Payment confirmed. Realized P&L ${selected.realizedPnlUsd?.toFixed(2)}, unrealized $
                          {selected.unrealizedPnlUsd?.toFixed(2)}, {selected.harvestCount ?? 0} harvest candidate(s). Report ready.
                        </div>
                        <a
                          href={reportPdfUrl(selected.requestId)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs hover:border-accent hover:scale-[1.02] transition-all"
                        >
                          <Paperclip size={14} className="text-red shrink-0" />
                          <span className="flex-1 truncate">Tax_Report_{shortAddr(selected.walletAnalyzed)}.pdf</span>
                          <Download size={14} className="text-accent shrink-0" />
                        </a>
                      </div>
                    </FadeIn>
                  ) : (
                    <FadeIn delay={120} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-red-dim text-red flex items-center justify-center text-xs shrink-0">B</div>
                      <div className="bg-red-dim rounded-lg rounded-tl-none px-3 py-2 text-sm max-w-md">
                        I don&apos;t see a matching payment on-chain for that request — verification failed.
                      </div>
                    </FadeIn>
                  )}
                </div>
                <div className="p-3 border-t border-border">
                  <p className="text-xs text-muted text-center">
                    This is a real-time feed, not an interactive chat. Message wording is composed live by each agent&apos;s LLM — see it happen on Telegram.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
