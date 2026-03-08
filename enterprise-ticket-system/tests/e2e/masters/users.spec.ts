import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { rowExists, cleanupRow } from '../../helpers/supabase.helper';

test.describe('Users Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/masters/users');
    await page.waitForLoadState('networkidle');
  });

  test('user list page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('loading state and table or empty state visible', async ({ page }) => {
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('Add User button visible for admin', async ({ page }) => {
    await expect(page.locator('button:has-text("Add User")').first()).toBeVisible();
  });

  test('open Add User dialog', async ({ page }) => {
    await page.click('button:has-text("Add User")');
    await expect(page.locator('.p-dialog-content').last()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.p-dialog-content').last().locator('input[placeholder*="name"], p-dialog input[placeholder*="Name"]').first()).toBeVisible();
  });

  test('submit empty form shows validation error', async ({ page }) => {
    await page.click('button:has-text("Add User")');
    await expect(page.locator('.p-dialog-content').last()).toBeVisible({ timeout: 5000 });
    // Create button is disabled when required fields are empty (Angular form validation)
    await expect(page.locator('.p-dialog').last().locator('button:has-text("Create")')).toBeDisabled();
  });

  test('create user with valid data', async ({ page }) => {
    await page.click('button:has-text("Add User")');
    await expect(page.locator('.p-dialog-content').last()).toBeVisible({ timeout: 5000 });

    const uniqueEmail = `testuser_${Date.now()}@test.local`;
    await page.locator('.p-dialog-content').last().locator('input[placeholder*="name"], input[placeholder*="Name"]').first().fill('Test User E2E');
    await page.locator('.p-dialog-content').last().locator('input[type="email"]').fill(uniqueEmail);
    await page.locator('.p-dialog').last().locator('button:has-text("Create")').click();

    await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 10000 });
    // Cleanup — admin client deletes both auth user and profile
    const exists = await rowExists('profiles', { email: uniqueEmail });
    if (exists) {
      await cleanupRow('profiles', { email: uniqueEmail });
    }
  });

  test('edit user opens dialog with populated data', async ({ page }) => {
    const editBtn = page.locator('p-button[icon="pi pi-pencil"] button').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('.p-dialog-content').last()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.p-dialog-content').last().locator('input[type="email"]')).not.toHaveValue('');
    } else {
      test.skip();
    }
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
