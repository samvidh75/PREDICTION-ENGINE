import { UpstoxConfig } from '../src/backend/integrations/upstox/UpstoxConfig';
import { UpstoxTokenStore } from '../src/backend/integrations/upstox/UpstoxTokenStore';
import { UpstoxSandboxClient } from '../src/backend/integrations/upstox/UpstoxSandboxClient';

async function main(): Promise<void> {
  UpstoxTokenStore.reset();
  UpstoxConfig.reset();
  UpstoxTokenStore.getInstance().loadFromEnv();

  let config: UpstoxConfig;
  try {
    config = UpstoxConfig.getInstance();
  } catch (err: any) {
    console.log('Sandbox smoke: SKIPPED — Upstox not configured');
    console.log('Reason: ' + err.message);
    process.exit(0);
  }

  if (!config.getSandboxEnabled()) {
    console.log('Sandbox smoke: SKIPPED — Sandbox mode not enabled');
    console.log('Set UPSTOX_SANDBOX_ENABLED=true or UPSTOX_SANDBOX_MODE=true');
    process.exit(0);
  }

  const sandboxToken = config.getSandboxAccessToken();
  if (!sandboxToken) {
    console.log('Sandbox smoke: SKIPPED — No sandbox token');
    console.log('Set UPSTOX_SANDBOX_ACCESS_TOKEN in environment');
    process.exit(0);
  }

  UpstoxTokenStore.getInstance().setSandboxToken(sandboxToken);

  const client = new UpstoxSandboxClient(config);

  console.log('Upstox Sandbox Smoke Test');
  console.log('──────────────────────────────────────');

  try {
    const profile = await client.getPositions();
    console.log('GET /user/positions: OK');
    console.log('Response: ' + JSON.stringify(profile).substring(0, 200));
  } catch (err: any) {
    console.log('GET /user/positions: ERROR — ' + err.message);
  }

  try {
    const holdings = await client.getHoldings();
    console.log('GET /user/holdings: OK');
    console.log('Response: ' + JSON.stringify(holdings).substring(0, 200));
  } catch (err: any) {
    console.log('GET /user/holdings: ERROR — ' + err.message);
  }

  try {
    const health = await client.checkHealth();
    console.log('Health check: ' + health.status);
    console.log('Message: ' + health.message);
  } catch (err: any) {
    console.log('Health check: ERROR — ' + err.message);
  }

  console.log('');
  console.log('Sandbox smoke complete.');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
