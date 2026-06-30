/**
 * Phase 18F — Gated Playwright smoke tests for the browser-local LLM
 * connection chain.
 *
 * Tests verify:
 * 1. The Research AI Explanation Panel renders on the stock detail page
 * 2. Runtime badges show correct product-facing labels
 * 3. The Enhanced Explanation / Standard explanation labels are displayed
 * 4. The fallback chain does not expose internal enum names
 */

import { expect, test } from '@playwright/test';

/** Inject an authenticated browser session with entitlements. */
function injectAuth(page: Parameters<import('@playwright/test').Page['addInitScript']>[0]): void {
  page.addInitScript(() => {
    window.localStorage.setItem('ss_auth_session_v1', JSON.stringify({
      status: 'authenticated',
      uid: 'browser-user',
      createdAtMs: Date.now(),
    }));
    window.localStorage.setItem('ss_entitlements_v1', JSON.stringify({
      tier: 'pro',
      entitlements: ['enhanced_research', 'enhanced_explanation'],
      deviceCapable: true,
    }));
  });
}

/** Stub all /api/ calls to return empty JSON so tests aren't blocked on real APIs. */
async function stubAllApis(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
}

/** Return a realistic health envelope for RELIANCE. */
function stockStoryEnvelope() {
  return {
    status: 'ok',
    data: {
      symbol: 'RELIANCE',
      predictionDate: '2026-06-13',
      healthScore: 71,
      classification: 'Healthy',
      confidence: { level: 'High', score: 82, source: 'prediction_registry', snapshotDate: '2026-06-13' },
      narrative: 'Registry-backed health snapshot.',
      factors: {
        growth: { score: 70, source: 'prediction_registry', snapshotDate: '2026-06-13' },
        quality: { score: 75, source: 'prediction_registry', snapshotDate: '2026-06-13' },
        stability: { score: 65, source: 'prediction_registry', snapshotDate: '2026-06-13' },
        momentum: { score: 68, source: 'prediction_registry', snapshotDate: '2026-06-13' },
        value: { score: 66, source: 'prediction_registry', snapshotDate: '2026-06-13' },
        risk: { score: 30, source: 'prediction_registry', snapshotDate: '2026-06-13' },
      },
    },
  };
}

test.describe('Browser-local LLM connection chain', () => {
  test.beforeEach(async ({ page }) => {
    injectAuth(page);
    await stubAllApis(page);
  });

  test('1: Stock detail page mounts Research Explanation Panel', async ({ page }) => {
    await page.route('**/api/stockstory/RELIANCE**', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(stockStoryEnvelope()) });
    });

    await page.goto('/?page=stock&id=RELIANCE&horizon=30');
    await page.waitForLoadState('networkidle');

    // The explanation panel should be present (it contains the text "Research" or an ask-input)
    const panel = page.getByTestId('research-explanation-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });
  });

  test('2: Product-facing labels never expose internal runtime enums', async ({ page }) => {
    await page.route('**/api/stockstory/RELIANCE**', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(stockStoryEnvelope()) });
    });

    await page.goto('/?page=stock&id=RELIANCE&horizon=30');
    await page.waitForLoadState('networkidle');

    const pageText = await page.locator('body').innerText();

    // Internal enum names MUST NOT appear in the rendered page
    const forbidden = [/browser_local/i, /browser-local/i, /browser-edge/i,
      /user-local/i, /server-local/i, /deterministic/i,
      /web-llm/i, /mlc-ai/i, /qwen/i, /model.*runtime/i];
    for (const pattern of forbidden) {
      await expect(pageText).not.toMatch(pattern);
    }
  });

  test('3: Enhanced explanation badge appears on stock detail', async ({ page }) => {
    await page.route('**/api/stockstory/RELIANCE**', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(stockStoryEnvelope()) });
    });

    await page.goto('/?page=stock&id=RELIANCE&horizon=30');
    await page.waitForLoadState('networkidle');

    // The panel should show one of the product-facing runtime labels
    const panel = page.getByTestId('research-explanation-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Check that at least one product-facing label appears
    const labels = ['Enhanced explanation', 'Standard explanation', 'Enhanced research', 'On-device', 'Edge AI'];
    let found = false;
    for (const label of labels) {
      if (await panel.getByText(label, { exact: false }).isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
  });

  test('4: Deterministic fallback produces a "Standard explanation" badge', async ({ page }) => {
    // Override entitlements to pro but ensure device is NOT capable so we hit deterministic fallback
    await page.addInitScript(() => {
      window.localStorage.setItem('ss_entitlements_v1', JSON.stringify({
        tier: 'pro',
        entitlements: ['enhanced_research'],
        deviceCapable: false,
      }));
    });
    await page.route('**/api/stockstory/RELIANCE**', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(stockStoryEnvelope()) });
    });

    await page.goto('/?page=stock&id=RELIANCE&horizon=30');
    await page.waitForLoadState('networkidle');

    const panel = page.getByTestId('research-explanation-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });
    // The deterministic runtime shows "Standard explanation"
    await expect(panel.getByText(/Standard explanation/i)).toBeVisible({ timeout: 10000 });
  });

  test('5: Chat input is interactable in the explanation panel', async ({ page }) => {
    await page.route('**/api/stockstory/RELIANCE**', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(stockStoryEnvelope()) });
    });

    await page.goto('/?page=stock&id=RELIANCE&horizon=30');
    await page.waitForLoadState('networkidle');

    const panel = page.getByTestId('research-explanation-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });

    const input = panel.getByRole('textbox');
    await expect(input).toBeVisible({ timeout: 5000 });

    // Type a question and verify the input accepts it
    await input.fill('What are the key risks?');
    await expect(input).toHaveValue('What are the key risks?');
  });
});
