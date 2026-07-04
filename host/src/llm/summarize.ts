import "dotenv/config";
import OpenAI from "openai";
import type { OpenPosition } from "../types.js";

interface SummaryInput {
  walletAnalyzed: string;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  harvestOpportunities: OpenPosition[];
}

function buildPrompt(input: SummaryInput): string {
  const top = input.harvestOpportunities.slice(0, 3).map(
    (p) => `${p.tokenSymbol}: ${p.unrealizedUsd.toFixed(2)} USD unrealized (${p.verdict})`
  );
  return [
    `Wallet ${input.walletAnalyzed} crypto tax position:`,
    `Realized P&L this year: $${input.realizedPnlUsd.toFixed(2)}`,
    `Unrealized P&L on open positions: $${input.unrealizedPnlUsd.toFixed(2)}`,
    `Top harvest candidates: ${top.length ? top.join("; ") : "none"}`,
    ``,
    `Write a 3-4 sentence plain-English summary of this wallet's tax situation and the single most important action to take. This is a mathematical analysis, not tax advice.`,
  ].join("\n");
}

async function callOpenAI(prompt: string): Promise<string> {
  const client = new OpenAI({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL, // e.g. OpenRouter's OpenAI-compatible endpoint; unset = official OpenAI API
  });
  const completion = await client.chat.completions.create({
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

async function callAnthropic(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.LLM_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const json = await res.json();
  return json.content?.[0]?.text?.trim() ?? "";
}

export async function summarize(input: SummaryInput): Promise<string> {
  const prompt = buildPrompt(input);
  const provider = process.env.LLM_PROVIDER ?? "openai";
  try {
    return provider === "anthropic" ? await callAnthropic(prompt) : await callOpenAI(prompt);
  } catch (err) {
    console.error("LLM summary failed, falling back to a plain rendering:", err);
    return `Realized P&L: $${input.realizedPnlUsd.toFixed(2)}. Unrealized P&L: $${input.unrealizedPnlUsd.toFixed(2)}. ${input.harvestOpportunities.length} harvest candidate(s) found.`;
  }
}
