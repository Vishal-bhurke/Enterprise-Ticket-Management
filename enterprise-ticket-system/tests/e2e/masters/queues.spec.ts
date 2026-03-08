import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { cleanupRow } from '../../helpers/supabase.helper';

test.describe('Queues Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/masters/queues');
    await page.waitForLoadState('networkidle');
  });

  test('queues list page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows table or empty state', async ({ page }) => {
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('create queue', async ({ page }) => {
    await page.click('button:has-text("Add Queue")');
    await expect(page.locator('.p-dialog-content').last()).toBeVisible({ timeout: 5000 });
    const uniqueName = `Queue E2E ${Date.now()}`;
    await page.locator('.p-dialog-content').last().locator('input').first().fill(uniqueName);
    await page.locator('.p-dialog').last().locator('button:has-text("Create")').click();
    await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
    await cleanupRow('queues', { name: uniqueName });
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
