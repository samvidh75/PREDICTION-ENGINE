import { expect, test } from '@playwright/test';

function restoreBrowserSession(): void {
  window.localStorage.setItem('ss_auth_session_v1', JSON.stringify({
    status: 'authenticated',
    uid: 'browser-user',
    createdAtMs: Date.now(),
  }));
}

const signalEnvelope = {
  status: 'ok',
  message: 'Signal feed generated from prediction registry diffs.',
  reason: null,
  generatedAt: '2026-06-13T09:30:00.000Z',
  dataState: {
    freshness: 'recent',
    asOf: '2026-06-13',
    completenessScore: 100,
    missingInputs: [],
    neutralizedFields: [],
    lineage: [{ sourceTable: 'prediction_registry', asOf: '2026-06-13' }],
  },
  data: {
    snapshotDate: '2026-06-13',
    symbolsAnalyzed: 12,
    signals: [
      {
        symbol: 'RELIANCE',
        type: 'confidence_increase',
        severity: 'important',
        previousValue: 61,
        currentValue: 72,
        delta: 11,
        explanation: 'Confidence improved between prediction-registry snapshots.',
        snapshotDate: '2026-06-13',
      },
    ],
  },
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(restoreBrowserSession);
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
});

test('daily feed shows prediction-registry lineage and navigates to Trust Centre', async ({ page }) => {
  await page.route('**/api/intelligence/signals', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(signalEnvelope) });
  });

  await page.goto('/?page=daily-feed');
  await expect(page.getByRole('heading', { name: 'Daily Intelligence' })).toBeVisible();
  await expect(page.getByText('Prediction-registry snapshot differences', { exact: true })).toBeVisible();
  await expect(page.getByText('As of: 2026-06-13', { exact: true })).toBeVisible();
  await expect(page.getByText('Sources: prediction_registry', { exact: true })).toBeVisible();
  await expect(page.getByText('Symbols analyzed: 12', { exact: true })).toBeVisible();
  await expect(page.getByText('Confidence improved between prediction-registry snapshots.', { exact: true })).toBeVisible();
  await expect(page.getByText('Since yesterday', { exact: true })).toHaveCount(0);

  const links = page.getByRole('region', { name: 'Research and trust links' });
  await links.getByRole('button', { name: 'Trust centre', exact: true }).click();
  await expect(page).toHaveURL(/page=trust/);
  await expect(page.getByRole('heading', { name: /Trust Centre/i })).toBeVisible();
});

test('academy shows a source-review-required notice and Trust Centre action', async ({ page }) => {
  await page.goto('/?page=academy');
  const notice = page.getByRole('region', { name: 'Academy content review status' });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText('Educational content · source review required');
  await expect(notice).toContainText('Verify current rules with authoritative sources before acting.');

  await notice.getByRole('button', { name: 'Trust centre', exact: true }).click();
  await expect(page).toHaveURL(/page=trust/);
  await expect(page.getByRole('heading', { name: /Trust Centre/i })).toBeVisible();
});

test('portfolio workflow exposes feed academy and trust links', async ({ page }) => {
  await page.goto('/?page=portfolio');
  const links = page.getByRole('region', { name: 'Research and trust links' });
  await expect(links.getByRole('button', { name: 'Daily feed', exact: true })).toBeVisible();
  await expect(links.getByRole('button', { name: 'Academy', exact: true })).toBeVisible();
  await expect(links.getByRole('button', { name: 'Trust centre', exact: true })).toBeVisible();
});
