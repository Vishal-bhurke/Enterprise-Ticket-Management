import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { cleanupRow } from '../../helpers/supabase.helper';

test.describe('Departments Master', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/masters/departments');
    await page.waitForLoadState('networkidle');
  });

  test('departments list page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows table or empty state', async ({ page }) => {
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('create department', async ({ page }) => {
    await page.click('button:has-text("Add Department")');
    const dialogContent = page.locator('.p-dialog-content').last();
    await expect(dialogContent).toBeVisible({ timeout: 5000 });
    const ts = Date.now();
    const uniqueName = `Dept E2E ${ts}`;
    const uniqueCode = `DE${String(ts).slice(-4)}`;
    await dialogContent.locator('input').nth(0).fill(uniqueName);  // Name field
    await dialogContent.locator('input').nth(1).fill(uniqueCode);  // Code field (auto-uppercased)
    await page.locator('.p-dialog').last().locator('button:has-text("Create")').click();
    await expect(page.locator('.p-toast-message').first()).toBeVisible({ timeout: 5000 });
    await cleanupRow('departments', { name: uniqueName });
  });

  test('edit department', async ({ page }) => {
    const editBtn = page.locator('button[icon="pi pi-pencil"], p-button[icon="pi pi-pencil"] button').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await expect(page.locator('.p-dialog-content').last()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('.p-dialog-content').last().locator('input').first()).not.toHaveValue('');
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
