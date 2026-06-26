export const ENV = {
  INDIANAPI_KEY: process.env.INDIANAPI_KEY || '',
  UPSTOX_ACCESS_TOKEN: process.env.UPSTOX_ACCESS_TOKEN || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  NEWS_API_KEY: process.env.NEWS_API_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  CACHE_TTL_MS: parseInt(process.env.CACHE_TTL_MS || '300000', 10),
  SCREENER_RATE_LIMIT_MS: parseInt(process.env.SCREENER_RATE_LIMIT_MS || '12000', 10),
};

export const isProd = ENV.NODE_ENV === 'production';
export const isDev = ENV.NODE_ENV === 'development';
