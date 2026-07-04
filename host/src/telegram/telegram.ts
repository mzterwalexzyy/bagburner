import "dotenv/config";

const BOT_TOKEN = process.env.HOST_BOT_TOKEN;
const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callTelegramApi(method: string, body: BodyInit, headers: Record<string, string>): Promise<void> {
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, { method: "POST", headers, body });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) return;
      lastError = `HTTP ${res.status}: ${json?.description ?? "unknown error"}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    console.error(`[telegram] ${method} attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`);
    if (attempt < MAX_ATTEMPTS) await sleep(1000 * attempt);
  }
  console.error(`[telegram] ${method} permanently failed after ${MAX_ATTEMPTS} attempts: ${lastError}`);
}

export async function sendHostMessage(chatId: string, text: string): Promise<void> {
  if (!BOT_TOKEN || !chatId) return;
  await callTelegramApi("sendMessage", JSON.stringify({ chat_id: chatId, text }), { "content-type": "application/json" });
}

export async function sendHostDocument(chatId: string, buffer: Buffer, filename: string, caption: string): Promise<void> {
  if (!BOT_TOKEN || !chatId) return;
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("document", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), filename);
  await callTelegramApi("sendDocument", form, {});
}
