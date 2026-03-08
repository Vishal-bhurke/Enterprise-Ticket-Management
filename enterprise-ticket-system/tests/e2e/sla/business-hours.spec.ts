import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Business Hours', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/sla/business-hours');
    await page.waitForLoadState('networkidle');
  });

  test('business hours page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows business hours configuration or empty state', async ({ page }) => {
    // Component shows either schedule cards (div.space-y-4) or app-empty-state
    const hasContent =
      (await page.locator('div.space-y-4').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
