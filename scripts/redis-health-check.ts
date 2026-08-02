#!/usr/bin/env tsx
import { createClient } from "redis";

async function checkRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  console.log(`REDIS_URL=${url ? "present" : "missing"}`);

  if (!url) {
    console.log("REDIS_STATUS=unreachable");
    console.log("error_class=missing");
    process.exit(0);
  }

  const client = createClient({ url });
  let connected = false;

  const timeout = setTimeout(() => {
    if (!connected) {
      console.log("REDIS_STATUS=unreachable");
      console.log("error_class=timeout");
      client.disconnect().catch(() => {});
    }
  }, 5000);

  try {
    await client.connect();
    connected = true;
    await client.ping();
    console.log("REDIS_STATUS=reachable");
    console.log("error_class=unknown");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    let errorClass = "unknown";
    if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("ENETUNREACH")) {
      errorClass = "network_error";
    } else if (msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("password") || msg.toLowerCase().includes("nopass")) {
      errorClass = "auth_failed";
    } else if (msg.includes("timeout") || msg.includes("timed out")) {
      errorClass = "timeout";
    }
    console.log("REDIS_STATUS=unreachable");
    console.log(`error_class=${errorClass}`);
  } finally {
    clearTimeout(timeout);
    if (connected) {
      await client.disconnect().catch(() => {});
    }
  }
}

checkRedis().catch(() => {
  console.log("REDIS_STATUS=unreachable");
  console.log("error_class=unknown");
  process.exit(0);
});
