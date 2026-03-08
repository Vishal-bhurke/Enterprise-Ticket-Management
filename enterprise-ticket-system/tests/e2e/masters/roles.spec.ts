import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { rowExists, cleanupRow } from '../../helpers/supabase.helper';

test.describe('Roles Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/masters/roles');
    // Use 'load' not 'networkidle': Angular keeps realtime/polling connections open
    // indefinitely, so 'networkidle' never resolves and causes a 60s hang that
    // cascades into auth rate-limiting for subsequent test files.
    await page.waitForLoadState('load');
  });

  test('roles list page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 10000 });
  });

  test('roles list shows data or empty state', async ({ page }) => {
    // 'load' fires before Angular finishes fetching data — wait explicitly for content
    await page.locator('p-table, table, app-empty-state').first().waitFor({ timeout: 10000 });
    const hasContent =
      (await page.locator('p-table, table').first().isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('Add Role button visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Add Role")').first()).toBeVisible();
  });

  test('create role with valid name and slug', async ({ page }) => {
    await page.click('button:has-text("Add Role")');
    await expect(page.locator('.p-dialog-content').last()).toBeVisible({ timeout: 5000 });

    const uniqueName = `Test Role ${Date.now()}`;
    const uniqueSlug = `test_role_${Date.now()}`;
    // Fill name then press Tab so Angular's change detection processes the input
    await page.locator('.p-dialog-content').last().locator('input').first().fill(uniqueName);
    await page.keyboard.press('Tab');
    const slugInput = page.locator('.p-dialog-content').last().locator('input[placeholder*="slug"], p-dialog input[placeholder*="Slug"]').first();
    if (await slugInput.isVisible()) {
      await slugInput.fill(uniqueSlug);
      await page.keyboard.press('Tab');
    }
    // Wait for Angular to enable the Create button before clicking
    const createBtn = page.locator('.p-dialog').last().locator('button:has-text("Create")');
    await expect(createBtn).toBeEnabled({ timeout: 5000 });
    await createBtn.click();
    await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 8000 });
    await cleanupRow('roles', { name: uniqueName });
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    // Use 'load' not 'networkidle' — see beforeEach comment
    await page.waitForLoadState('load');
    expect(errors).toHaveLength(0);
  });
});
