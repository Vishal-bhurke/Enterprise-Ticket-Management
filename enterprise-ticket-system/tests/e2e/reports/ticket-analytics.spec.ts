import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Ticket Analytics Report', () => {
  test('ticket analytics page loads for admin', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows metrics or empty state', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    const hasContent =
      (await page.locator('[class*="metric"], [class*="card"], [class*="chart"], canvas').first().isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('agent is denied access', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/reports');
    await expect(page).toHaveURL(/unauthorized/, { timeout: 15000 });
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'admin');
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
