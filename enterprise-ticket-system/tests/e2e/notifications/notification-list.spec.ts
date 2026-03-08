import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Notification List', () => {
  test('notifications page loads for all roles', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('end_user can access notifications', async ({ page }) => {
    await loginAs(page, 'end_user');
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows notification list or empty state', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    const hasContent =
      (await page.locator('p-table, [class*="notification"]').first().isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'admin');
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
