import { IndianApiPremiumConfig } from '../src/backend/integrations/indianapi/IndianApiPremiumConfig';

function main(): void {
  const config = IndianApiPremiumConfig.getInstance();
  const summary = config.getSummary();
  console.log('IndianAPI Premium Configuration Summary');
  console.log('──────────────────────────────────────');
  console.log(`  enabled: ${summary.enabled}`);
  console.log(`  hasApiKey: ${summary.hasApiKey}`);
  console.log(`  baseUrlConfigured: ${summary.baseUrlConfigured}`);
  console.log(`  timeoutMs: ${summary.timeoutMs}`);
  console.log(`  concurrency: ${summary.concurrency}`);
  console.log(`  rateLimitPerMinute: ${summary.rateLimitPerMinute}`);
  console.log(`  historyEnabled: ${summary.historyEnabled}`);
  console.log(`  scanEnabled: ${summary.scanEnabled}`);
  if (!summary.hasApiKey) {
    console.log('');
    console.log('Warning: No API key configured. Set INDIANAPI_PREMIUM_API_KEY or INDIANAPI_KEY.');
  }
  if (!summary.enabled) {
    console.log('');
    console.log('Warning: IndianAPI Premium is disabled. Set INDIANAPI_PREMIUM_ENABLED=true.');
  }
}

main();
