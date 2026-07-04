# BagBurner

**A pay-per-call AI agent economy on BOT Chain: a host agent runs crypto tax analysis on demand, autonomous guest agents keep paying it to analyze wallets around the clock, and the whole negotiation happens as a visible Telegram conversation between the agents — plus you can chat with the host directly yourself.**

Built for the BOT Chain Builder Challenge — **AI Agent track**.

## What it is

BagBurner has two kinds of agents, both narrating their side of every interaction in Telegram:

- **Host agent ("BagBurner Host")** — an always-on service that, given a wallet address, pulls its real transaction history, computes a simplified crypto tax position (realized/unrealized gains and losses, tax-loss-harvesting candidates, a rule-based verdict per position), and delivers a designed PDF report with an LLM-written plain-English summary.
- **Guest agents** — independent scripts that autonomously loop: ask the host what a report costs, pay on-chain, hand off a wallet, and repeat — forever, with no human triggering each cycle.

The payment and coordination layer lives on BOT Chain: guests call a small smart contract (`ReportPayments.sol`) to pay for each report, and the host verifies that payment on-chain — decoding the actual event, checking the actual wallet requested — before doing any compute. The tax analysis itself runs off-chain (it needs live Ethereum data), but the economic relationship between the two agents is entirely on-chain and verifiable.

### The conversation layer

Each guest has its own Telegram bot identity, and the host has one. Every guest-host pair gets its own **private group chat** (Telegram bots can't DM each other directly — a small shared group with just that pair is the closest equivalent to a private thread), so you can open "Host ↔ Guest 1" and watch only that pair's negotiation, separately from "Host ↔ Guest 2".

The flow in each chat is real, not scripted text: at every step (requesting a report, reading the fee, paying, handing off, verifying payment, delivering the report) each agent's message is composed live by an LLM from a short role prompt — so the wording varies and reads naturally — while the underlying actions (checking the on-chain fee, sending the payment, verifying it, running the analysis) stay fully deterministic. That split matters: the conversation can't wander off and fail to complete a transaction, because the LLM only chooses *what to say*, never *whether the on-chain step happens*.

**You can also talk to the host directly.** The host bot polls for private DMs alongside its automated guest conversations, so you can message it yourself — ask what it does, send it a wallet address, and it'll quote its fee and ask you to pay `payForReport(wallet)` on the contract and send back the tx hash. If you claim to have paid without a matching on-chain payment, it genuinely checks and refuses — it isn't scripted to say yes.

## On-chain proof

- **Contract:** `ReportPayments.sol` deployed on BOT Chain testnet at [`0x302f3C42537D9A215de29018C82d9287ccE55c42`](https://scan.bohr.life/address/0x302f3C42537D9A215de29018C82d9287ccE55c42)
- **Example request tx:** [`0xde815fa1b5b071d20890e21b7f2fe661ac992f99c539b3e9b21ef4b0a83ab6ca`](https://scan.bohr.life/tx/0xde815fa1b5b071d20890e21b7f2fe661ac992f99c539b3e9b21ef4b0a83ab6ca) — a guest agent paying for and receiving a report showing a wallet with ~$20k in realized crypto tax losses and 9 tax-loss-harvest candidates.

## Architecture

```
contracts/   Foundry project — ReportPayments.sol (payment + request log)
host/        Node/TS Express service — "BagBurner Host"
  chain/       BOT Chain client + on-chain payment verification
  data/        Etherscan (tx history) + CoinGecko (pricing) integrations
  engine/      P&L computation, harvest ranking, rule-based verdicts, shared report builder
  llm/         LLM chat-message composition + the report's plain-English summary
  report/      Designed PDF generation (branded header, stat cards, color-coded tables)
  telegram/    Host bot: per-pair message/PDF delivery + a poller for direct human DMs
guest/       Node/TS client — autonomous ask→pay→handoff loop, own bot + role prompt per guest
data/        Pre-fetched pool of real, verified-active wallet addresses
scripts/     One-time script that builds the wallet pool from on-chain data
```

Host and guest run as separate processes — deliberately, so the demo is independent parties transacting over a real payment rail, not one script calling a local function.

### One guest cycle

1. Guest announces (LLM-composed) that it needs a report for a wallet, then reads the host's current fee straight from the contract.
2. Guest announces it accepts the fee, then calls `payForReport(walletAnalyzed)` on-chain and waits for the receipt.
3. Guest announces it paid, and POSTs the tx hash + its own Telegram chat ID to the host.
4. Host decodes the on-chain event and confirms it actually matches this guest and this wallet — rejecting any request that isn't backed by a real, matching payment — then announces it's starting.
5. Host fetches the wallet's real transaction history (Etherscan), computes realized/unrealized P&L (average-cost-basis), ranks harvest candidates, and assigns a rule-based verdict per position.
6. Host generates the designed PDF and delivers it into that pair's chat with a composed summary message.
7. Guest logs the result locally and repeats with a new wallet after a ~5 minute pause (kept long deliberately so multiple guests don't overwhelm the free-tier LLM API powering the chat messages).

The same underlying pipeline (steps 4–6) is reused verbatim when you message the host bot directly instead of going through a guest.

## Wallet pool

Rather than calling a live wallet-discovery API during the demo (a point of failure on demo day), `scripts/fetch-wallet-pool.ts` builds `data/wallet-pool.json` once ahead of time: it pulls real recent callers of well-known Uniswap router contracts. Every address in the pool is a real, currently-active Ethereum wallet.

## MVP scope

**Built and working:**
- On-chain payment + request-log contract, deployed and verified on BOT Chain testnet
- Real Ethereum tax analysis: realized/unrealized P&L, harvest-opportunity ranking, rule-based verdicts (Cut / Watch / Hold / Take-Profit)
- On-chain payment verification gate (the host actually checks the payment, not just a client-supplied hash) — used both for the automated guest flow and for direct human requests
- Autonomous multi-guest loop, tested live with 2 concurrent agents, each with its own Telegram identity and private pairing chat with the host
- LLM-composed natural-language dialogue for every step, with a plain-English fallback if the LLM call fails or is rate-limited, so the flow always completes even if the wording degrades
- A designed PDF report (branded header, color-coded P&L cards, real tables with verdict colors) delivered as a Telegram file attachment
- Direct human↔host chat alongside the automated flow, sharing the same real verification/analysis pipeline

**Roadmap (not built — deliberately out of scope for this MVP):**
- Solana support (architecture is chain-agnostic; only the Ethereum data adapter is implemented)
- Wash-sale tracking and repurchase-window calendar
- NFT position analysis
- LP deposit/withdrawal and cross-chain bridge disposal-event detection
- Multi-jurisdiction tax-bracket-aware recommendations
- Dev-wallet-activity and social-signal inputs to the verdict engine (currently: unrealized-P&L size + a CoinGecko-listing liquidity proxy only)

## Known limitations (by design, for this MVP)

- Cost basis is derived from ETH/WETH legs on the same transaction hash as a token transfer — token-to-token swaps with no ETH leg on that hash won't get a cost basis. This covers the common case (ETH-denominated DEX swaps) but isn't general-purpose cost-basis tracking.
- Historical ETH/USD pricing uses CoinGecko's free tier, which only covers the last 365 days; trades older than that fall back to the current ETH price as an approximation rather than the true historical price.
- P&L uses average-cost-basis, not FIFO/LIFO — simpler to implement, a documented tradeoff rather than a bug.
- A token with no CoinGecko listing is treated as illiquid/dead ("Cut") — a reasonable proxy, not a real liquidity/volume check.
- The negotiation dialogue's wording is LLM-generated, but the *decision* to proceed is deterministic and rule-based (never left to the LLM) — a conscious reliability choice, not a limitation of the idea.

## Running it

Each of `contracts/`, `host/`, and `guest/` has its own `.env.example`. Fill in a `.env` in each (BOT Chain RPC/chain ID, contract address, Etherscan key, an LLM key, and Telegram bot tokens/chat IDs if you want the conversation layer).

```bash
# 1. Deploy the contract (once)
cd contracts && forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $DEPLOYER_PRIVATE_KEY --broadcast

# 2. Build the wallet pool (once)
npx tsx scripts/fetch-wallet-pool.ts

# 3. Start the host
cd host && npm install && npm run dev

# 4. Start one or more guests, each with its own funded wallet, GUEST_ID, and bot token
cd guest && npm install
GUEST_ID=0 GUEST_PRIVATE_KEY=0x... GUEST_BOT_TOKEN=... TELEGRAM_CHAT_ID=... npm start
GUEST_ID=1 GUEST_PRIVATE_KEY=0x... GUEST_BOT_TOKEN=... TELEGRAM_CHAT_ID=... npm start
```

Telegram setup: create one bot per agent via @BotFather, one private group per guest↔host pair containing that guest's bot + the host bot + you, and set `HOST_BOT_TOKEN` (host) / `GUEST_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (each guest) accordingly.

## Demo

- Demo video: _link here_
- X showcase: _link here_ (tags @BOTChain_ai)
