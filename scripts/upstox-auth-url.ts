import { UpstoxOAuthService } from '../src/backend/integrations/upstox/UpstoxOAuthService';
import { UpstoxConfig } from '../src/backend/integrations/upstox/UpstoxConfig';
import { UpstoxTokenStore } from '../src/backend/integrations/upstox/UpstoxTokenStore';

function main(): void {
  let config: UpstoxConfig;
  try {
    UpstoxTokenStore.reset();
    UpstoxConfig.reset();
    config = UpstoxConfig.getInstance();
  } catch (err: any) {
    console.log('Error: ' + err.message);
    console.log('Set UPSTOX_API_KEY, UPSTOX_CLIENT_SECRET, and UPSTOX_REDIRECT_URI in environment.');
    process.exit(1);
  }

  const oauth = new UpstoxOAuthService(config);
  const summary = config.getSummary();

  if (!summary.hasApiKey) {
    console.log('Error: UPSTOX_API_KEY is not configured.');
    process.exit(1);
  }
  if (!summary.hasRedirectUri) {
    console.log('Error: UPSTOX_REDIRECT_URI is not configured.');
    process.exit(1);
  }

  if (summary.sandboxEnabled) {
    console.log('Warning: Sandbox mode is enabled. OAuth flow is for live tokens only.');
    console.log('Set UPSTOX_SANDBOX_ENABLED=false to use live OAuth.');
    console.log('');
  }

  const result = oauth.buildAuthorizationUrl();

  console.log('Upstox Authorization URL');
  console.log('──────────────────────────────────────');
  console.log(`Redirect URI: ${config.redirectUri}`);
  console.log(`Auth URL:`);
  console.log(result.authUrl);
  console.log('');
  console.log('Open the auth URL in a browser to authorize the app.');
  console.log('After authorization, Upstox will redirect to the callback URL with a code.');
  console.log('The code will be exchanged server-side for an access token.');
}

main();
