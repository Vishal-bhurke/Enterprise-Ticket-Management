import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Ticket Detail', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    // Navigate to ticket list and click first ticket if available
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
  });

  test('ticket detail page loads when clicking a ticket', async ({ page }) => {
    const ticketLink = page.locator('p-table td a, p-table tr[ng-reflect-data] td:first-child, .ticket-link').first();
    if (await ticketLink.isVisible()) {
      await ticketLink.click();
      await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });
      await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
    } else {
      // No tickets exist yet — skip
      test.skip();
    }
  });

  test('ticket detail shows comment input', async ({ page }) => {
    const ticketLink = page.locator('p-table td a, p-table tr td').first();
    if (await ticketLink.isVisible()) {
      await ticketLink.click();
      await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });
      await expect(page.locator('textarea, input[placeholder*="comment"]').first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('ticket detail loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });

    const ticketLink = page.locator('p-table td a, p-table tr td').first();
    if (await ticketLink.isVisible()) {
      await ticketLink.click();
      await page.waitForURL(/tickets\/[^/]+$/, { timeout: 5000 });
      await page.waitForLoadState('networkidle');
    }
    expect(errors).toHaveLength(0);
  });
});
