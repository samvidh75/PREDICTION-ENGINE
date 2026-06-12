import { expect, test } from '@playwright/test';

function restoreBrowserSession(): void {
  window.localStorage.setItem('ss_auth_session_v1', JSON.stringify({
    status: 'authenticated',
    uid: 'browser-user',
    createdAtMs: Date.now(),
  }));
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(restoreBrowserSession);
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
});

test('authenticated rankings route renders an intentional screen', async ({ page }) => {
  await page.goto('/?page=rankings');
  await expect(page.getByRole('heading', { name: 'Stock Rankings' })).toBeVisible();
  await expect(page.getByText('Rankings are unavailable from the prediction registry right now. No sample rankings are shown.')).toBeVisible();
});

test('desktop sidebar exposes grouped product workflows', async ({ page }) => {
  await page.goto('/?page=dashboard');
  const sidebar = page.locator('aside');

  await expect(sidebar.getByText('Market', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('Research', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('Portfolio', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('System', { exact: true })).toBeVisible();

  await sidebar.getByRole('button', { name: 'Daily feed' }).click();
  await expect(page).toHaveURL(/page=daily-feed/);

  await sidebar.getByRole('button', { name: 'Portfolio doctor' }).click();
  await expect(page).toHaveURL(/page=portfolio-doctor/);

  await sidebar.getByRole('button', { name: 'Trust centre' }).click();
  await expect(page).toHaveURL(/page=trust/);
  await expect(page.getByRole('heading', { name: /Trust Centre/i })).toBeVisible();
});
