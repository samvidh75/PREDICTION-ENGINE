import { expect, test } from '@playwright/test';

function restoreBrowserSession(): void {
  window.localStorage.setItem('ss_auth_session_v1', JSON.stringify({
    status: 'authenticated',
    uid: 'browser-user',
    createdAtMs: Date.now(),
  }));
}

const marketActionResponse = {
  status: 'real',
  asOf: '2026-06-13',
  message: 'Market action is derived from stored daily prices and certified snapshot fields.',
  data: {
    gainers: [
      { symbol: 'RELIANCE', companyName: 'Reliance Industries', sector: 'Energy', tradeDate: '2026-06-13', price: 1400, changePercent: 2.5, volume: 1000000 },
    ],
    losers: [
      { symbol: 'INFY', companyName: 'Infosys', sector: 'Technology', tradeDate: '2026-06-13', price: 1500, changePercent: -1.25, volume: 2000000 },
    ],
    volumeLeaders: [
      { symbol: 'INFY', companyName: 'Infosys', sector: 'Technology', tradeDate: '2026-06-13', price: 1500, changePercent: -1.25, volume: 2000000 },
    ],
    sectorMovers: [
      { sector: 'Energy', averageChangePercent: 2.5, symbolsAnalyzed: 1 },
      { sector: 'Technology', averageChangePercent: -1.25, symbolsAnalyzed: 1 },
    ],
    scannerPresets: [
      {
        id: 'positive-momentum',
        label: 'Positive momentum',
        description: 'Latest feature snapshot momentum above zero, ranked highest first.',
        sourceFields: ['feature_snapshots.momentum'],
        availability: 'real',
        items: [{ symbol: 'RELIANCE', companyName: 'Reliance Industries', sector: 'Energy', value: 4, displayValue: '4%', asOf: '2026-06-13' }],
      },
      {
        id: 'lower-volatility',
        label: 'Lower volatility',
        description: 'Latest feature snapshot volatility ranked lowest first.',
        sourceFields: ['feature_snapshots.volatility'],
        availability: 'real',
        items: [{ symbol: 'INFY', companyName: 'Infosys', sector: 'Technology', value: 12, displayValue: '12%', asOf: '2026-06-13' }],
      },
      {
        id: 'value-watch',
        label: 'Value watch',
        description: 'Latest positive PE ratios ranked lowest first. This is a screen, not a recommendation.',
        sourceFields: ['financial_snapshots.pe_ratio'],
        availability: 'real',
        items: [{ symbol: 'INFY', companyName: 'Infosys', sector: 'Technology', value: 18, displayValue: '18x PE', asOf: '2026-06-13' }],
      },
      {
        id: 'large-cap',
        label: 'Large cap',
        description: 'Latest populated market capitalisation ranked highest first.',
        sourceFields: ['financial_snapshots.market_cap'],
        availability: 'real',
        items: [{ symbol: 'RELIANCE', companyName: 'Reliance Industries', sector: 'Energy', value: 19000000000000, displayValue: '19 L Cr', asOf: '2026-06-13' }],
      },
    ],
  },
  dataState: {
    availability: 'real',
    sourceTables: ['daily_prices', 'symbols', 'financial_snapshots', 'feature_snapshots'],
    rowsAnalyzed: 2,
    rowsWithComparisons: 2,
    missingInputs: [],
  },
};

test('dashboard renders source-backed movers and scanner presets', async ({ page }) => {
  await page.addInitScript(restoreBrowserSession);
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/predictions/signals**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ signals: [], symbolsAnalyzed: 2 }) });
  });
  await page.route('**/api/market-data/market-action', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(marketActionResponse) });
  });

  await page.goto('/?page=dashboard');
  const board = page.getByRole('region', { name: 'Market action board' });
  await expect(board).toBeVisible();
  await expect(board.getByText('Gainers', { exact: true })).toBeVisible();
  await expect(board.getByText('Losers', { exact: true })).toBeVisible();
  await expect(board.getByText('Positive momentum', { exact: true })).toBeVisible();
  await expect(board.getByText('Value watch', { exact: true })).toBeVisible();
  await expect(board).toContainText('Sources: daily_prices, symbols, financial_snapshots, feature_snapshots');
  await expect(board.getByText('+2.50%', { exact: true }).first()).toBeVisible();

  await board.getByText('RELIANCE', { exact: true }).first().click();
  await expect(page).toHaveURL(/page=stock.*id=RELIANCE/);
});
