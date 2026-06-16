#!/usr/bin/env tsx
import { createClient } from "redis";

async function checkRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("REDIS_STATUS=missing");
    process.exit(0);
  }

  const client = createClient({ url });
  let connected = false;
  let errorClass = "";

  const timeout = setTimeout(() => {
    if (!connected) {
      errorClass = "timeout";
      client.disconnect().catch(() => {});
    }
  }, 5000);

  try {
    await client.connect();
    connected = true;
    await client.ping();
    console.log("REDIS_STATUS=reachable");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("ENETUNREACH")) {
      errorClass = "connection_refused";
    } else if (msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("password") || msg.toLowerCase().includes("nopass")) {
      errorClass = "auth_failed";
    } else if (msg.includes("timeout") || msg.includes("timed out")) {
      errorClass = "timeout";
    } else {
      errorClass = "unknown_error";
    }
    console.log("REDIS_STATUS=" + errorClass);
  } finally {
    clearTimeout(timeout);
    if (connected) {
      await client.disconnect().catch(() => {});
    }
  }
}

checkRedis().catch(() => {
  console.log("REDIS_STATUS=unknown_error");
  process.exit(0);
});
