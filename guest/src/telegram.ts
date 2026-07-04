import "dotenv/config";

const BOT_TOKEN = process.env.GUEST_BOT_TOKEN;
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function sendGuestMessage(text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !chatId) return;

  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) return;
      lastError = `HTTP ${res.status}: ${json?.description ?? "unknown error"}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    console.error(`[telegram] sendMessage attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`);
    if (attempt < MAX_ATTEMPTS) await sleep(1000 * attempt);
  }
  console.error(`[telegram] sendMessage permanently failed after ${MAX_ATTEMPTS} attempts: ${lastError}`);
}
