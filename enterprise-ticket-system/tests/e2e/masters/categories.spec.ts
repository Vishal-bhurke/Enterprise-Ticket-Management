import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { cleanupRow } from '../../helpers/supabase.helper';

test.describe('Categories Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/masters/categories');
    await page.waitForLoadState('networkidle');
  });

  test('categories list page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows table or empty state', async ({ page }) => {
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('create category', async ({ page }) => {
    await page.click('button:has-text("Add Category")');
    const dialogContent = page.locator('.p-dialog-content').last();
    await expect(dialogContent).toBeVisible({ timeout: 5000 });
    const ts = Date.now();
    const uniqueName = `Category E2E ${ts}`;
    const uniqueCode = `CE${String(ts).slice(-5)}`;
    await dialogContent.locator('input').nth(0).fill(uniqueName);  // Name field
    await dialogContent.locator('input').nth(1).fill(uniqueCode);  // Code field
    await page.locator('.p-dialog').last().locator('button:has-text("Create")').click();
    await expect(page.locator('.p-toast-message').first()).toBeVisible({ timeout: 5000 });
    await cleanupRow('categories', { name: uniqueName });
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
