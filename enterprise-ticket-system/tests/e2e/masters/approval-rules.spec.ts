import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Approval Rules Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/masters/approval-rules');
    await page.waitForLoadState('networkidle');
  });

  test('approval rules page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows table or empty state', async ({ page }) => {
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('Add Approval Rule button visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Add")').first()).toBeVisible();
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
