import { config as loadDotEnv } from "dotenv";

loadDotEnv({ path: ".env", quiet: true });
loadDotEnv({ path: ".env.local", quiet: true });

function present(name: string): boolean {
  return String(process.env[name] ?? "").trim().length > 0;
}

function getRedirectUri(): string {
  return String(
    process.env.VITE_UPSTOX_REDIRECT_URI ??
    process.env.UPSTOX_REDIRECT_URI ??
    "http://localhost:5173/auth/upstox/callback"
  ).trim();
}

function main(): void {
  const summary = {
    hasClientId: present("VITE_UPSTOX_CLIENT_ID"),
    hasClientSecret: present("UPSTOX_CLIENT_SECRET"),
    hasRedirectUri: Boolean(getRedirectUri()),
    hasAccessToken: present("UPSTOX_ACCESS_TOKEN"),
    sandboxEnabled:
      String(process.env.UPSTOX_SANDBOX_ENABLED ?? "").toLowerCase() === "true" ||
      String(process.env.UPSTOX_SANDBOX_MODE ?? "").toLowerCase() === "true",
    hasSandboxAccessToken: present("UPSTOX_SANDBOX_ACCESS_TOKEN"),
  };

  console.log("Upstox Configuration Summary");
  console.log("──────────────────────────────────────");
  console.log(`  hasClientId: ${summary.hasClientId}`);
  console.log(`  hasClientSecret: ${summary.hasClientSecret}`);
  console.log(`  hasRedirectUri: ${summary.hasRedirectUri}`);
  console.log(`  redirectUri: ${getRedirectUri()}`);
  console.log(`  hasAccessToken: ${summary.hasAccessToken}`);
  console.log(`  sandboxEnabled: ${summary.sandboxEnabled}`);
  console.log(`  hasSandboxAccessToken: ${summary.hasSandboxAccessToken}`);
  console.log("");

  if (!summary.hasClientId || !summary.hasClientSecret) {
    console.log("Missing live OAuth configuration.");
    console.log("Set VITE_UPSTOX_CLIENT_ID, UPSTOX_CLIENT_SECRET, and VITE_UPSTOX_REDIRECT_URI.");
    process.exitCode = 1;
    return;
  }

  if (!summary.hasAccessToken && !summary.sandboxEnabled) {
    console.log("OAuth is configured, but no live token is present yet.");
    console.log("Run: npm run upstox:auth-url");
    return;
  }

  console.log("Upstox configuration is usable.");
}

main();
