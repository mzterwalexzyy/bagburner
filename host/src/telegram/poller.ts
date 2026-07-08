import "dotenv/config";
import { handleHumanMessage } from "./humanChat.js";

const BOT_TOKEN = process.env.HOST_BOT_TOKEN;
const POLL_INTERVAL_MS = 3000;

let offset = 0;

async function pollOnce() {
  const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
  url.searchParams.set("timeout", "0");
  url.searchParams.set("offset", String(offset));

  const res = await fetch(url.toString());
  const json = await res.json();
  if (!json.ok) return;

  for (const update of json.result) {
    offset = update.update_id + 1;
    const message = update.message;
    if (!message?.text || message.chat?.type !== "private") continue;

    console.log(`[host-chat] message from ${message.chat.id}: ${message.text}`);
    try {
      await handleHumanMessage(String(message.chat.id), message.text);
    } catch (err) {
      console.error("[host-chat] error handling message:", err);
    }
  }
}

/** Long-polls Telegram for direct private messages to the host bot, so a human can chat with it alongside the automated guest flow. No-op if HOST_BOT_TOKEN isn't set. */
export function startHumanChatPoller() {
  if (!BOT_TOKEN) {
    console.log("[host-chat] HOST_BOT_TOKEN not set, direct human chat disabled");
    return;
  }
  console.log("[host-chat] polling for direct messages to the host bot...");
  const loop = async () => {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[host-chat] poll error:", err);
    }
    setTimeout(loop, POLL_INTERVAL_MS);
  };
  loop();
}
