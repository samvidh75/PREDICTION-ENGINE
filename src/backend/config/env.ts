import dotenv from "dotenv";

dotenv.config();

/** Allowed CORS origins — always includes the production domain. */
const PROD_ORIGIN = "https://stockstory-india.com";
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
  /** Permitted CORS origins (checked at every request). */
  allowedOrigins: string[];
  /** Secret used to sign session cookies. */
  cookieSecret: string;
  postgres?: {
    connectionString: string;
  };
  finnhubKey?: string;
  alphaVantageKey?: string;
  indianApiKey?: string;
}

export function loadEnv(): AppEnv {
  const nodeEnv = (process.env.NODE_ENV ?? "development") as AppEnv["nodeEnv"];
  const isProduction = nodeEnv === "production";

  const allowedOrigins: string[] = [PROD_ORIGIN];
  if (!isProduction) {
    allowedOrigins.push(...DEV_ORIGINS);
  }
console.log("COOKIE_SECRET present:", !!process.env.COOKIE_SECRET);
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
    finnhubKey: process.env.FINNHUB_KEY,
    alphaVantageKey: process.env.ALPHA_VANTAGE_KEY,
    indianApiKey: process.env.INDIANAPI_KEY,
  };
}
