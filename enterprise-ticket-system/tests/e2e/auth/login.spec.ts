import { test, expect } from '@playwright/test';
import { loginAs, isIgnoredConsoleError } from '../../helpers/auth.helper';

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
  });

  test('valid super_admin login redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'super_admin');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('valid admin login redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('valid agent login redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'agent');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('valid end_user login redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'end_user');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('invalid credentials shows error message and stays on login', async ({ page }) => {
    await page.fill('input#email', 'wrong@example.com');
    await page.fill('input#password', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    // Login component shows an inline .bg-red-50.border-red-200 div on bad credentials
    await expect(
      page.locator('.bg-red-50.border-red-200')
    ).toBeVisible({ timeout: 8000 });

    // Still on login page
    await expect(page).toHaveURL(/auth\/login/);
  });

  test('empty email shows angular validation error', async ({ page }) => {
    await page.fill('input#email', '');
    await page.fill('input#password', 'SomePassword123!');
    await page.click('button[type="submit"]');
    // Angular validator shows inline error — stay on login
    await expect(page).toHaveURL(/auth\/login/);
    await expect(page.locator('.text-red-600').first()).toBeVisible({ timeout: 3000 });
  });

  test('empty password shows angular validation error', async ({ page }) => {
    await page.fill('input#email', 'test@example.com');
    await page.fill('input#password', '');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/auth\/login/);
    await expect(page.locator('.text-red-600').first()).toBeVisible({ timeout: 3000 });
  });

  test('login page loads without critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) {
        errors.push(msg.text());
      }
    });
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
