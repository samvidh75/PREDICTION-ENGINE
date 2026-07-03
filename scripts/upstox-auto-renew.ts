import { config as loadDotEnv } from "dotenv";
loadDotEnv({ path: ".env.local", quiet: true });

const UPSTOX_APPS_URL = "https://account.upstox.com/developer/apps#analytics";

function decodeJwt(token: string): { header: any; payload: any } {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Not a JWT");
  return {
    header: JSON.parse(Buffer.from(parts[0], "base64url").toString()),
    payload: JSON.parse(Buffer.from(parts[1], "base64url").toString()),
  };
}

async function main() {
  const token = process.env.UPSTOX_ACCESS_TOKEN;

  if (!token) {
    console.log("UPSTOX_ACCESS_TOKEN not set. Skipping renewal check.");
    console.log("To generate: open " + UPSTOX_APPS_URL);
    process.exit(0);
  }

  const { payload } = decodeJwt(token);
  const expMs = payload.exp * 1000;
  const nowMs = Date.now();
  const daysLeft = (expMs - nowMs) / 86400000;

  console.log(`Token expires: ${new Date(expMs).toISOString().split("T")[0]}`);
  console.log(`Days remaining: ${daysLeft.toFixed(0)}`);

  if (daysLeft > 30) {
    console.log("Token is valid. No renewal needed.");
    process.exit(0);
  }

  if (daysLeft <= 0) {
    console.log("CRITICAL: Token has expired!");
    console.log("Regenerate at: " + UPSTOX_APPS_URL);
    process.exit(1);
  }

  console.log(`Token expires in ${daysLeft.toFixed(0)} days — renewal recommended.`);
  console.log("Open " + UPSTOX_APPS_URL + " to regenerate.");
  console.log("Steps:");
  console.log("  1. Revoke current token");
  console.log("  2. Click 'Generate Token'");
  console.log("  3. Copy the new token");
  console.log("  4. Update UPSTOX_ACCESS_TOKEN in .env.local");
  process.exit(0);
}

main().catch((err) => {
  console.error("Renewal check failed:", err.message);
  process.exit(1);
});
