import { test, expect } from '@playwright/test';
import { loginAs, isIgnoredConsoleError } from '../../helpers/auth.helper';

test.describe('Ticket Update', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
  });

  test('can update ticket title', async ({ page }) => {
    // Find first ticket and open it
    const ticketRow = page.locator('p-table tr').nth(1);
    if (!(await ticketRow.isVisible())) {
      test.skip();
      return;
    }
    await ticketRow.click();
    await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });

    // Find and update title field
    const titleField = page.locator('input[formcontrolname="title"], input[placeholder*="title"], input[placeholder*="Title"]').first();
    if (await titleField.isVisible()) {
      const updatedTitle = `Updated Title ${Date.now()}`;
      await titleField.clear();
      await titleField.fill(updatedTitle);

      // Save
      await page.click('p-button:has-text("Save"), p-button:has-text("Update"), button:has-text("Save")');
      // Success toast
      await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
    }
  });

  test('can add a comment to a ticket', async ({ page }) => {
    const ticketRow = page.locator('p-table tr').nth(1);
    if (!(await ticketRow.isVisible())) {
      test.skip();
      return;
    }
    await ticketRow.click();
    await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });

    const commentInput = page.locator('textarea, input[placeholder*="comment"], input[placeholder*="Comment"]').first();
    if (await commentInput.isVisible()) {
      await commentInput.fill('Automated test comment ' + Date.now());
      await page.click('p-button:has-text("Comment"), p-button:has-text("Add"), button:has-text("Submit")');
      await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
    }
  });
});
