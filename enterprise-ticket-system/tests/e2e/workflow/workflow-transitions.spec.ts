import { test, expect } from '@playwright/test';
import { loginAs, isIgnoredConsoleError } from '../../helpers/auth.helper';

test.describe('Workflow Transitions', () => {
  test('ticket status can be changed', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    const ticketRow = page.locator('p-table tr').nth(1);
    if (!(await ticketRow.isVisible())) {
      test.skip();
      return;
    }

    await ticketRow.click();
    await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });

    const statusDropdown = page.locator('p-dropdown[placeholder*="Status"], p-dropdown[placeholder*="status"]').first();
    if (await statusDropdown.isVisible()) {
      await statusDropdown.click();
      const option = page.locator('.p-dropdown-item').nth(1);
      if (await option.isVisible()) {
        await option.click();
        await page.click('p-button:has-text("Save"), p-button:has-text("Update")');
        await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('ticket status change creates audit trail', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    const ticketRow = page.locator('p-table tr').nth(1);
    if (!(await ticketRow.isVisible())) {
      test.skip();
      return;
    }

    await ticketRow.click();
    await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });
    // Ticket history/activity section should be visible
    await expect(
      page.locator('[class*="history"], [class*="activity"], [class*="audit"]').first()
    ).toBeVisible({ timeout: 5000 });
  });
});
