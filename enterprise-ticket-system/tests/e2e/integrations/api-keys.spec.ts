import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('API Keys', () => {
  test('super_admin can access API keys', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/integrations/api-keys');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('admin is denied API keys', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/integrations/api-keys');
    await expect(page).toHaveURL(/unauthorized/, { timeout: 15000 });
  });

  test('shows API key list or empty state', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/integrations/api-keys');
    await page.waitForLoadState('networkidle');
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('Generate API Key button visible', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/integrations/api-keys');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button:has-text("Generate"), button:has-text("Create API Key")').first()).toBeVisible();
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'super_admin');
    await page.goto('/integrations/api-keys');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
