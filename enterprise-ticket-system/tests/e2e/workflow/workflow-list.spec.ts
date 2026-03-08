import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Workflow List', () => {
  test('super_admin can access workflow page', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/workflow');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('admin is denied workflow page', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/workflow');
    await expect(page).toHaveURL(/unauthorized/, { timeout: 15000 });
  });

  test('workflow page shows content or empty state', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/workflow');
    await page.waitForLoadState('networkidle');
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible()) ||
      (await page.locator('[class*="workflow"]').isVisible());
    expect(hasContent).toBe(true);
  });

  test('workflow page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'super_admin');
    await page.goto('/workflow');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
