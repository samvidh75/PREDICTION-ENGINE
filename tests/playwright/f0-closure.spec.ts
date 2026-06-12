import { expect, test } from '@playwright/test';

const partialTrustEnvelope = {
  status: 'partial',
  message: 'Only registry-backed trust metrics are available.',
  data: {
    alpha: null,
    hit_rate: null,
    sharpe_ratio: null,
    calibration_score: null,
    total_predictions: 125,
    total_outcomes: null,
  },
  dataState: {
    availability: 'partial',
    asOf: '2026-06-11',
    missingInputs: ['audited_outcomes.alpha'],
    completenessScore: 17,
  },
};

const stockStoryEnvelope = {
  status: 'ok',
  data: {
    symbol: 'RELIANCE',
    predictionDate: '2026-06-11',
    healthScore: 71,
    classification: 'Healthy',
    confidence: { level: 'High', score: 82, source: 'prediction_registry', snapshotDate: '2026-06-11' },
    narrative: 'Registry-backed health snapshot.',
    factors: {
      growth: { score: 70, source: 'prediction_registry', snapshotDate: '2026-06-11' },
      quality: { score: 75, source: 'prediction_registry', snapshotDate: '2026-06-11' },
      stability: { score: null, source: 'prediction_registry', snapshotDate: '2026-06-11' },
      momentum: { score: 68, source: 'prediction_registry', snapshotDate: '2026-06-11' },
      value: { score: 66, source: 'prediction_registry', snapshotDate: '2026-06-11' },
      risk: { score: 30, source: 'prediction_registry', snapshotDate: '2026-06-11' },
    },
  },
};

function restoreBrowserSession(): void {
  window.localStorage.setItem('ss_auth_session_v1', JSON.stringify({
    status: 'authenticated',
    uid: 'browser-user',
    createdAtMs: Date.now(),
  }));
}

test('Trust Centre shows partial evidence and unavailable audited metrics', async ({ page }) => {
  await page.route('**/api/intelligence/trust-metrics', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(partialTrustEnvelope) });
  });

  await page.goto('/?page=trust');
  await expect(page.getByRole('heading', { name: /Trust Centre/i })).toBeVisible();
  await expect(page.getByText(/Trust metrics status: partial/i)).toBeVisible();
  await expect(page.getByText('Data unavailable').first()).toBeVisible();
});

test('StockStory horizon is URL-backed and reaches snapshot and explanation APIs', async ({ page }) => {
  const stockHorizons: string[] = [];
  const explanationHorizons: string[] = [];
  await page.addInitScript(restoreBrowserSession);

  await page.route('**/api/**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/stockstory/RELIANCE**', async (route) => {
    stockHorizons.push(new URL(route.request().url()).searchParams.get('horizon') || '');
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(stockStoryEnvelope) });
  });
  await page.route('**/api/market-data/metadata/RELIANCE', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ companyName: 'Reliance Industries', sector: 'Energy', industry: 'Conglomerate', currency: 'INR' }),
    });
  });
  await page.route('**/api/company/RELIANCE/ownership', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ categories: [], comment: 'Data unavailable' }) });
  });
  await page.route('**/api/company/RELIANCE/timeline', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: '[]' });
  });
  await page.route('**/api/predictions/explain/RELIANCE**', async (route) => {
    explanationHorizons.push(new URL(route.request().url()).searchParams.get('horizon') || '');
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: {
          symbol: 'RELIANCE',
          classification: { from: null, to: 'Healthy', changed: false },
          healthScore: { from: null, to: 71, delta: null },
          summary: 'First prediction.',
          drivers: [],
          positives: [],
          negatives: [],
          factorContributions: [],
          historicalReliability: null,
          generatedAt: '2026-06-11T00:00:00.000Z',
        },
      }),
    });
  });

  await page.goto('/?page=stock&id=RELIANCE&horizon=90');
  await expect(page.getByRole('button', { name: '90D' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '365D' }).click();
  await expect(page).toHaveURL(/horizon=365/);
  await expect.poll(() => stockHorizons).toContain('365');
  await page.getByRole('button', { name: 'whychange' }).click();
  await expect.poll(() => explanationHorizons).toContain('365');
  await expect(page.getByText('First Prediction', { exact: true })).toBeVisible();
});

test('authenticated alert centre dismisses a user-scoped alert', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('ss_auth_session_v1', JSON.stringify({
      status: 'authenticated',
      uid: 'browser-user',
      createdAtMs: Date.now(),
    }));
    window.localStorage.setItem('stockstory_alerts_v3_browser-user', JSON.stringify([{
      id: '42',
      category: 'Factor',
      title: 'RELIANCE score changed',
      body: 'Review the latest factors.',
      timestamp: '2026-06-11',
      symbol: 'RELIANCE',
      isRead: false,
    }]));
  });

  await page.goto('/?page=alerts');
  await expect(page.getByText('RELIANCE score changed')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByText('RELIANCE score changed')).toHaveCount(0);
});
