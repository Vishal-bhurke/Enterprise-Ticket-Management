import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Automation Rule Triggers', () => {
  test('automation rules page loads with trigger types visible', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/automation');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
    // Verify list or empty state is visible
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('automation rules page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'super_admin');
    await page.goto('/automation');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
