import { UpstoxConfig } from '../src/backend/integrations/upstox/UpstoxConfig';
import { UpstoxTokenStore } from '../src/backend/integrations/upstox/UpstoxTokenStore';
import { UpstoxClient } from '../src/backend/integrations/upstox/UpstoxClient';
import { mapHolding, mapPosition } from '../src/backend/integrations/upstox/UpstoxPortfolioMapper';

async function main(): Promise<void> {
  UpstoxTokenStore.reset();
  UpstoxConfig.reset();
  UpstoxTokenStore.getInstance().loadFromEnv();

  let config: UpstoxConfig;
  try {
    config = UpstoxConfig.getInstance();
  } catch (err: any) {
    console.log('Portfolio smoke: SKIPPED — Upstox not configured');
    console.log('Reason: ' + err.message);
    process.exit(0);
  }

  if (config.getSandboxEnabled()) {
    console.log('Portfolio smoke: SKIPPED — Sandbox mode is enabled');
    console.log('Portfolio smoke requires live mode');
    process.exit(0);
  }

  const token = config.getLiveAccessToken();
  if (!token) {
    console.log('Portfolio smoke: SKIPPED — No live access token');
    console.log('Complete OAuth flow or set UPSTOX_ACCESS_TOKEN');
    process.exit(0);
  }

  UpstoxTokenStore.getInstance().setLiveToken(token);
  const client = new UpstoxClient(config);

  console.log('Upstox Portfolio Smoke Test');
  console.log('──────────────────────────────────────');

  try {
    const funds = await client.getFunds();
    console.log('Funds:');
    console.log('  totalAvailable: ' + funds.totalAvailable);
    console.log('  usedMargin: ' + funds.usedMargin);
    console.log('  payin: ' + funds.payin);
  } catch (err: any) {
    console.log('Funds: ERROR — ' + err.message);
  }

  try {
    const holdings = await client.getHoldings();
    console.log('Holdings:');
    if (holdings.length === 0) {
      console.log('  (no holdings)');
    } else {
      for (const h of holdings.slice(0, 5)) {
        const norm = mapHolding(h);
        console.log(`  ${norm.symbol}: qty=${norm.quantity} avg=${norm.averagePrice} pnl=${norm.pnl}`);
      }
      if (holdings.length > 5) console.log(`  ... and ${holdings.length - 5} more`);
    }
  } catch (err: any) {
    console.log('Holdings: ERROR — ' + err.message);
  }

  try {
    const positions = await client.getPositions();
    console.log('Positions:');
    if (positions.length === 0) {
      console.log('  (no positions)');
    } else {
      for (const p of positions.slice(0, 5)) {
        const norm = mapPosition(p);
        console.log(`  ${norm.symbol}: qty=${norm.quantity} avg=${norm.averagePrice} pnl=${norm.pnl}`);
      }
      if (positions.length > 5) console.log(`  ... and ${positions.length - 5} more`);
    }
  } catch (err: any) {
    console.log('Positions: ERROR — ' + err.message);
  }

  console.log('');
  console.log('Portfolio smoke complete.');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
