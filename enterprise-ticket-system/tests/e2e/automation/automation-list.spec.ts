import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Automation Rules List', () => {
  test('super_admin can access automation rules', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/automation');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('admin is denied automation rules', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/automation');
    await expect(page).toHaveURL(/unauthorized/, { timeout: 15000 });
  });

  test('automation list shows table or empty state', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/automation');
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
    await loginAs(page, 'super_admin');
    await page.goto('/automation');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
