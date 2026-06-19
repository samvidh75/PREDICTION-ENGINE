import dotenv from "dotenv";

dotenv.config();

/** Allowed CORS origins — always includes the production domain. */
const PROD_ORIGIN = "https://stockstory-india.com";
const PROD_WWW_ORIGIN = "https://www.stockstory-india.com";
const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:4000",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:3000",
];

export interface AppEnv {
  nodeEnv: "development" | "production" | "test";
  isProduction: boolean;
  allowedOrigins: string[];
  cookieSecret: string;
  postgres?: {
    connectionString: string;
  };
  indianApiKey?: string;
  redisUrl?: string;
}

export function loadEnv(): AppEnv {
  const nodeEnv = (process.env.NODE_ENV ?? "development") as AppEnv["nodeEnv"];
  const isProduction = nodeEnv === "production";

  const allowedOrigins: string[] = [PROD_ORIGIN, PROD_WWW_ORIGIN];

  const extraOrigins = (process.env.EXTRA_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0 && o !== PROD_ORIGIN && o !== PROD_WWW_ORIGIN);

  // Deduplicate
  const seen = new Set(extraOrigins);
  for (const o of seen) allowedOrigins.push(o);

  if (!isProduction) {
    allowedOrigins.push(...DEV_ORIGINS);
  }
  // In production fail hard if cookie secret is not set
  const cookieSecret = process.env.COOKIE_SECRET ?? (isProduction ? "" : "dev-secret-changeme");
  if (isProduction && !cookieSecret) {
    console.error("[backend] FATAL: COOKIE_SECRET must be set in production.");
    process.exit(1);
  }

  return {
    nodeEnv,
    isProduction,
    allowedOrigins,
    cookieSecret,
    postgres: process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : undefined,
    indianApiKey: process.env.INDIANAPI_KEY,
    redisUrl: process.env.REDIS_URL,
  };
}
