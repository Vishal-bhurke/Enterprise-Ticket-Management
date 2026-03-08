import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Escalation Matrix Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/masters/escalation-matrix');
    await page.waitForLoadState('networkidle');
  });

  test('escalation matrix page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows list or empty state', async ({ page }) => {
    // Escalation matrix uses a custom card list (div.divide-y), not p-table
    const hasContent =
      (await page.locator('.divide-y').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('Add Escalation Rule button visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Add Matrix")').first()).toBeVisible();
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
