import { test, expect } from '@playwright/test';
import { loginAs, isIgnoredConsoleError } from '../../helpers/auth.helper';
import {
  PUBLIC_ROUTES,
  ADMIN_ROUTES,
  SUPER_ADMIN_ROUTES,
} from '../../helpers/test-data';

/**
 * Role Access Matrix — 144 checks (4 roles × 36 routes)
 *
 * ALLOW: page loads (not redirected to /unauthorized or /auth/login)
 * DENY: redirected to /unauthorized
 */

async function expectAllow(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForTimeout(1500);
  const currentUrl = page.url();
  const isDenied = currentUrl.includes('/unauthorized') || currentUrl.includes('/auth/login');
  expect(isDenied, `Expected ALLOW for ${url} but got redirect to ${currentUrl}`).toBe(false);
}

async function expectDeny(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  // Use 15s: authGuard runs async checkSessionValidity() before roleGuard can deny
  await page.waitForURL('**/unauthorized', { timeout: 15000 });
}

// ============================================================
// SUPER ADMIN — can access everything
// ============================================================
test.describe('Role: super_admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin');
  });

  for (const route of [...PUBLIC_ROUTES, ...ADMIN_ROUTES, ...SUPER_ADMIN_ROUTES]) {
    test(`ALLOW ${route}`, async ({ page }) => {
      await expectAllow(page, route);
    });
  }
});

// ============================================================
// ADMIN — can access public + admin routes, not super_admin only
// ============================================================
test.describe('Role: admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  for (const route of [...PUBLIC_ROUTES, ...ADMIN_ROUTES]) {
    test(`ALLOW ${route}`, async ({ page }) => {
      await expectAllow(page, route);
    });
  }

  for (const route of SUPER_ADMIN_ROUTES) {
    test(`DENY ${route}`, async ({ page }) => {
      await expectDeny(page, route);
    });
  }
});

// ============================================================
// AGENT — can access public routes only
// ============================================================
test.describe('Role: agent', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'agent');
  });

  for (const route of PUBLIC_ROUTES) {
    test(`ALLOW ${route}`, async ({ page }) => {
      await expectAllow(page, route);
    });
  }

  for (const route of [...ADMIN_ROUTES, ...SUPER_ADMIN_ROUTES]) {
    test(`DENY ${route}`, async ({ page }) => {
      await expectDeny(page, route);
    });
  }
});

// ============================================================
// END USER — can access public routes only
// ============================================================
test.describe('Role: end_user', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'end_user');
  });

  for (const route of PUBLIC_ROUTES) {
    test(`ALLOW ${route}`, async ({ page }) => {
      await expectAllow(page, route);
    });
  }

  for (const route of [...ADMIN_ROUTES, ...SUPER_ADMIN_ROUTES]) {
    test(`DENY ${route}`, async ({ page }) => {
      await expectDeny(page, route);
    });
  }
});
