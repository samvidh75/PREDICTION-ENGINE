import { InMemoryProviderBrokerStore } from './InMemoryProviderBrokerStore';
import { ProviderCallLedger } from './ProviderCallLedger';
import { ProviderQuotaPolicy } from './ProviderQuotaPolicy';
import { ProviderRequestBroker } from './ProviderRequestBroker';
import { RedisProviderBrokerStore } from './RedisProviderBrokerStore';
import { assertProviderBrokerConfig, loadProviderBrokerConfig, type ProviderBrokerConfig } from './config';

export function createProviderRequestBroker(config: ProviderBrokerConfig = loadProviderBrokerConfig()): ProviderRequestBroker {
  assertProviderBrokerConfig(config);

  const quota = new ProviderQuotaPolicy();
  if (config.maxProviderCallsPerRun !== undefined) {
    quota.setRunLevelMax(config.maxProviderCallsPerRun);
  }

  const store = config.nodeEnv === 'test' || !config.redisUrl
    ? new InMemoryProviderBrokerStore()
    : new RedisProviderBrokerStore(config.redisUrl);

  return new ProviderRequestBroker(quota, new ProviderCallLedger(), store);
}

export const providerRequestBroker = createProviderRequestBroker();
