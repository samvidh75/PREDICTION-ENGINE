import { config as loadDotEnv } from "dotenv";

loadDotEnv({ path: ".env", quiet: true });
loadDotEnv({ path: ".env.local", quiet: true });

const UPSTOX_AUTH_URL = "https://api.upstox.com/v2/login/authorization/dialog";

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function getRedirectUri(): string {
  return env("VITE_UPSTOX_REDIRECT_URI") || env("UPSTOX_REDIRECT_URI") || "http://localhost:5173/auth/upstox/callback";
}

function main(): void {
  const clientId = env("VITE_UPSTOX_CLIENT_ID");
  const redirectUri = getRedirectUri();
  const clientSecret = env("UPSTOX_CLIENT_SECRET");

  if (!clientId) {
    console.log("Error: VITE_UPSTOX_CLIENT_ID is not configured.");
    process.exit(1);
  }
  if (!clientSecret) {
    console.log("Warning: UPSTOX_CLIENT_SECRET is missing. You can still open the auth URL, but token exchange will fail until the secret is configured.");
    console.log("");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state: "manual-cli",
  });

  console.log("Upstox Authorization URL");
  console.log("──────────────────────────────────────");
  console.log(`Redirect URI: ${redirectUri}`);
  console.log("Auth URL:");
  console.log(`${UPSTOX_AUTH_URL}?${params.toString()}`);
  console.log("");
  console.log("Use the in-app broker connect flow for the full token exchange, or paste the code into your backend callback flow.");
}

main();
