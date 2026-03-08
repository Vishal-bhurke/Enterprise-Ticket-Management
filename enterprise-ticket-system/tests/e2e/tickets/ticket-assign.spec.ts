import { test, expect } from '@playwright/test';
import { loginAs, isIgnoredConsoleError } from '../../helpers/auth.helper';

test.describe('Ticket Assignment', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
  });

  test('can assign ticket to agent', async ({ page }) => {
    const ticketRow = page.locator('p-table tr').nth(1);
    if (!(await ticketRow.isVisible())) {
      test.skip();
      return;
    }
    await ticketRow.click();
    await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });

    // Find assignee dropdown
    const assigneeDropdown = page.locator('p-dropdown[placeholder*="Assign"], p-dropdown[placeholder*="agent"]').first();
    if (await assigneeDropdown.isVisible()) {
      await assigneeDropdown.click();
      const option = page.locator('.p-dropdown-item').first();
      if (await option.isVisible()) {
        await option.click();
        await page.click('p-button:has-text("Save"), p-button:has-text("Update")');
        await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
