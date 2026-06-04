// src/config/validation.ts
import dotenv from "dotenv";
import { exit } from "process";

dotenv.config();

const required = [
  "ALPHA_VANTAGE_KEY",
  "FINNHUB_KEY",
  "RAPIDAPI_NSE_KEY",
  "RAPIDAPI_NSE_HOST",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("❌ Missing required environment variables:", missing.join(", "));
  console.error("The application cannot start without these credentials.");
  process.exit(1);
}

export const config = {
  alphaVantageKey: process.env.ALPHA_VANTAGE_KEY as string,
  finnhubKey: process.env.FINNHUB_KEY as string,
  rapidApiNseKey: process.env.RAPIDAPI_NSE_KEY as string,
  rapidApiNseHost: process.env.RAPIDAPI_NSE_HOST as string,
};
