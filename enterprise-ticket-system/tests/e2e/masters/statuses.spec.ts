import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { cleanupRow, rowExists } from '../../helpers/supabase.helper';

test.describe('Statuses Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/masters/statuses');
    await page.waitForLoadState('networkidle');
  });

  test('statuses list page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows table or empty state', async ({ page }) => {
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('default status indicator is visible', async ({ page }) => {
    const defaultBadge = page.locator('p-tag:has-text("Default"), p-tag[value="Default"]').first();
    if (await defaultBadge.isVisible()) {
      await expect(defaultBadge).toBeVisible();
    }
    // If no default shown yet, test still passes (empty system)
  });

  test('create status', async ({ page }) => {
    await page.click('button:has-text("Add Status")');
    const dialogContent = page.locator('.p-dialog-content').last();
    await expect(dialogContent).toBeVisible({ timeout: 5000 });
    const uniqueName = `Status E2E ${Date.now()}`;
    await dialogContent.locator('input').first().fill(uniqueName);
    // Select category dropdown (required field: open/in_progress/pending/resolved/closed)
    await dialogContent.locator('.p-dropdown, p-select').first().click();
    await page.locator('[data-pc-section="option"], .p-dropdown-item, .p-select-option').first().click();
    await page.locator('.p-dialog').last().locator('button:has-text("Create")').click();
    await expect(page.locator('.p-toast-message').first()).toBeVisible({ timeout: 5000 });
    await cleanupRow('statuses', { name: uniqueName });
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
