import { UpstoxConfig } from '../src/backend/integrations/upstox/UpstoxConfig';
import { UpstoxTokenStore } from '../src/backend/integrations/upstox/UpstoxTokenStore';
import { UpstoxClient } from '../src/backend/integrations/upstox/UpstoxClient';
import { mapQuote, mapCandle } from '../src/backend/integrations/upstox/UpstoxMarketDataMapper';

async function main(): Promise<void> {
  UpstoxTokenStore.reset();
  UpstoxConfig.reset();
  UpstoxTokenStore.getInstance().loadFromEnv();

  let config: UpstoxConfig;
  try {
    config = UpstoxConfig.getInstance();
  } catch (err: any) {
    console.log('Market smoke: SKIPPED — Upstox not configured');
    console.log('Reason: ' + err.message);
    process.exit(0);
  }

  if (config.getSandboxEnabled()) {
    console.log('Market smoke: SKIPPED — Sandbox mode is enabled');
    console.log('Market data smoke requires live mode');
    process.exit(0);
  }

  const token = config.getLiveAccessToken();
  if (!token) {
    console.log('Market smoke: SKIPPED — No live access token');
    console.log('Complete OAuth flow or set UPSTOX_ACCESS_TOKEN');
    process.exit(0);
  }

  UpstoxTokenStore.getInstance().setLiveToken(token);
  const client = new UpstoxClient(config);

  console.log('Upstox Market Data Smoke Test');
  console.log('──────────────────────────────────────');

  try {
    const profile = await client.getUserProfile();
    console.log('User Profile:');
    console.log('  userId: ' + profile.userId);
    console.log('  userName: ' + profile.userName);
  } catch (err: any) {
    console.log('User Profile: ERROR — ' + err.message);
  }

  try {
    const quotes = await client.getMarketQuote(['NSE_EQ|INE002A01018']);
    console.log('Quote (RELIANCE):');
    if (quotes.length > 0) {
      const norm = mapQuote(quotes[0]);
      console.log('  symbol: ' + norm.symbol);
      console.log('  lastPrice: ' + norm.lastPrice);
      console.log('  change: ' + norm.change);
      console.log('  changePercent: ' + norm.changePercent);
    }
  } catch (err: any) {
    console.log('Quote: ERROR — ' + err.message);
  }

  try {
    const candles = await client.getHistoricalCandles('NSE_EQ|INE002A01018', 'day', '2026-06-01', '2026-06-20');
    console.log('Historical (RELIANCE, last 20 days):');
    if (candles.length > 0) {
      const norm = mapCandle(candles[candles.length - 1], 'RELIANCE');
      console.log('  latest: ' + norm.date + ' close=' + norm.close + ' volume=' + norm.volume);
      console.log('  total candles: ' + candles.length);
    }
  } catch (err: any) {
    console.log('Historical: ERROR — ' + err.message);
  }

  console.log('');
  console.log('Market data smoke complete.');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
