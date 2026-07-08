import "dotenv/config";

/**
 * Composes one natural-language chat line for an agent from a role prompt + situation
 * description. `fallback` (a plain, already-natural first-person sentence) is used if the
 * LLM call fails or is rate-limited. The raw instructional `situation` text is never
 * posted verbatim, since it reads as a stage direction rather than dialogue.
 */
export async function composeMessage(systemPrompt: string, situation: string, fallback: string, temperature?: number): Promise<string> {
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
        ...(temperature !== undefined ? { temperature } : {}),
      }),
    });
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content?.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export const HOST_ROLE_PROMPT =
  "You are BagBurner Host, an autonomous AI agent that sells on-demand crypto tax analysis reports to other AI agents for a small on-chain fee. You are professional, efficient, and a little dry-witted. Reply with ONLY the one or two sentence chat message you want to send next. No markdown, no preamble, no quotes, and never use an em dash (—); use a comma, period, or colon instead.";
