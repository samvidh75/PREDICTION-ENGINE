import { config as loadDotEnv } from "dotenv";

loadDotEnv({ path: ".env", quiet: true });
loadDotEnv({ path: ".env.local", quiet: true });

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function bool(name: string): boolean {
  return env(name).toLowerCase() === "true";
}

function getRedirectUri(): string {
  return env("VITE_UPSTOX_REDIRECT_URI") || env("UPSTOX_REDIRECT_URI") || "http://localhost:5173/auth/upstox/callback";
}

function decodeJwtExpiry(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null;
  } catch {
    return null;
  }
}

function main(): void {
  const clientId = env("VITE_UPSTOX_CLIENT_ID");
  const clientSecret = env("UPSTOX_CLIENT_SECRET");
  const redirectUri = getRedirectUri();
  const accessToken = env("UPSTOX_ACCESS_TOKEN");
  const sandboxEnabled = bool("UPSTOX_SANDBOX_ENABLED") || bool("UPSTOX_SANDBOX_MODE");
  const sandboxAccessToken = env("UPSTOX_SANDBOX_ACCESS_TOKEN");

  console.log("Upstox Status");
  console.log("──────────────────────────────────────");
  console.log(`Client ID Present: ${Boolean(clientId)}`);
  console.log(`Client Secret Present: ${Boolean(clientSecret)}`);
  console.log(`Redirect URI Present: ${Boolean(redirectUri)}`);
  console.log(`Redirect URI: ${redirectUri}`);
  console.log(`Access Token Present: ${Boolean(accessToken)}`);
  console.log(`Access Token Expiry: ${decodeJwtExpiry(accessToken) ?? "unknown / not a JWT"}`);
  console.log(`Sandbox Enabled: ${sandboxEnabled}`);
  console.log(`Sandbox Token Present: ${Boolean(sandboxAccessToken)}`);
  console.log(`OAuth Ready: ${Boolean(clientId && clientSecret && redirectUri)}`);
  console.log(`Market Data Ready: ${Boolean(accessToken || sandboxEnabled)}`);

  if (!clientId || !clientSecret) {
    console.log("");
    console.log("Next step: configure VITE_UPSTOX_CLIENT_ID, UPSTOX_CLIENT_SECRET, and VITE_UPSTOX_REDIRECT_URI.");
  } else if (!accessToken && !sandboxEnabled) {
    console.log("");
    console.log("Next step: run `npm run upstox:auth-url` to generate the live OAuth URL.");
  }
}

main();
