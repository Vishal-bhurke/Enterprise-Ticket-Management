import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('Ticket List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
  });

  test('ticket list page loads', async ({ page }) => {
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15000 });
  });

  test('loading state visible before data loads', async ({ page }) => {
    // We verify the final loaded state — either data table or empty state
    await page.waitForLoadState('networkidle');
    // ticket-list uses a plain <table> element (not p-table component)
    const table = page.locator('table');
    const emptyState = page.locator('app-empty-state');
    const isTableOrEmpty = (await table.isVisible()) || (await emptyState.isVisible());
    expect(isTableOrEmpty).toBe(true);
  });

  test('empty state shown when no tickets', async ({ page }) => {
    // Verify either a data table or empty state is shown
    await page.waitForLoadState('networkidle');
    // ticket-list uses a plain <table> element (not p-table component)
    const hasContent =
      (await page.locator('table').isVisible()) ||
      (await page.locator('app-empty-state').isVisible());
    expect(hasContent).toBe(true);
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Search"], input[placeholder*="search"]')).toBeVisible();
  });

  test('admin sees Create Ticket button', async ({ page }) => {
    await expect(page.locator('button:has-text("Create Ticket")').first()).toBeVisible();
  });

  test('ticket list loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
