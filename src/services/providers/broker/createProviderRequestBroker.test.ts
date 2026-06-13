import { describe, expect, it } from 'vitest';
import { createProviderRequestBroker } from './createProviderRequestBroker';
import { assertProviderBrokerConfig, loadProviderBrokerConfig } from './config';

describe('provider broker config and factory', () => {
  it('uses deterministic in-memory broker in tests', () => {
    const broker = createProviderRequestBroker({
      enabled: true,
      redisRequired: true,
      singleInstanceAllowed: false,
      nodeEnv: 'test',
      maxProviderCallsPerRun: 1,
    });

    expect(broker).toBeDefined();
  });

  it('fails closed when Redis is required but unavailable', () => {
    const config = loadProviderBrokerConfig({
      NODE_ENV: 'production',
      PROVIDER_BROKER_ENABLED: 'true',
      PROVIDER_BROKER_REDIS_REQUIRED: 'true',
      PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED: 'false',
    });

    expect(() => assertProviderBrokerConfig(config)).toThrow(/REDIS_URL is required/);
  });

  it('allows explicit single-instance development mode', () => {
    const config = loadProviderBrokerConfig({
      NODE_ENV: 'development',
      PROVIDER_BROKER_ENABLED: 'true',
      PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED: 'true',
      MAX_PROVIDER_CALLS_PER_RUN: '7',
    });

    expect(config).toMatchObject({
      nodeEnv: 'development',
      redisRequired: false,
      singleInstanceAllowed: true,
      maxProviderCallsPerRun: 7,
    });
    expect(() => assertProviderBrokerConfig(config)).not.toThrow();
  });
});
