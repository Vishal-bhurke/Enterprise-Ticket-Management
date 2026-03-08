import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { cleanupRow } from '../../helpers/supabase.helper';

test.describe('Webhooks', () => {
  test('super_admin can access webhooks', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('admin is denied webhooks', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/integrations');
    await expect(page).toHaveURL(/unauthorized/, { timeout: 15000 });
  });

  test('shows webhook list or empty state', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    const hasContent =
      (await page.locator('p-table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('create webhook', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Add Webhook")');
    const dialogContent = page.locator('.p-dialog-content').last();
    await expect(dialogContent).toBeVisible({ timeout: 5000 });
    const uniqueName = `Webhook E2E ${Date.now()}`;
    // Name is nth(0) input, URL is nth(1) input (placeholder="e.g. Slack Notifications")
    await dialogContent.locator('input[type="text"], input:not([type="checkbox"])').nth(0).fill(uniqueName);
    await dialogContent.locator('input[type="text"], input:not([type="checkbox"])').nth(1).fill('https://webhook.site/test-endpoint');
    // Select at least one event (required: !form.events.length)
    await dialogContent.locator('input[type="checkbox"]').first().click();
    await page.locator('.p-dialog').last().locator('button:has-text("Create")').click();
    await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
    await cleanupRow('webhook_configs', { name: uniqueName });
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'super_admin');
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
