import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { cleanupRow } from '../../helpers/supabase.helper';

test.describe('SLA Policies', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/sla');
    await page.waitForLoadState('networkidle');
  });

  test('SLA policies page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('shows table or empty state', async ({ page }) => {
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('Add SLA Policy button visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Add Policy")').first()).toBeVisible();
  });

  test('create SLA policy', async ({ page }) => {
    await page.click('button:has-text("Add Policy")');
    const dialogContent = page.locator('.p-dialog-content').last();
    await expect(dialogContent).toBeVisible({ timeout: 5000 });
    const uniqueName = `SLA Policy E2E ${Date.now()}`;
    // Name input placeholder is "e.g. Critical Priority SLA" — use first input in dialog
    await dialogContent.locator('input').first().fill(uniqueName);
    await page.locator('.p-dialog').last().locator('button:has-text("Create")').click();
    await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
    await cleanupRow('sla_policies', { name: uniqueName });
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
