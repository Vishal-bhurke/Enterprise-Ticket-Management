/**
 * Playwright Global Setup
 *
 * Runs ONCE before the test suite starts.
 * Logs in as each role using the real Angular login form (so Angular's signIn()
 * properly writes profiles.session_token to the DB), then saves the full
 * Playwright storageState to tests/.auth/{role}.json.
 *
 * loginAs() restores all saved localStorage items, then navigates to /dashboard.
 * If that fails (e.g., session was invalidated by a logout test), it falls back
 * to UI login and refreshes the saved file.
 *
 * Net result: 4 real logins in globalSetup vs 150+ in a plain test run.
 */

import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';

const AUTH_DIR = path.join(__dirname, '.auth');
const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] || 'http://localhost:4200';

const TEST_USERS: Record<string, { email: string; password: string }> = {
  super_admin: {
    email: process.env['TEST_SUPER_ADMIN_EMAIL'] || 'test_superadmin@playwright.local',
    password: process.env['TEST_SUPER_ADMIN_PASSWORD'] || 'PlaywrightTest123!',
  },
  admin: {
    email: process.env['TEST_ADMIN_EMAIL'] || 'test_admin@playwright.local',
    password: process.env['TEST_ADMIN_PASSWORD'] || 'PlaywrightTest123!',
  },
  agent: {
    email: process.env['TEST_AGENT_EMAIL'] || 'test_agent@playwright.local',
    password: process.env['TEST_AGENT_PASSWORD'] || 'PlaywrightTest123!',
  },
  end_user: {
    email: process.env['TEST_END_USER_EMAIL'] || 'test_enduser@playwright.local',
    password: process.env['TEST_END_USER_PASSWORD'] || 'PlaywrightTest123!',
  },
};

/**
 * Check if a saved Playwright storageState file contains a Supabase JWT that
 * (a) expires more than 10 minutes from now AND
 * (b) has NOT been revoked server-side by a signOut() call.
 *
 * Supabase invalidates JWTs immediately on signOut() even if expires_at is still
 * in the future.  Without the revocation check, globalSetup reuses stale tokens
 * from logout tests, causing all subsequent tests to fall back to UI logins and
 * exhaust the Supabase auth rate limit (~10 sign-ins/min/IP).
 *
 * Returns true → reuse, false → re-login.
 */
async function isSessionValid(statePath: string): Promise<boolean> {
  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    const lsItems: { name: string; value: string }[] = state.origins?.[0]?.localStorage ?? [];
    const authItem = lsItems.find(item => item.name.startsWith('sb-') && item.name.endsWith('-auth-token'));
    if (!authItem) return false;
    const session = JSON.parse(authItem.value);

    // Fast local check: expiry timestamp
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof session.expires_at !== 'number' || session.expires_at <= nowSeconds + 600) {
      return false;
    }

    // Revocation check: verify JWT against Supabase Auth API.
    // A signOut() revokes the JWT server-side immediately, even if expires_at is future.
    const accessToken: string = session.access_token;
    if (!accessToken) return false;

    const SUPABASE_URL = process.env['PLAYWRIGHT_SUPABASE_URL'] || 'https://zffdggwlhzgkkfrknkoy.supabase.co';
    const ANON_KEY = process.env['PLAYWRIGHT_ANON_KEY'] || 'sb_publishable_JVyDuLbGwRGeS-oSmanaEA_yNBliwtk';

    const isActive = await new Promise<boolean>((resolve) => {
      const req = https.get(
        `${SUPABASE_URL}/auth/v1/user`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
          },
        },
        (res) => {
          res.resume();
          res.on('end', () => resolve(res.statusCode === 200));
        }
      );
      req.on('error', () => resolve(false));
      req.setTimeout(5_000, () => { req.destroy(); resolve(false); });
    });

    return isActive;
  } catch {
    return false;
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Wait for Supabase to be fully ready (handles auto-pause cold-start up to ~75s).
  // Free-tier projects pause after 1 week of inactivity; first request takes 30-60s.
  // We retry with a 10s timeout per attempt until we get any HTTP response.
  {
    const SUPABASE_URL = process.env['PLAYWRIGHT_SUPABASE_URL'] || 'https://zffdggwlhzgkkfrknkoy.supabase.co';
    const ANON_KEY = process.env['PLAYWRIGHT_ANON_KEY'] || 'sb_publishable_JVyDuLbGwRGeS-oSmanaEA_yNBliwtk';
    const MAX_ATTEMPTS = 6;
    let ready = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const ok = await new Promise<boolean>((resolve) => {
        const req = https.get(
          `${SUPABASE_URL}/rest/v1/roles?select=id&limit=1`,
          { headers: { apikey: ANON_KEY } },
          (res) => { res.resume(); res.on('end', () => resolve(true)); }
        );
        req.on('error', () => resolve(false));
        req.setTimeout(10_000, () => { req.destroy(); resolve(false); });
      });
      if (ok) {
        console.log(`[globalSetup] Supabase ready (attempt ${attempt}/${MAX_ATTEMPTS}).`);
        ready = true;
        break;
      }
      console.log(`[globalSetup] Supabase not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}), waiting 5s...`);
      if (attempt < MAX_ATTEMPTS) await new Promise(r => setTimeout(r, 5_000));
    }
    if (!ready) {
      console.warn('[globalSetup] Supabase did not respond after all attempts — tests may fail.');
    }
  }

  // Collect roles that genuinely need a fresh login.
  // isSessionValid() is async — it verifies the JWT against Supabase to detect
  // sessions that were revoked by a previous signOut() call.
  const sessionChecks = await Promise.all(
    Object.entries(TEST_USERS).map(async ([role, user]) => {
      const statePath = path.join(AUTH_DIR, `${role}.json`);
      const valid = await isSessionValid(statePath);
      if (valid) {
        console.log(`[globalSetup] Reusing valid session for ${role}`);
      }
      return { role, user, statePath, needsLogin: !valid };
    })
  );

  const rolesToLogin = sessionChecks.filter(r => r.needsLogin);

  if (rolesToLogin.length === 0) {
    console.log('[globalSetup] All sessions valid — skipping browser login.');
    return;
  }

  const browser = await chromium.launch();

  for (const { role, user, statePath } of rolesToLogin) {

    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();

    try {
      // Navigate to app root first to establish the origin for localStorage APIs.
      // Then clear ALL local storage before login — prevents Angular's auth service
      // from finding a stale session that causes an immediate redirect to
      // ?reason=session_invalidated before the login form can be interacted with.
      // This edge case occurs when the previous test run's Chromium temp profile
      // was not fully cleaned up after a forced process termination.
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.evaluate(() => {
        try { localStorage.clear(); } catch { /* ignore */ }
        try { sessionStorage.clear(); } catch { /* ignore */ }
      }).catch(() => {});

      // Full UI login — Angular's signIn() writes session_token to DB + localStorage
      await page.goto('/auth/login');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('input#email', user.email);
      await page.fill('input#password', user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 30_000 });

      // Save the complete storageState: includes sb-*-auth-token AND ets_session_* UUID
      await context.storageState({ path: statePath });

      console.log(`[globalSetup] Saved storageState for ${role}`);
    } catch (err) {
      console.warn(`[globalSetup] Login failed for ${role}:`, err);
      // Do NOT delete existing state file if login failed — keep the old one so
      // loginAs() can attempt fast-path injection (might still work if session
      // is valid but Supabase was temporarily unavailable for globalSetup).
    } finally {
      await context.close();
    }
  }

  await browser.close();
}
