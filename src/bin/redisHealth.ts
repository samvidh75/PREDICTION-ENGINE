import { createClient } from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.log("missing");
  process.exit(0);
}

const client = createClient({ url: redisUrl });

client
  .connect()
  .then(() => client.ping())
  .then((res) => {
    console.log("reachable");
    process.exit(0);
  })
  .catch(() => {
    console.log("unreachable");
    process.exit(1);
  })
  .finally(() => client.disconnect());
