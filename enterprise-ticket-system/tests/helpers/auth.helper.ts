import { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { TEST_USERS, RoleName } from './test-data';

const AUTH_DIR = path.join(__dirname, '../.auth');

/**
 * Known browser console errors that are benign and should be ignored in tests.
 * NavigatorLockAcquireTimeoutError: Supabase admin client competing for auth lock in dev mode.
 * Failed to load resource (net::ERR_*): Network-level errors from the browser.
 * server responded with a status of 4: Supabase REST 4xx (RLS blocks, handled gracefully by app).
 * Failed to fetch: Transient Supabase connectivity blips in dev/test environments.
 */
export const IGNORED_CONSOLE_ERRORS = [
  'NavigatorLockAcquireTimeoutError',
  'favicon',
  'Failed to load resource: net::ERR_',
  'Failed to load resource: the server responded with a status of 4',
  'Failed to fetch',
];

export function isIgnoredConsoleError(msg: string): boolean {
  return IGNORED_CONSOLE_ERRORS.some(ignored => msg.includes(ignored));
}

/**
 * Log in as a specific role and wait for /dashboard to load.
 *
 * Strategy (fast path): If globalSetup saved a session token to .auth/{role}.json,
 * inject it directly into localStorage to avoid UI form submission and Supabase
 * auth rate limiting. Falls back to full UI login if the session file is missing.
 *
 * Fast path: ~500ms per test  |  Fallback: ~3-5s per test
 */
export async function loginAs(page: Page, role: RoleName): Promise<void> {
  const statePath = path.join(AUTH_DIR, `${role}.json`);

  if (fs.existsSync(statePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      // Playwright storageState format: { origins: [{ origin, localStorage: [{name, value}] }] }
      const lsItems: { name: string; value: string }[] = state.origins?.[0]?.localStorage ?? [];

      if (lsItems.length > 0) {
        // Navigate to app root to establish domain context for localStorage
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Inject ALL saved localStorage items (Supabase JWT + ets_session_* UUID)
        for (const item of lsItems) {
          await page.evaluate(
            ({ key, value }) => localStorage.setItem(key, value),
            { key: item.name, value: item.value }
          );
        }

        // Navigate to dashboard — Angular reads localStorage on init, session_token check passes
        await page.goto('/dashboard');

        try {
          // Race: sidebar appears (auth valid) vs redirect to /auth (session invalid).
          // waitForURL alone resolves too early — before Angular's async validateSessionToken()
          // DB round-trip completes. We must wait for the shell to actually render.
          const outcome = await Promise.race([
            page.waitForSelector('app-sidebar', { timeout: 10_000 }).then(() => 'valid' as const),
            page.waitForURL('**/auth/**', { timeout: 10_000 }).then(() => 'invalid' as const),
          ]);
          if (outcome === 'valid') {
            return; // Fast path succeeded — Angular shell rendered, session is confirmed valid
          }
          // outcome === 'invalid': redirected to login — fall through to UI login
        } catch {
          // Both timed out — fall through to UI login
        }

        // Fast path failed — MUST clear stale session from localStorage before fallback.
        // Angular keeps the stale JWT in localStorage even after redirecting to /auth/login.
        // If we skip this clear, Angular sees the JWT on the next goto('/auth/login'), runs
        // validateSessionToken() again (still mismatched), and redirects endlessly — the login
        // form never appears and page.fill('input#email') times out.
        await page.evaluate(() => localStorage.clear()).catch(() => {});
      }
    } catch {
      // File corrupt or missing — fall through to UI login
    }
  }

  // Fallback: UI form login (session was invalidated or globalSetup not run)
  const user = TEST_USERS[role];
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input#email', user.email);
  await page.fill('input#password', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30_000 });

  // Refresh saved state file so subsequent tests can use the fast path again
  try {
    const lsItems = await page.evaluate(() => {
      const result: { name: string; value: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        result.push({ name: key, value: localStorage.getItem(key)! });
      }
      return result;
    });
    const newState = {
      cookies: [],
      origins: [{ origin: 'http://localhost:4200', localStorage: lsItems }],
    };
    fs.writeFileSync(statePath, JSON.stringify(newState, null, 2));
  } catch { /* ignore — state refresh is optional */ }
}

/**
 * Log out the current user.
 */
export async function logout(page: Page): Promise<void> {
  const signOutDirect = page.locator('text=Sign Out').first();
  if (await signOutDirect.isVisible({ timeout: 2000 }).catch(() => false)) {
    await signOutDirect.click();
  } else {
    await page.locator('[data-testid="user-menu"], .cursor-pointer').first().click();
    await page.locator('text=Sign Out').first().click();
  }
  await page.waitForURL('**/auth/login', { timeout: 5_000 });
}

/**
 * Check if the current page is the login page.
 */
export async function isOnLoginPage(page: Page): Promise<boolean> {
  return page.url().includes('/auth/login');
}

/**
 * Navigate to a page and verify it loads (no redirect to unauthorized or login).
 */
export async function navigateAndExpectAccess(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForTimeout(1500);
  const currentUrl = page.url();
  if (currentUrl.includes('/unauthorized') || currentUrl.includes('/auth/login')) {
    throw new Error(`Expected access to ${url} but was redirected to ${currentUrl}`);
  }
}

/**
 * Navigate to a page and verify it redirects to /unauthorized.
 */
export async function navigateAndExpectDenied(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForURL('**/unauthorized', { timeout: 5_000 });
}
