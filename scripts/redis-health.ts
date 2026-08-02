#!/usr/bin/env tsx
import { createClient } from "redis";

async function checkRedis(): Promise<void> {
  const url = process.env.REDIS_URL;
  const redisUrlStatus = url ? "present" : "missing";
  console.log(`REDIS_URL=${redisUrlStatus}`);

  if (!url) {
    console.log("redis=unreachable");
    console.log("error_class=missing");
    process.exit(0);
  }

  const client = createClient({ url });
  let connected = false;
  let errorClass: string;

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
    console.log("redis=reachable");
    console.log("error_class=unknown");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND") || msg.includes("ENETUNREACH")) {
      errorClass = "network";
    } else if (msg.toLowerCase().includes("auth") || msg.toLowerCase().includes("password") || msg.toLowerCase().includes("nopass")) {
      errorClass = "auth";
    } else if (msg.includes("timeout") || msg.includes("timed out")) {
      errorClass = "timeout";
    } else {
      errorClass = "unknown";
    }
    console.log("redis=unreachable");
    console.log(`error_class=${errorClass}`);
  } finally {
    clearTimeout(timeout);
    if (connected) {
      await client.disconnect().catch(() => {});
    }
  }
}

checkRedis().catch(() => {
  console.log("redis=unreachable");
  console.log("error_class=unknown");
  process.exit(0);
});
