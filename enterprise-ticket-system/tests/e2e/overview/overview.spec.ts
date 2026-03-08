import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('System Overview', () => {
  test('super_admin can access overview', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/overview');
    // Use 'load' not 'networkidle': Angular keeps realtime/polling connections open
    // indefinitely, so 'networkidle' never resolves and causes a 60s hang.
    await page.waitForLoadState('load');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 10000 });
  });

  test('admin is denied overview', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/overview');
    await expect(page).toHaveURL(/unauthorized/, { timeout: 15000 });
  });

  test('agent is denied overview', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/overview');
    await expect(page).toHaveURL(/unauthorized/, { timeout: 15000 });
  });

  test('overview shows system metrics', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/overview');
    await page.waitForLoadState('load');
    // Wait for Angular to finish fetching data
    await page.locator('app-metric-card, [class*="metric"], [class*="card"], [class*="stat"], app-empty-state').first().waitFor({ timeout: 10000 }).catch(() => {});
    const hasContent =
      (await page.locator('app-metric-card').first().isVisible()) ||
      (await page.locator('[class*="metric"], [class*="card"], [class*="stat"]').first().isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('overview page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'super_admin');
    await page.goto('/overview');
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });
});
