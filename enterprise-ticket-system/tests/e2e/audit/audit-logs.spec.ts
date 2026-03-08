import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Audit Logs', () => {
  test('audit logs page loads for admin', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows audit log entries or empty state', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('agent is denied audit logs', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/audit');
    await expect(page).toHaveURL(/unauthorized/, { timeout: 15000 });
  });

  test('search or filter is available', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[placeholder*="Search"], input[placeholder*="Filter"], p-dropdown').first()).toBeVisible();
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'admin');
    await page.goto('/audit');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
