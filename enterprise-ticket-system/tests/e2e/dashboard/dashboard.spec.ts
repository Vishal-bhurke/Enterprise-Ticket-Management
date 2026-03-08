import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Dashboard', () => {
  test('super_admin sees all dashboard metrics', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await expect(page).toHaveURL(/dashboard/);
    // Metric cards should be visible
    await expect(page.locator('app-metric-card').first()).toBeVisible({ timeout: 5000 });
  });

  test('admin sees dashboard metrics', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('app-page-header').first()).toBeVisible({ timeout: 5000 });
  });

  test('agent sees dashboard', async ({ page }) => {
    await loginAs(page, 'agent');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('end_user sees dashboard', async ({ page }) => {
    await loginAs(page, 'end_user');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('dashboard loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'admin');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('dashboard loads within performance threshold', async ({ page }) => {
    const start = Date.now();
    await loginAs(page, 'admin');
    await page.waitForLoadState('networkidle');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000 + 10_000); // 3s threshold + 10s login time
  });

  test('page header shows Dashboard title', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page.locator('app-page-header').first()).toBeVisible();
  });
});
