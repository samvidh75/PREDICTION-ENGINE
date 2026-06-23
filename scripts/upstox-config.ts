import { UpstoxConfig } from '../src/backend/integrations/upstox/UpstoxConfig';

function main(): void {
  let config: UpstoxConfig;
  try {
    config = UpstoxConfig.getInstance();
  } catch {
    console.log('Upstox configuration not available');
    console.log('  hasApiKey: false');
    console.log('  hasClientSecret: false');
    console.log('  hasRedirectUri: false');
    console.log('  hasAccessToken: false');
    console.log('  sandboxEnabled: false');
    console.log('  hasSandboxAccessToken: false');
    console.log('  marketDataEnabled: false');
    console.log('  orderSandboxEnabled: false');
    console.log('');
    console.log('Set UPSTOX_API_KEY and UPSTOX_CLIENT_SECRET in environment.');
    process.exit(1);
  }

  const summary = config.getSummary();
  console.log('Upstox Configuration Summary');
  console.log('──────────────────────────────────────');
  console.log(`  hasApiKey: ${summary.hasApiKey}`);
  console.log(`  hasClientSecret: ${summary.hasClientSecret}`);
  console.log(`  hasRedirectUri: ${summary.hasRedirectUri}`);
  console.log(`  hasAccessToken: ${summary.hasAccessToken}`);
  console.log(`  sandboxEnabled: ${summary.sandboxEnabled}`);
  console.log(`  hasSandboxAccessToken: ${summary.hasSandboxAccessToken}`);
  console.log(`  marketDataEnabled: ${summary.marketDataEnabled}`);
  console.log(`  orderSandboxEnabled: ${summary.orderSandboxEnabled}`);
  console.log('');
  console.log('Redirect URI: ' + (summary.hasRedirectUri ? '[configured]' : '[not configured]'));

  if (summary.sandboxEnabled) {
    console.log('Mode: sandbox');
    console.log('API Base: https://sandbox-api.upstox.com/v2');
  } else {
    console.log('Mode: live');
    console.log('API Base: https://api.upstox.com/v2');
    if (!summary.hasAccessToken) {
      console.log('');
      console.log('No live access token. Run: npm run upstox:auth-url');
    }
  }
}

main();
