"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { getFeed, type ActivityEntry } from "@/lib/api";

function speakerFor(e: ActivityEntry) {
  if (e.source === "guest") return { name: "Guest Agent", side: "left" as const };
  if (e.source === "human-telegram") return { name: "You (Telegram)", side: "left" as const };
  return { name: "Web Visitor", side: "left" as const };
}

export default function ConversationsPage() {
  const [feed, setFeed] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    const load = () => getFeed(30).then(setFeed).catch(() => {});
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <Topbar title="Live Conversations" />
      <main className="p-8 max-w-3xl mx-auto space-y-6">
        <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">
          Every guest and the host has its own Telegram identity, and each guest ↔ host pair negotiates in its own
          private chat — the wording is composed live by an LLM each time, so it reads naturally instead of a fixed
          script. This feed shows the same underlying events (the automated flow can't wander off and fail to
          complete a transaction, since payment and delivery are always deterministic). Open the actual chats on
          Telegram to see the live wording.
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
          {feed.length === 0 && <p className="text-sm text-muted">No conversations yet.</p>}
          {feed.map((e) => {
            const speaker = speakerFor(e);
            return (
              <div key={`${e.requestId}-${e.createdAt}`} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-dim border border-accent/40 flex items-center justify-center text-xs text-accent shrink-0">
                  {speaker.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{speaker.name}</span>
                    <span className="text-xs text-muted">{new Date(e.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    {e.status === "completed"
                      ? `Paid ${Number(e.feeWei) / 1e18} BOT and received a report for ${e.walletAnalyzed} — realized P&L $${e.realizedPnlUsd?.toFixed(2)}.`
                      : `Attempted to pay for a report on ${e.walletAnalyzed}, but payment verification failed.`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
