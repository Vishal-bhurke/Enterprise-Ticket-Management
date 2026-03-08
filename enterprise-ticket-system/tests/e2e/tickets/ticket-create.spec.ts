import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';
import { cleanupRow } from '../../helpers/supabase.helper';

test.describe('Ticket Create', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/tickets/create');
    await page.waitForLoadState('networkidle');
  });

  test('create ticket form renders', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
    // Title input has placeholder "Briefly describe the issue..."
    await expect(page.locator('input[placeholder*="Briefly"], input[placeholder*="describe"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('submit without title shows validation error', async ({ page }) => {
    // Wait for form to be visible (not skeleton)
    const titleInput = page.locator('input[placeholder*="Briefly"]').first();
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    // Click and blur the title field to trigger touched validation state
    await titleInput.click();
    await titleInput.press('Tab');
    // Validation error "Subject is required" should appear
    await expect(page.locator('text=Subject is required')).toBeVisible({ timeout: 3000 });
    // Stay on page
    await expect(page).toHaveURL(/tickets\/create/);
  });

  test('successful ticket creation redirects to ticket detail', async ({ page }) => {
    const uniqueTitle = `Test Ticket E2E ${Date.now()}`;

    // Wait for form to be visible
    const titleInput = page.locator('input[placeholder*="Briefly"]').first();
    await expect(titleInput).toBeVisible({ timeout: 8000 });
    await titleInput.fill(uniqueTitle);

    // Select ticket type (required) — first dropdown
    const ticketTypeDropdown = page.locator('.p-dropdown').nth(0);
    if (await ticketTypeDropdown.isVisible()) {
      await ticketTypeDropdown.click();
      const firstItem = page.locator('[data-pc-section="option"], .p-dropdown-item, .p-select-option').first();
      await expect(firstItem).toBeVisible({ timeout: 5000 });
      await firstItem.click();
    }

    // Priority dropdown should already have a default selected (medium, level 3)

    // Wait for Submit button to be enabled (Angular form must become valid)
    const submitBtn = page.locator('button:has-text("Submit Ticket")').first();
    await expect(submitBtn).toBeEnabled({ timeout: 10000 });
    await submitBtn.click();

    // Should redirect to ticket detail
    await page.waitForURL(/tickets\/(?!create)/, { timeout: 15_000 });
    expect(page.url()).toMatch(/tickets\//);

    // Cleanup: delete created ticket from DB
    const ticketUrl = page.url();
    const ticketId = ticketUrl.split('/').pop();
    if (ticketId && ticketId !== 'create') {
      await cleanupRow('tickets', { id: ticketId });
    }
  });

  test('create ticket page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
