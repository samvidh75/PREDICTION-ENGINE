import { expect, test } from '@playwright/test';

function restorePortfolioSession(): void {
  window.localStorage.setItem('ss_auth_session_v1', JSON.stringify({
    status: 'authenticated',
    uid: 'browser-user',
    createdAtMs: Date.now(),
  }));
  window.localStorage.setItem('stockstory_portfolio_holdings_v1_browser-user', JSON.stringify([
    { symbol: 'RELIANCE', shares: 10, avgBuyPrice: 100, sector: 'Energy' },
    { symbol: 'INFY', shares: 10, avgBuyPrice: 300, sector: '' },
  ]));
}

const doctorEnvelope = {
  status: 'real',
  message: 'Portfolio intelligence generated from validated positions.',
  data: {
    intelligence: {
      diversificationStatus: 'Moderately Concentrated',
      riskConcentration: 'High sector concentration risk identified in Technology (75% allocation).',
      factorExposure: { quality: 62, value: 55, growth: 58, momentum: 51, risk: 49 },
      sectorExposure: { Energy: 25, Technology: 75 },
    },
    holdingsCount: 2,
    neutralizedFields: [],
    completenessScore: 100,
  },
  dataState: {
    availability: 'real',
    completenessScore: 100,
  },
};

test('portfolio operating view withholds incomplete live value and doctor uses recorded cost-basis weights', async ({ page }) => {
  let doctorPositions = '';
  await page.addInitScript(restorePortfolioSession);
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/market-data/quote/RELIANCE', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        symbol: 'RELIANCE',
        exchange: 'NSE',
        price: 120,
        change: 2,
        changePercent: 1.69,
        updatedAt: '2026-06-13T09:30:00.000Z',
      }),
    });
  });
  await page.route('**/api/market-data/quote/INFY', async (route) => {
    await route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ code: 'QUOTE_DATA_UNAVAILABLE' }) });
  });
  await page.route('**/api/intelligence/portfolio?positions=*', async (route) => {
    doctorPositions = new URL(route.request().url()).searchParams.get('positions') ?? '';
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(doctorEnvelope) });
  });

  await page.goto('/?page=portfolio');
  const summary = page.getByRole('region', { name: 'Portfolio operating summary' });
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('partial');
  await expect(summary).toContainText('1/2');
  await expect(summary).toContainText('Missing live quotes: INFY');
  await expect(page.getByText('Sector unavailable', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Unavailable', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Doctor' }).click();
  await expect(page).toHaveURL(/page=portfolio-doctor/);
  await expect.poll(() => doctorPositions).toBe('RELIANCE:0.25000000,INFY:0.75000000');
  await expect(page.getByText(/Input basis:/)).toContainText('recorded cost basis');
  await expect(page.getByText('Moderately Concentrated', { exact: true })).toBeVisible();
});
