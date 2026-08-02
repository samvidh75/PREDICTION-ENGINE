import { describe, expect, it } from 'vitest';
import { createProviderRequestBroker, createProviderRequestBrokerHandle } from './createProviderRequestBroker';
import { assertProviderBrokerConfig, loadProviderBrokerConfig } from './config';
import type { ProviderBrokerRedisClient } from './RedisProviderBrokerStore';

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

  it('does not create a Redis-backed broker through the synchronous factory', () => {
    const config = loadProviderBrokerConfig({
      NODE_ENV: 'production',
      REDIS_URL: 'redis://localhost:6379',
      PROVIDER_BROKER_ENABLED: 'true',
      PROVIDER_BROKER_REDIS_REQUIRED: 'true',
      PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED: 'false',
    });

    expect(() => createProviderRequestBroker(config)).toThrow(/createProviderRequestBrokerHandle/);
  });

  it('injects a connected Redis client and exposes clean shutdown', async () => {
    const calls: string[] = [];
    const fakeClient: ProviderBrokerRedisClient = {
      incr: async () => 1,
      expire: async () => true,
      ttl: async () => 60,
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1,
    };

    const handle = await createProviderRequestBrokerHandle(
      {
        enabled: true,
        redisUrl: 'redis://local-test:6379',
        redisRequired: true,
        singleInstanceAllowed: false,
        nodeEnv: 'production',
        maxProviderCallsPerRun: 2,
      },
      async redisUrl => {
        calls.push(`connect:${redisUrl}`);
        return {
          client: fakeClient,
          shutdown: async () => {
            calls.push('shutdown');
          },
        };
      },
    );

    expect(handle.broker).toBeDefined();
    await handle.shutdown();
    expect(calls).toEqual(['connect:redis://local-test:6379', 'shutdown']);
  });

  it('fails closed when required Redis cannot be connected', async () => {
    await expect(createProviderRequestBrokerHandle(
      {
        enabled: true,
        redisUrl: 'redis://unavailable:6379',
        redisRequired: true,
        singleInstanceAllowed: false,
        nodeEnv: 'production',
      },
      async () => {
        throw new Error('Provider broker Redis unavailable: connection refused');
      },
    )).rejects.toThrow(/Redis unavailable/);
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
