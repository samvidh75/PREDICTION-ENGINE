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

test('rankings route redirects to scanner for authenticated users', async ({ page }) => {
  await page.goto('/?page=rankings');
  await expect(page.getByRole('heading', { name: 'AI Scanner' })).toBeVisible();
});

test('desktop sidebar exposes grouped product workflows', async ({ page }) => {
  await page.goto('/?page=dashboard');
  const sidebar = page.locator('aside');

  await expect(sidebar.getByText('Market', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('Research', { exact: true })).toBeVisible();
  await expect(sidebar.getByText('Portfolio', { exact: true }).first()).toBeVisible();
  await expect(sidebar.getByText('System', { exact: true })).toBeVisible();

  await sidebar.getByRole('button', { name: 'Daily feed' }).click();
  await expect(page).toHaveURL(/page=daily-feed/);

  await sidebar.getByRole('button', { name: 'Portfolio doctor' }).click();
  await expect(page).toHaveURL(/page=portfolio-doctor/);
  await expect(page.getByText('No Portfolio Data', { exact: true })).toBeVisible();

  await sidebar.getByRole('button', { name: 'Trust centre' }).click();
  await expect(page).toHaveURL(/page=trust/);
  await expect(page.getByRole('heading', { name: /Trust Centre/i })).toBeVisible();
});
