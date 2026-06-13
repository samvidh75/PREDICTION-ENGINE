import { createClient } from 'redis';
import type { ProviderBrokerRedisClient } from './RedisProviderBrokerStore';

export interface RedisProviderBrokerClientHandle {
  client: ProviderBrokerRedisClient;
  shutdown: () => Promise<void>;
}

export type RedisClientFactory = (redisUrl: string) => Promise<RedisProviderBrokerClientHandle>;

export async function createRedisProviderBrokerClient(redisUrl: string): Promise<RedisProviderBrokerClientHandle> {
  if (!redisUrl) {
    throw new Error('Provider broker Redis configuration error: REDIS_URL is required.');
  }

  const client = createClient({ url: redisUrl });
  client.on('error', () => {
    // Connection errors surface through connect/commands; avoid logging secrets.
  });

  try {
    await client.connect();
  } catch (error) {
    throw new Error(`Provider broker Redis unavailable: ${safeRedisError(error)}`);
  }

  return {
    client: client as unknown as ProviderBrokerRedisClient,
    shutdown: async () => {
      if (client.isOpen) {
        await client.quit();
      }
    },
  };
}

function safeRedisError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/redis:\/\/[^@\s]+@/gi, 'redis://[REDACTED]@');
  }
  return 'unknown connection error';
}
