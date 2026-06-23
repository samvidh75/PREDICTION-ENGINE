import { UpstoxConfig } from '../src/backend/integrations/upstox/UpstoxConfig';
import { UpstoxOAuthService } from '../src/backend/integrations/upstox/UpstoxOAuthService';

function main(): void {
  UpstoxConfig.reset();

  let config: UpstoxConfig;
  try {
    config = UpstoxConfig.getInstance();
  } catch {
    console.log('Status: unconfigured');
    console.log('Message: Upstox is not configured. Set UPSTOX_API_KEY and UPSTOX_CLIENT_SECRET.');
    process.exit(1);
  }

  const oauth = new UpstoxOAuthService(config);
  const status = oauth.getStatus();

  console.log('Upstox Status');
  console.log('──────────────────────────────────────');
  console.log(`Configured: ${status.configured}`);
  console.log(`Token Present: ${status.tokenPresent}`);
  console.log(`Token Expiry: ${status.tokenExpiry || 'N/A'}`);
  console.log(`Sandbox Enabled: ${status.sandboxEnabled}`);
  console.log(`Sandbox Token Present: ${status.sandboxTokenPresent}`);
  console.log(`Market Data Enabled: ${status.marketDataEnabled}`);
  console.log(`Order Sandbox Enabled: ${status.orderSandboxEnabled}`);

  if (!status.configured) {
    console.log('');
    console.log('Warning: API key or client secret missing.');
    console.log('To configure: set UPSTOX_API_KEY, UPSTOX_CLIENT_SECRET, and UPSTOX_REDIRECT_URI.');
  }
  if (!status.tokenPresent && !status.sandboxEnabled) {
    console.log('');
    console.log('No live token. Run: npm run upstox:auth-url');
  }
}

main();
