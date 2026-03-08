import { test, expect, chromium } from '@playwright/test';
import { loginAs } from '../../helpers/auth.helper';
import { TEST_USERS } from '../../helpers/test-data';
import { rowExists } from '../../helpers/supabase.helper';
import * as path from 'path';
import * as fs from 'fs';

const AUTH_DIR = path.join(__dirname, '../../.auth');

test.describe('Single Active Session', () => {
  /**
   * This test verifies that when a user logs in from a second browser/device,
   * the first session is invalidated within the polling interval (~15s).
   *
   * Note: This test uses two separate browser contexts to simulate two devices.
   * It can be slow due to Supabase auth rate limits after many sequential logins.
   */
  test('new login on Device B invalidates Device A session', async () => {
    const browser = await chromium.launch();

    // Device A context
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await pageA.goto('http://localhost:4200/auth/login');
    await pageA.fill('input#email', TEST_USERS.admin.email);
    await pageA.fill('input#password', TEST_USERS.admin.password);
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('**/dashboard', { timeout: 30_000 });

    // Device B context — same account, new login
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await pageB.goto('http://localhost:4200/auth/login');
    await pageB.fill('input#email', TEST_USERS.admin.email);
    await pageB.fill('input#password', TEST_USERS.admin.password);
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL('**/dashboard', { timeout: 30_000 });

    // Device A should get invalidated within 15 seconds (polling interval)
    // Trigger navigation on Device A to force auth check
    await pageA.waitForTimeout(2000);
    await pageA.goto('http://localhost:4200/tickets');

    // Device A should be redirected to login
    await expect(pageA).toHaveURL(/auth\/login/, { timeout: 25_000 });

    // Save Device B's session state so subsequent admin tests can use the fast path.
    // Without this, Device B's login changed profiles.session_token in DB, making the
    // cached globalSetup state stale — every subsequent admin test would fall back to UI login.
    try {
      await contextB.storageState({ path: path.join(AUTH_DIR, 'admin.json') });
    } catch { /* ignore — state refresh is optional */ }

    await contextA.close();
    await contextB.close();
    await browser.close();
  });

  test('admin profile exists in DB after login', async ({ page }) => {
    // Use loginAs helper (reuses Supabase session efficiently)
    await loginAs(page, 'admin');
    // Verify admin profile exists in DB
    const hasProfile = await rowExists('profiles', { email: TEST_USERS.admin.email });
    expect(hasProfile).toBe(true);
  });
});
