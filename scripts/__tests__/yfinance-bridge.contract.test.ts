import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const bridge = readFileSync(resolve(process.cwd(), "scripts/yfinance_bridge.py"), "utf8");
const requirements = readFileSync(resolve(process.cwd(), "requirements-yfinance.txt"), "utf8");
const envTemplate = readFileSync(resolve(process.cwd(), ".env.production.example"), "utf8");

describe("yfinance Python bridge contract", () => {
  it("downloads historical data in bounded ticker batches", () => {
    expect(bridge).toContain('yf.download(" ".join(symbols)');
    expect(bridge).toContain('YFINANCE_BATCH_SIZE');
    expect(bridge).toContain('group_by": "ticker"');
    expect(bridge).toContain('threads": True');
  });

  it("paces uncached per-symbol fundamentals calls with randomized jitter", () => {
    expect(bridge).toContain('random.uniform(minimum, maximum)');
    expect(bridge).toContain('YFINANCE_MIN_DELAY_SECONDS');
    expect(bridge).toContain('YFINANCE_MAX_DELAY_SECONDS');
  });

  it("supports atomic JSON cache and optional requests-cache fallback", () => {
    expect(bridge).toContain('os.replace(temp_path, path)');
    expect(bridge).toContain('requests_cache.CachedSession');
    expect(bridge).toContain('YFINANCE_REQUEST_CACHE_ENABLED');
    expect(requirements).toContain('requests-cache');
  });

  it("documents runtime controls without hard-coded credentials", () => {
    expect(envTemplate).toContain('YFINANCE_CACHE_PATH=tmp/yfinance-cache.json');
    expect(envTemplate).toContain('YFINANCE_BATCH_SIZE=40');
    expect(envTemplate).toContain('FINNHUB_KEY=');
    expect(envTemplate).not.toMatch(/FINNHUB_KEY=\S+/);
    expect(envTemplate).not.toMatch(/FINNHUB_API_KEY=\S+/);
  });
});
