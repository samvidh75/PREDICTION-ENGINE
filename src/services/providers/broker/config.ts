export interface ProviderBrokerConfig {
  enabled: boolean;
  redisUrl?: string;
  redisRequired: boolean;
  singleInstanceAllowed: boolean;
  nodeEnv: 'development' | 'production' | 'test';
  maxProviderCallsPerRun?: number;
}

export function loadProviderBrokerConfig(env: NodeJS.ProcessEnv = process.env): ProviderBrokerConfig {
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  return {
    enabled: parseBoolean(env.PROVIDER_BROKER_ENABLED, true),
    redisUrl: env.REDIS_URL,
    redisRequired: parseBoolean(env.PROVIDER_BROKER_REDIS_REQUIRED, nodeEnv === 'production'),
    singleInstanceAllowed: parseBoolean(env.PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED, nodeEnv !== 'production'),
    nodeEnv,
    maxProviderCallsPerRun: parsePositiveInteger(env.MAX_PROVIDER_CALLS_PER_RUN),
  };
}

export function assertProviderBrokerConfig(config: ProviderBrokerConfig): void {
  if (!config.enabled) return;

  if (config.nodeEnv === 'test') return;

  if (config.redisRequired && !config.redisUrl) {
    throw new Error('Provider broker configuration error: REDIS_URL is required when PROVIDER_BROKER_REDIS_REQUIRED=true.');
  }

  if (config.nodeEnv === 'production' && !config.redisUrl && !config.singleInstanceAllowed) {
    throw new Error('Provider broker configuration error: production without Redis requires PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED=true.');
  }
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function normalizeNodeEnv(value: string | undefined): ProviderBrokerConfig['nodeEnv'] {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}
