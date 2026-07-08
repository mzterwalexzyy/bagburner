# BagBurner — Demo Video Script

Target length: ~2.5–3 minutes. Voiceover lines are what you say; scene directions in *italics* tell you what to show on screen at that moment.

---

## 1. The Problem (0:00–0:40)

*Screen: a messy view of a crypto wallet on Etherscan — hundreds of token transfers, or a spreadsheet full of transactions.*

> "If you've ever traded crypto, you know this feeling: tax season, and you're staring at hundreds — sometimes thousands — of on-chain transactions, trying to figure out what you actually gained, what you lost, and what you're going to owe.

> Every trade is a taxable event. Realized gains, unrealized positions, positions you should probably cut for a loss before the year ends — none of it lives in one place, and doing it by hand is a nightmare.

> And the tools that exist? They're either expensive subscriptions, or they need you to trust a black box with your wallet — no way to verify what they're actually doing, or that you even paid for a real analysis."

*Screen: quick cut to a frustrated cursor scrolling through a huge transaction list, then fade to black.*

---

## 2. The Solution (0:40–1:45)

*Screen: BagBurner homepage, hero section.*

> "This is BagBurner — an AI agent that sells on-demand crypto tax analysis, and it doesn't work like a normal SaaS tool. It works like an economy.

> There's a host agent — BagBurner Host — that's always on. Give it a wallet address, pay a small on-chain fee, and it pulls the wallet's real transaction history, computes realized and unrealized P&L, ranks tax-loss-harvesting opportunities, and hands back a designed PDF report with a plain-English summary."

*Screen: Request Report page — fill in a wallet, connect wallet, pay, watch the report come back.*

> "But the interesting part isn't the report — it's who's asking for it. Alongside human users, there are autonomous guest agents: independent scripts that never sleep. Each one picks a real, active wallet, pays the host on-chain, and requests a report — over, and over, forever, with zero human in the loop."

*Screen: Live Conversations page — show a guest↔host exchange, or a Telegram chat between two bots.*

> "And you can actually watch them talk. Every step — asking for a quote, paying, handing off, delivering the report — is narrated live by an LLM into a Telegram conversation. The wording is different every time, because an AI is actually composing it in the moment. But the actions underneath — the payment, the verification, the analysis — are completely deterministic. The AI never decides *whether* a transaction happens. It only decides *what to say* about it."

*Screen: Agent Marketplace page, showing host + guest agents online.*

> "You can talk to the host directly too — on the website, or straight from Telegram. Ask it what it does, hand it a wallet, pay the fee, and it'll check that payment on-chain before it does anything. Claim you paid when you didn't, and it just... won't run the report. It's not scripted to be polite about it."

---

## 3. Why BOT Chain (1:45–2:30)

*Screen: BOT Chain block explorer, showing the ReportPayments contract and a stream of ReportRequested events.*

> "None of this works without a real settlement layer underneath it — and that's where BOT Chain comes in.

> Every single request in BagBurner — whether it's a guest agent, a human on the website, or someone chatting with the host on Telegram — goes through one small smart contract on BOT Chain: `payForReport`. It takes the wallet being analyzed, takes the fee, and emits an event. And before the host does a single second of analysis, it decodes that event off-chain and confirms the payment actually happened, for the actual wallet requested, from the actual payer. No client-supplied hash gets trusted blindly.

> That only works economically because BOT Chain is fast and cheap enough that an agent can pay for *every single report*, every few minutes, without the fee itself becoming the expensive part. Sub-second blocks and near-zero gas mean the payment layer disappears into the background — it's not a friction point, it's just how the agents transact.

> That's really the core idea of an agent economy: two independent AI agents, a host and a guest, doing real business with each other, where the trust isn't 'trust me' — it's 'check the chain.' BOT Chain is what makes that check fast enough, and cheap enough, to happen constantly, in the background, without either agent — or the human watching — ever noticing the friction."

*Screen: explorer view scrolling through multiple real ReportRequested events accumulating live.*

---

## 4. Close (2:30–2:50)

*Screen: BagBurner homepage, stats ticking up (Reports Generated, Active Guest Agents, Total Volume).*

> "BagBurner: a host agent that sells real tax analysis, guest agents that keep it in business, and a settlement layer on BOT Chain that makes the whole economy verifiable — end to end, on-chain.

> Built for the BOT Chain Builder Challenge. Thanks for watching."

*Screen: end card — project name, GitHub link, contract address.*

---

## Shot list / things to have open before recording

1. BagBurner homepage (light or dark — pick one and stay consistent)
2. Request Report page — a wallet ready to paste in, wallet connected
3. Live Conversations page with at least one real completed exchange
4. Agent Marketplace page showing host + guest(s) online
5. Telegram, with a guest↔host private group scrolled to a recent exchange
6. BOT Chain explorer (scan.bohr.life) on the ReportPayments contract address, showing recent `ReportRequested` events
7. (Optional) A terminal split-screen showing host + guest logs live, for the "autonomous, forever" moment
