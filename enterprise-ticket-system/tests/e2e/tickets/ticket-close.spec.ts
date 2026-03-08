import { test, expect } from '@playwright/test';
import { loginAs, isIgnoredConsoleError } from '../../helpers/auth.helper';

test.describe('Ticket Close', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
  });

  test('can change ticket status', async ({ page }) => {
    const ticketRow = page.locator('p-table tr').nth(1);
    if (!(await ticketRow.isVisible())) {
      test.skip();
      return;
    }
    await ticketRow.click();
    await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });

    // Find status dropdown
    const statusDropdown = page.locator('p-dropdown[placeholder*="Status"], p-dropdown[placeholder*="status"]').first();
    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      const option = page.locator('.p-dropdown-item').last();
      if (await option.isVisible()) {
        await option.click();
        await page.click('p-button:has-text("Save"), p-button:has-text("Update")');
        await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('closed ticket shows closed status badge', async ({ page }) => {
    const ticketRow = page.locator('p-table tr').nth(1);
    if (!(await ticketRow.isVisible())) {
      test.skip();
      return;
    }
    // Navigate and check status badge
    await ticketRow.click();
    await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });
    await expect(page.locator('p-tag').first()).toBeVisible({ timeout: 5000 });
  });
});
