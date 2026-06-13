import { InMemoryProviderBrokerStore } from './InMemoryProviderBrokerStore';
import { ProviderCallLedger } from './ProviderCallLedger';
import { ProviderQuotaPolicy } from './ProviderQuotaPolicy';
import { ProviderRequestBroker } from './ProviderRequestBroker';
import { RedisProviderBrokerStore } from './RedisProviderBrokerStore';
import { assertProviderBrokerConfig, loadProviderBrokerConfig, type ProviderBrokerConfig } from './config';
import { createRedisProviderBrokerClient, type RedisClientFactory, type RedisProviderBrokerClientHandle } from './createRedisProviderBrokerClient';

export interface ProviderRequestBrokerHandle {
  broker: ProviderRequestBroker;
  shutdown: () => Promise<void>;
}

export function createProviderRequestBroker(config: ProviderBrokerConfig = loadProviderBrokerConfig()): ProviderRequestBroker {
  assertProviderBrokerConfig(config);
  assertSynchronousFactoryAllowed(config);

  const quota = new ProviderQuotaPolicy();
  if (config.maxProviderCallsPerRun !== undefined) {
    quota.setRunLevelMax(config.maxProviderCallsPerRun);
  }

  return new ProviderRequestBroker(quota, new ProviderCallLedger(), new InMemoryProviderBrokerStore());
}

export async function createProviderRequestBrokerHandle(
  config: ProviderBrokerConfig = loadProviderBrokerConfig(),
  redisClientFactory: RedisClientFactory = createRedisProviderBrokerClient,
): Promise<ProviderRequestBrokerHandle> {
  assertProviderBrokerConfig(config);

  const quota = new ProviderQuotaPolicy();
  if (config.maxProviderCallsPerRun !== undefined) {
    quota.setRunLevelMax(config.maxProviderCallsPerRun);
  }

  let redisHandle: RedisProviderBrokerClientHandle | null = null;
  const store = config.redisUrl
    ? new RedisProviderBrokerStore(config.redisUrl, (redisHandle = await redisClientFactory(config.redisUrl)).client)
    : new InMemoryProviderBrokerStore();

  return {
    broker: new ProviderRequestBroker(quota, new ProviderCallLedger(), store),
    shutdown: async () => {
      await redisHandle?.shutdown();
    },
  };
}

function assertSynchronousFactoryAllowed(config: ProviderBrokerConfig): void {
  if (!config.redisUrl) return;
  if (config.nodeEnv === 'test') return;

  throw new Error('Provider broker configuration error: Redis-backed broker creation requires createProviderRequestBrokerHandle() so the Redis client is connected before use.');
}

export const providerRequestBroker = createProviderRequestBroker();
