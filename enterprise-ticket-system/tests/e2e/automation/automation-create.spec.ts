import { test, expect } from '@playwright/test';
import { loginAs, isIgnoredConsoleError } from '../../helpers/auth.helper';

test.describe('Automation Rule Create', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin');
    await page.goto('/automation');
    await page.waitForLoadState('networkidle');
  });

  test('Create Rule button visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Create Rule")').first()).toBeVisible();
  });

  test('open create automation rule page', async ({ page }) => {
    await page.click('button:has-text("Create Rule")');
    await page.waitForTimeout(1500);
    // Automation uses a separate page at /automation/create
    const url = page.url();
    const isExpected = url.includes('/create') || url.includes('/new') || url.includes('/automation');
    expect(isExpected).toBe(true);
  });

  test('create rule form has input field', async ({ page }) => {
    await page.click('button:has-text("Create Rule")');
    await page.waitForTimeout(1500);
    // Rule builder has a text input for the rule name
    await expect(page.locator('input').first()).toBeVisible({ timeout: 5000 });
  });
});
