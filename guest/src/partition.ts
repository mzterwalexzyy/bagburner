import { readFileSync, existsSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const POOL_PATH = resolve(__dir, "../../data/wallet-pool.json");

function loadPool(): string[] {
  return JSON.parse(readFileSync(POOL_PATH, "utf8"));
}

/** Contiguous slice of the shared wallet pool assigned to this guest (guestId is 0-indexed). */
export function getPartition(guestId: number, guestCount: number): string[] {
  const pool = loadPool();
  const chunkSize = Math.ceil(pool.length / guestCount);
  const start = guestId * chunkSize;
  return pool.slice(start, start + chunkSize);
}

/** Cycles through a guest's partition, wrapping around once exhausted; persists position across restarts. */
export class WalletCycler {
  private wallets: string[];
  private cursor = 0;
  private statePath: string;

  constructor(guestId: number, wallets: string[]) {
    this.wallets = wallets;
    this.statePath = resolve(__dir, `../../data/logs/cursor-${guestId}.json`);
    if (existsSync(this.statePath)) {
      try {
        this.cursor = JSON.parse(readFileSync(this.statePath, "utf8")).cursor ?? 0;
      } catch {
        this.cursor = 0;
      }
    }
  }

  next(): string {
    const wallet = this.wallets[this.cursor % this.wallets.length];
    this.cursor += 1;
    writeFileSync(this.statePath, JSON.stringify({ cursor: this.cursor }));
    return wallet;
  }
}
