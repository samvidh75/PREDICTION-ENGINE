import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const healthcheck = readFileSync(resolve(process.cwd(), 'scripts/provider-healthcheck.ts'), 'utf8');
const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/provider-health.yml'), 'utf8');
const envTemplate = readFileSync(resolve(process.cwd(), '.env.production.example'), 'utf8');
const deploymentGuide = readFileSync(resolve(process.cwd(), 'DEPLOYMENT_GUIDE.md'), 'utf8');

describe('provider healthcheck contract', () => {
  it('tests only configured Finnhub, IndianAPI, and optional yfinance providers', () => {
    expect(healthcheck).toContain("type ProviderName = 'finnhub' | 'indianapi' | 'yfinance'");
    expect(healthcheck).toContain("process.env.FINNHUB_KEY ?? process.env.FINNHUB_API_KEY");
    expect(healthcheck).toContain('process.env.INDIANAPI_KEY');
    expect(healthcheck).toContain("String(process.env.YFINANCE_ENABLED ?? '').toLowerCase() === 'true'");
    expect(healthcheck).not.toContain('ALPHA_VANTAGE');
  });

  it('writes redacted reports and never prints secret values', () => {
    expect(healthcheck).toContain('secretValuesPrinted: false');
    expect(healthcheck).toContain("path.join(outputDirectory, 'latest.json')");
    expect(healthcheck).not.toContain('console.log(token)');
    expect(healthcheck).not.toContain('rawPayload');
  });

  it('runs manually with GitHub Actions secrets and uploads a redacted artifact', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('FINNHUB_KEY: ${{ secrets.FINNHUB_KEY }}');
    expect(workflow).toContain('INDIANAPI_KEY: ${{ secrets.INDIANAPI_KEY }}');
    expect(workflow).toContain('provider-health-report');
    expect(workflow).not.toContain('ALPHA_VANTAGE');
  });

  it('removes Alpha Vantage from active environment and deployment guidance', () => {
    expect(envTemplate).not.toContain('ALPHA_VANTAGE');
    expect(deploymentGuide).not.toContain('ALPHA_VANTAGE');
  });
});
