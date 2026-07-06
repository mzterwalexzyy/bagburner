/**
 * Runs cloudflared's free quick tunnel, and whenever it (re)starts with a new
 * random *.trycloudflare.com URL, automatically updates the Vercel project's
 * NEXT_PUBLIC_HOST_URL env var and triggers a redeploy so the live dashboard
 * always points at the current tunnel — no manual intervention needed.
 *
 * Expects:
 *   ~/.bagburner-secrets/vercel-token   — a Vercel Personal Access Token
 *   ~/bagburner/web/.vercel/project.json — links this to the Vercel project
 *
 * Run under pm2 in place of a bare `cloudflared tunnel` process.
 */
import { spawn, execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

const SECRETS_DIR = resolve(homedir(), ".bagburner-secrets");
const STATE_FILE = resolve(SECRETS_DIR, "tunnel-url.txt");
const TOKEN_FILE = resolve(SECRETS_DIR, "vercel-token");
const WEB_DIR = resolve(homedir(), "bagburner/web");
const PRODUCTION_ALIAS = "bagburner.vercel.app";

const TOKEN = readFileSync(TOKEN_FILE, "utf8").trim();

function getLastUrl() {
  return existsSync(STATE_FILE) ? readFileSync(STATE_FILE, "utf8").trim() : null;
}

function updateVercel(url) {
  console.log(`[watcher] tunnel URL changed to ${url} — updating Vercel...`);
  // --value/--force/--yes make this fully non-interactive (no stdin-piping needed,
  // which previously left a "store as sensitive?" prompt unanswered and silently
  // dropped the variable).
  execSync(
    `vercel env add NEXT_PUBLIC_HOST_URL production --value "${url}" --force --yes --token=${TOKEN}`,
    { cwd: WEB_DIR, stdio: "inherit" }
  );
  execSync(`vercel redeploy ${PRODUCTION_ALIAS} --token=${TOKEN} --non-interactive`, { cwd: WEB_DIR, stdio: "inherit" });
  writeFileSync(STATE_FILE, url);
  console.log("[watcher] Vercel redeployed with the new tunnel URL");
}

function startTunnel() {
  const child = spawn("cloudflared", ["tunnel", "--url", "http://localhost:4000"]);
  let handled = false;

  const onData = (data) => {
    const text = data.toString();
    process.stdout.write(text);
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match && !handled) {
      handled = true;
      const url = match[0];
      if (url !== getLastUrl()) {
        try {
          updateVercel(url);
        } catch (err) {
          console.error("[watcher] failed to update Vercel:", err instanceof Error ? err.message : err);
        }
      } else {
        console.log(`[watcher] tunnel URL unchanged (${url}), no update needed`);
      }
    }
  };

  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  child.on("exit", (code) => {
    console.log(`[watcher] cloudflared exited (code ${code}), restarting in 3s...`);
    setTimeout(startTunnel, 3000);
  });
}

startTunnel();
