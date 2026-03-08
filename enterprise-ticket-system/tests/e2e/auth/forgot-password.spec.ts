import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';

test.describe('Forgot Password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
  });

  test('forgot password link is visible on login page', async ({ page }) => {
    await expect(page.locator('a:has-text("Forgot"), a[href*="forgot"]').first()).toBeVisible();
  });

  test('clicking forgot password navigates to forgot password page', async ({ page }) => {
    await page.locator('a:has-text("Forgot"), a[href*="forgot"]').first().click();
    await expect(page).toHaveURL(/forgot/, { timeout: 5000 });
  });

  test('forgot password with valid email shows success message', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.fill('input[type="email"]', 'admin@test.local');
    await page.click('button[type="submit"]');
    // Success: shows "check your email" message (sets emailSent = true, no toast)
    await expect(
      page.locator('text=check your email').or(page.locator('text=reset link')).or(page.locator('text=We sent')).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('forgot password with empty email does not submit', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.click('button[type="submit"], p-button button');
    // Should still be on forgot password page
    await expect(page).toHaveURL(/forgot/, { timeout: 3000 });
  });

  test('forgot password page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await page.goto('/auth/forgot-password');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
