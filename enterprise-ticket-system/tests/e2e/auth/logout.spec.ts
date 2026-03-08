import { test, expect } from '@playwright/test';
import { loginAs, isIgnoredConsoleError } from '../../helpers/auth.helper';
import { TEST_USERS } from '../../helpers/test-data';
import * as path from 'path';

const AUTH_DIR = path.join(__dirname, '../../.auth');
const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:4200';

async function clickSignOut(page: import('@playwright/test').Page): Promise<void> {
  // Try direct "Sign Out" text first (in case menu is already open)
  const directBtn = page.locator('text=Sign Out').first();
  if (await directBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await directBtn.click();
    return;
  }
  // Click the user avatar/chevron to open the p-menu popup
  const userAvatar = page.locator('div.cursor-pointer:has(i.pi-chevron-down)').first();
  await userAvatar.click();
  await page.locator('text=Sign Out').first().click();
}

/**
 * After logout tests, two roles (admin, end_user) have their Supabase JWTs
 * revoked server-side by signOut().  Refresh all three affected sessions so
 * subsequent test files (especially the 144-check role-access matrix) can use
 * the fast localStorage-injection path instead of triggering rate-limited UI logins.
 */
test.afterAll(async ({ browser }) => {
  const ROLES_TO_REFRESH = ['admin', 'agent', 'end_user'] as const;

  for (const role of ROLES_TO_REFRESH) {
    const user = TEST_USERS[role];
    const statePath = path.join(AUTH_DIR, `${role}.json`);
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    try {
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input#email', user.email);
      await page.fill('input#password', user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 30_000 });
      await context.storageState({ path: statePath });
      console.log(`[logout.afterAll] Refreshed session for ${role}`);
    } catch (err) {
      console.warn(`[logout.afterAll] Failed to refresh session for ${role}:`, err);
    } finally {
      await context.close();
    }
  }
});

test.describe('Logout', () => {
  test('logout redirects to login page', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/dashboard/);

    await clickSignOut(page);
    // Auth guard is async (DB round-trip) — give up to 15s for redirect
    await expect(page).toHaveURL(/auth\/login/, { timeout: 15000 });
  });

  test('after logout, protected route redirects to login', async ({ page }) => {
    await loginAs(page, 'agent');

    // Logout via storage clear (simulate session clear)
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate to protected route
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
  });

  test('after logout, dashboard is no longer accessible', async ({ page }) => {
    await loginAs(page, 'end_user');

    await clickSignOut(page);
    await page.waitForURL(/auth\/login/, { timeout: 15000 });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/auth\/login/, { timeout: 10000 });
  });
});
