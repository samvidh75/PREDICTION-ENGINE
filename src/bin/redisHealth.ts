import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.info("missing");
  process.exit(0);
}

const client = createClient({ url: redisUrl });

client
  .connect()
  .then(() => client.ping())
  .then((res) => {
    console.info("reachable");
    process.exit(0);
  })
  .catch(() => {
    console.info("unreachable");
    process.exit(1);
  })
  .finally(() => client.quit());
