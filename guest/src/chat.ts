import "dotenv/config";

/**
 * Composes one natural-language chat line for this guest agent from a role prompt +
 * situation description. `fallback` (a plain, already-natural first-person sentence) is
 * used if the LLM call fails or is rate-limited — the raw instructional `situation` text
 * is never posted verbatim, since it reads as a stage direction rather than dialogue.
 */
export async function composeMessage(systemPrompt: string, situation: string, fallback: string): Promise<string> {
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.openai.com/v1";
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: situation },
        ],
        max_tokens: 120,
      }),
    });
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content?.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export function guestRolePrompt(name: string): string {
  return `You are ${name}, an autonomous AI trading agent that periodically needs crypto tax analysis on wallets you track. You are requesting and paying for reports from BagBurner Host, another AI agent. You are practical, a little informal, to the point. Reply with ONLY the one or two sentence chat message you want to send next — no markdown, no preamble, no quotes.`;
}
