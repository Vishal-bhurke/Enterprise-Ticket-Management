import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Notification Templates', () => {
  test('notification templates page loads for admin', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/notifications/templates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('agent can view notification templates page', async ({ page }) => {
    // No route guard on this page — agent can view but admin controls are hidden
    await loginAs(page, 'agent');
    await page.goto('/notifications/templates');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows templates or empty state', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/notifications/templates');
    await page.waitForLoadState('networkidle');
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'admin');
    await page.goto('/notifications/templates');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
