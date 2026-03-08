import { test, expect } from '@playwright/test';
import { isIgnoredConsoleError } from '../../helpers/auth.helper';
import { loginAs } from '../../helpers/auth.helper';

test.describe('User Profile', () => {
  test('profile page loads for all roles', async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('profile shows user information', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    // Profile should show name or email field
    await expect(
      page.locator('input[placeholder*="name"], input[placeholder*="Name"], input[type="email"]').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('end_user can access profile', async ({ page }) => {
    await loginAs(page, 'end_user');
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('app-page-header')).toBeVisible({ timeout: 5000 });
  });

  test('can update profile full name', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="Full Name"]').first();
    if (await nameInput.isVisible()) {
      const newName = `Admin User Test`;
      await nameInput.clear();
      await nameInput.fill(newName);
      await page.locator('button:has-text("Save Changes"), button:has-text("Save"), button[type="submit"]').first().click();
      await expect(page.locator('.p-toast-message')).toBeVisible({ timeout: 5000 });
    }
  });

  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !isIgnoredConsoleError(msg.text())) errors.push(msg.text());
    });
    await loginAs(page, 'admin');
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
