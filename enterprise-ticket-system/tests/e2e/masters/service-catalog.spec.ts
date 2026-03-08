import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { cleanupRow } from '../../helpers/supabase.helper';

test.describe('Service Catalog Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/masters/service-catalog');
    await page.waitForLoadState('networkidle');
  });

  test('service catalog page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows table or empty state', async ({ page }) => {
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('create service catalog item', async ({ page }) => {
    await page.click('button:has-text("Add Service")');
    await expect(page.locator('.p-dialog-content').last()).toBeVisible({ timeout: 5000 });
    const uniqueName = `Service E2E ${Date.now()}`;
    // Fill name and press Tab so Angular's ngModel processes the input event
    await page.locator('.p-dialog-content').last().locator('input').first().fill(uniqueName);
    await page.keyboard.press('Tab');
    // Wait for Create button to be enabled (Angular must detect form.name change)
    const createBtn = page.locator('.p-dialog').last().locator('button:has-text("Create")');
    await expect(createBtn).toBeEnabled({ timeout: 5000 });
    await createBtn.click();
    await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 8000 });
    await cleanupRow('service_catalog', { name: uniqueName });
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
