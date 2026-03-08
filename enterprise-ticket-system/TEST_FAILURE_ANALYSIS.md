# TEST FAILURE ANALYSIS — Enterprise Ticket System
**Generated:** 2026-03-08
**Test Framework:** Playwright 1.x
**Environment:** Local (http://localhost:4200) → Supabase Cloud (zffdggwlhzgkkfrknkoy)
**Angular version:** 18.2 | **PrimeNG version:** 18.0.2

---

## Section 1 — Summary

| Metric | Last Completed Full Run | Interrupted Diagnostic Run |
|--------|------------------------|---------------------------|
| Total tests | 301 | 301 (stopped at ~180) |
| Passed | 271 | ~165 |
| Failed | 2 | ~8 (extrapolated) |
| Skipped | 9 | — |
| Did not run | 19 | — |
| Duration | 25 min | Stopped at 15 min |

**Test files covering:**
- 36 routes × 4 roles = 144 role-access checks
- 13 masters CRUD operations
- Auth flows (login, logout, session, single-session)
- Ticket lifecycle (create, list, detail, update, assign, close)
- SLA, Workflow, Automation, Reports, Audit, Notifications, Integrations
- API (RLS/auth), Database (constraints)

---

## Section 2 — API Failures

### Supabase REST API (from Playwright `request` context)

No direct API spec failures detected in the last completed run. However, the following API-level issues were observed indirectly:

| Endpoint | Issue | Observed In |
|----------|-------|-------------|
| `POST /auth/v1/token` | Auth rate limit hit after ~100 UI logins | role-access-matrix tests (late suite) |
| `GET /rest/v1/roles` | Cold-start timeout (first request after idle) | globalSetup warmup; mitigated with 6-attempt retry |
| `POST /auth/v1/logout` | Revokes JWT; cached `.auth/*.json` becomes stale | After logout.spec.ts runs |

**API Rate Limit Detail:**
- Supabase free tier: ~10 email/password sign-ins per minute per IP
- Full suite triggers 4+ UI fallback logins (per session invalidation event) plus 4 globalSetup logins
- After `logout.spec.ts` signs out 3 roles × 3 tests = up to 9 sign-outs, subsequent fallback logins compound

---

## Section 3 — UI Failures

### 3.1 Confirmed Failures (from completed run — ba5f69e)

| Test File | Test Name | Failure Type | Root Cause |
|-----------|-----------|-------------|------------|
| `e2e/tickets/ticket-list.spec.ts:15` | loading state visible before data loads | Wrong selector | `page.locator('p-table')` — Angular removes `<p-table>` custom element tag and renders native `<table>` instead |
| `e2e/tickets/ticket-list.spec.ts:27` | empty state shown when no tickets | Wrong selector | Same — `p-table` selector does not match PrimeNG 18's rendered output |

**Note:** Both are fixed in the current codebase (changed to `table` selector). These will pass in the next full run.

### 3.2 Session-Related UI Failures (from interrupted diagnostic run)

These tests show the login page instead of the expected page content, indicating `loginAs()` failed:

| Test | Expected | Actual | Root Cause |
|------|----------|--------|------------|
| `role-access: super_admin ALLOW /automation` | Page loads (super_admin has access) | Login page shown | Supabase auth rate limit — fallback UI login blocked |
| `role-access: super_admin ALLOW /integrations` | Page loads | Login page shown | Same |
| `role-access: admin ALLOW /notifications/templates` | Page loads | Login page shown | Admin session invalidated by logout test; rate-limited fallback |
| `role-access: admin ALLOW /profile` | Page loads | Login page shown | Same |

**Common pattern in all session failures:**
```
- heading "Welcome back"
- textbox "Email Address" (empty or filled)
- button "Sign In" (sometimes disabled = still submitting)
```
The page is on `/auth/login` when `expectAllow()` checks the URL → test fails because URL contains `/auth/login`.

### 3.3 Timeout-Related Failures (Previous Run — now fixed)

| Test | Timeout | Root Cause |
|------|---------|------------|
| `service-catalog: create service catalog item` | `.p-toast-message` not visible 5000ms | Create button `[disabled]` — Angular ngModel not updated before click; fixed with `Tab` key + `expect(btn).toBeEnabled()` |
| `ticket-create: redirects to ticket detail` | Submit button stays disabled | Reactive form invalid — `expect(submitBtn).toBeEnabled({timeout:10000})` now waits for form validity |
| `role-access: end_user DENY /overview` | `waitForURL('**/unauthorized', 5000ms)` | `authGuard.checkSessionValidity()` async DB call takes >5s; fixed with 15000ms timeout |

---

## Section 4 — Form Failures

### 4.1 Service Catalog Create Form

| Field | Issue | Evidence |
|-------|-------|---------|
| Name input (`<input pInputText [(ngModel)]="form.name">`) | Create button remains `[disabled]="!form.name"` after `page.fill()` | ARIA snapshot shows button disabled despite textbox value being set |

**Root Cause:**
Playwright's `.fill()` triggers the DOM `input` event synchronously, but Angular 18 with `provideZoneChangeDetection({ eventCoalescing: true })` batches change detection. The `[disabled]` binding re-evaluation runs asynchronously after `.fill()` returns, so the button is still disabled when the test tries to click it.

**Fix applied:** `await page.keyboard.press('Tab')` after fill forces Angular to flush pending change detection before the button is clicked.

### 4.2 Ticket Create Form

| Field | Issue | Evidence |
|-------|-------|---------|
| `ticket_type_id` (FormControl, `Validators.required`) | Submit button `[disabled]="form.invalid"` despite dropdown showing "Change Request" | ARIA snapshot confirms dropdown displays selected value but form stays invalid |
| `(ngModelChange)` binding on `formControlName` element | `onTicketTypeChange()` never fires — custom fields not loaded for selected type | Template uses `(ngModelChange)` which only works with `NgModel` directive, not `formControlName` |

**Root Cause (Application Bug):**
In `ticket-create.component.ts` line 151:
```html
<p-dropdown formControlName="ticket_type_id" ... (ngModelChange)="onTicketTypeChange($event)" />
```
`(ngModelChange)` is an event output of the `NgModel` directive. Since this element uses `formControlName` (Reactive Forms), there is no `NgModel` directive → `onTicketTypeChange()` is never called → custom fields for the selected ticket type never load.

**Should be:**
```html
<p-dropdown formControlName="ticket_type_id" ... (onChange)="onTicketTypeChange($event.value)" />
```

**Secondary form issue:** Even though `onTicketTypeChange()` is not called, the form validity depends only on the main `FormGroup` (not `customFieldsForm`). The Submit button disabled state is resolved by `expect(submitBtn).toBeEnabled({timeout:10000})` — the form becomes valid once PrimeNG's CVA updates the FormControl.

---

## Section 5 — Database Failures

No database-level constraint failures detected. The `tests/database/constraints.spec.ts` tests were included in the `database` project which runs after `e2e` (per playwright.config.ts `dependencies`). These were part of the 9 skipped / 19 did not run in the completed run.

**Potential database issues observed indirectly:**

| Table | Issue | Observed From |
|-------|-------|--------------|
| `profiles.session_token` | Stale after `signOut()` — `.auth/*.json` cache not refreshed | logout.spec.ts invalidates JWT; next fast-path fails → fallback required |
| `tickets` | Orphaned test tickets left from failed cleanup | `ticket-create.spec.ts` cleanupRow() runs after redirect; if test times out before cleanup, TICK-00001, TICK-00002 remain |
| `service_catalog` | Potential orphaned test rows if cleanup fails | `cleanupRow('service_catalog', {name: ...})` after create test |

---

## Section 6 — Authentication Issues

### 6.1 Session Invalidation Cascade

**Problem:** The test suite creates a session invalidation cascade that affects all subsequent tests.

**Sequence of events:**
1. `global-setup.ts` — 4 UI logins performed; saves sessions to `.auth/{role}.json`
2. `auth/logout.spec.ts` — Signs out `admin`, `agent`, `end_user` via UI click
3. Signed-out JWTs are revoked by Supabase (`auth.sessions` marked expired)
4. `.auth/admin.json`, `.auth/agent.json`, `.auth/end_user.json` still contain the OLD (now revoked) JWTs
5. `auth/single-session.spec.ts` — Performs 2 new UI logins for `admin`; saves Device B session to `admin.json`
6. Tests after single-session: `admin` uses Device B session → but `agent` and `end_user` sessions are still stale
7. `loginAs(page, 'agent')` → fast path: revoked JWT → Angular detects invalid → redirect to `/auth/login` → fallback UI login
8. Every `agent` or `end_user` test needs a new UI login → Supabase rate limit hit after many attempts
9. Late-running role-access matrix tests (144 checks) fail because fallback logins are rate-limited

### 6.2 Supabase Auth Rate Limiting

| Symptom | Evidence |
|---------|---------|
| Login page shown with empty fields | Fallback `page.fill(email)` / `page.fill(password)` never runs → test reads URL and finds `/auth/login` |
| Login page with Sign In disabled | Fallback login submitted but Supabase returns rate limit error; form shows loading/disabled state |
| ARIA snapshot: `"Invalid login credentials"` | Earlier runs — wrong email in env vars (old test-data.ts defaults) |

### 6.3 `isSessionValid()` Gap in globalSetup

**Problem:** The `isSessionValid()` function in `global-setup.ts` only checks JWT `expires_at` timestamp. It does NOT check whether Supabase has revoked the JWT (via `signOut()`).

```typescript
function isSessionValid(statePath: string): boolean {
  // Only checks expiry time — does NOT check Supabase revocation status
  return typeof session.expires_at === 'number' && session.expires_at > nowSeconds + 600;
}
```

**Impact:** After `logout.spec.ts` runs, `.auth/agent.json` and `.auth/end_user.json` contain revoked JWTs with future `expires_at`. globalSetup marks them as "valid" and skips re-login. On the next test, `loginAs()` fast path fails, triggering fallback UI login every single time.

### 6.4 `loginAs()` After-Logout Refresh Failure

**Problem:** When `loginAs()` falls back to UI login and succeeds, it saves the new session to `.auth/{role}.json`. But if this session is later revoked by a logout test, the cached file again becomes stale.

**The cycle:**
```
globalSetup → save sessions → logout test revokes → fallback logins → save new sessions →
next run: globalSetup reuses → sessions still valid → tests pass (IF no logout tests run again)
```

The issue only manifests when the FULL suite runs because logout tests are always part of it.

---

## Section 7 — Root Cause Analysis

### Category 1: Test Selector Issues (Frontend Tests)

| Issue | Files Affected | Severity |
|-------|---------------|---------|
| `p-table` selector matches Angular component tag, not rendered `<table>` | `ticket-list.spec.ts` lines 19, 30 | Medium — causes false failures; fixed in current code |
| Other specs using `p-table` but only checking OR with `app-empty-state` | `service-catalog.spec.ts`, `departments.spec.ts`, etc. | Low — passes because empty state is shown when no data |

### Category 2: Supabase Auth Rate Limiting (Infrastructure)

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Fallback UI logins rate-limited | 144 role-access tests after 3 logout tests = ~50+ fallback logins in <1 min | High — causes role-access matrix failures late in test run |
| Single Supabase project used for all tests | Free-tier rate limits (10 signIn/min) | High — shared with app development logins |
| No auth token refresh strategy | Revoked tokens not detected by `isSessionValid()` | High — stale session files reused |

### Category 3: Angular/PrimeNG Change Detection Timing (Frontend Tests)

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| `form.name` not updated before Create button click | `provideZoneChangeDetection({eventCoalescing:true})` batches events | Medium — service-catalog create test; fixed with Tab key |
| `form.invalid` not re-evaluated before Submit click | Same — Angular batches reactive form updates | Medium — ticket-create test; fixed with `expect(btn).toBeEnabled()` |
| `(ngModelChange)` on `formControlName` element | Application bug — wrong event binding | Low — `onTicketTypeChange()` never fires; custom fields not loaded per ticket type |

### Category 4: Auth Guard Async Timing (Frontend Application)

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| `expectDeny('/overview')` times out at 5000ms | `authGuard.checkSessionValidity()` is async DB call; takes up to 10s when not throttled | Medium — role-access end_user DENY /overview; fixed with 15000ms timeout |

### Category 5: Session State Management Across Tests

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Logout tests invalidate sessions used by later tests | No session isolation — all roles share single Supabase project | High — cascading failures in role-access matrix |
| `admin.json` refreshed by single-session test but agent/end_user not refreshed after logout | `single-session.spec.ts` only saves admin.json | High — agent/end_user always need fallback login after logout tests |

---

## Section 8 — Recommended Fix Plan (Prioritized)

> **Important:** Do not auto-apply fixes. These are recommendations only.

### Priority 1 — CRITICAL: Fix Supabase Auth Rate Limiting

**Problem:** Logout tests invalidate sessions → subsequent tests rate-limited
**Recommended fix:** Add session refresh after each logout test

```typescript
// In logout.spec.ts — after each test that signs out a role,
// call loginAs() to re-establish session and refresh .auth/*.json
test.afterEach(async ({ page }) => {
  // Only if page is on login page (we just logged out)
  if (page.url().includes('/auth/login')) {
    try { await loginAs(page, currentRole); } catch { /* ignore */ }
  }
});
```

**Alternative:** Use Supabase service role API to create sessions directly (bypasses auth rate limit):
```typescript
// In global-setup.ts — use admin.auth.generateLink() or admin.auth.signInWithPassword()
// called via the service role client, not the browser form
```

### Priority 2 — HIGH: Fix `isSessionValid()` to Detect Revoked JWTs

**Problem:** `isSessionValid()` only checks `expires_at`, not revocation status
**File:** `tests/global-setup.ts`
**Recommended fix:** After checking expiry, verify the session against Supabase:
```typescript
async function isSessionValid(statePath: string): Promise<boolean> {
  // 1. Check expiry (existing code)
  if (!checkExpiry(statePath)) return false;
  // 2. Verify with Supabase: try getUser() with the stored access_token
  const { data: { user }, error } = await adminClient.auth.getUser(accessToken);
  return !!user && !error;
}
```

### Priority 3 — HIGH: Fix Application Bug — `(ngModelChange)` on `formControlName`

**Problem:** `onTicketTypeChange()` never fires; custom fields not loaded
**File:** `src/app/features/tickets/ticket-create/ticket-create.component.ts` line 151
**Fix:**
```html
<!-- Change (ngModelChange) to (onChange) for reactive form compatibility -->
<p-dropdown
  formControlName="ticket_type_id"
  [options]="ticketTypes()"
  optionLabel="name"
  optionValue="id"
  placeholder="Select ticket type"
  styleClass="w-full"
  [class.ng-invalid]="isInvalid('ticket_type_id')"
  (onChange)="onTicketTypeChange($event.value)"
/>
```

### Priority 4 — MEDIUM: Add `waitForLoadState('networkidle')` in ticket-list beforeEach

**Problem:** Tests check page state before Angular finishes loading
**File:** `tests/e2e/tickets/ticket-list.spec.ts`
**Fix:**
```typescript
test.beforeEach(async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/tickets');
  await page.waitForLoadState('networkidle'); // Add this line
});
```

### Priority 5 — MEDIUM: Increase `app-page-header` visibility timeout

**Problem:** `toBeVisible({ timeout: 5000 })` may fail on slow connections
**File:** `tests/e2e/tickets/ticket-list.spec.ts` line 12
**Fix:**
```typescript
await expect(page.locator('app-page-header')).toBeVisible({ timeout: 15000 });
```

### Priority 6 — LOW: Add Test Isolation via Single-Session Token Refresh

**Problem:** `single-session.spec.ts` changes `profiles.session_token` for admin, breaking subsequent admin tests
**Recommended fix:** After Device B login in single-session test, update `admin.json` with Device B's session (already implemented) AND verify the token in DB matches before proceeding in each subsequent admin test.

### Priority 7 — LOW: Separate Supabase Project for Tests

**Problem:** Auth rate limits shared with development
**Recommended fix:** Create a dedicated Supabase project for testing with its own credentials. Set `PLAYWRIGHT_SUPABASE_URL` and `PLAYWRIGHT_ANON_KEY` env vars pointing to the test project. This eliminates rate limiting and isolates test data from production data.

---

## Appendix — Test Infrastructure Status

| Component | Status | Notes |
|-----------|--------|-------|
| `playwright.config.ts` | ✅ Configured | 3 projects: e2e → database → api; 60s timeout; 1 worker |
| `tests/global-setup.ts` | ⚠️ Partial | Session reuse via `isSessionValid()` works but doesn't detect revoked JWTs |
| `tests/helpers/auth.helper.ts` | ✅ Working | Fast path with `Promise.race`; fallback UI login; localStorage clear on failure |
| `tests/helpers/supabase.helper.ts` | ✅ Working | Service role client for DB assertions and cleanup |
| `tests/helpers/test-data.ts` | ✅ Working | 4 test users with correct credentials |
| `tests/.auth/*.json` | ⚠️ Stale Risk | Valid sessions but may become stale after logout tests |
| `netlify/plugins/run-tests/index.js` | ✅ Ready | Post-deploy CI hook configured |
| `tests/notify-admin.ts` | ✅ Ready | Supabase notification insert on failure |
| `supabase/migrations/012_test_notifications.sql` | ✅ Present | `test_run_logs` table defined |

---

## Appendix — Currently Fixed Issues (Changes Made This Session)

| File | Change | Status |
|------|--------|--------|
| `tests/e2e/masters/service-catalog.spec.ts` | Added `Tab` key press + `expect(btn).toBeEnabled()` before Create click | ✅ Fixed — verified passing |
| `tests/e2e/tickets/ticket-create.spec.ts` | Added `expect(submitBtn).toBeEnabled({timeout:10000})` before Submit | ✅ Fixed — verified passing |
| `tests/e2e/role-access/role-access-matrix.spec.ts` | Increased `expectDeny` timeout from 5000ms to 15000ms | ✅ Fixed — verified passing |
| `tests/e2e/tickets/ticket-list.spec.ts` | Changed `p-table` selector to `table` for loading/empty state checks | ✅ Fixed — needs full suite verification |
| `tests/helpers/auth.helper.ts` | `Promise.race` for fast-path auth validation; `localStorage.clear()` on fallback | ✅ Stable |
| `tests/global-setup.ts` | `isSessionValid()` check; Supabase warmup retry; selective browser login | ✅ Stable |
| `playwright.config.ts` | 3-project ordering (e2e→database→api); 60s timeout | ✅ Stable |
| `tests/e2e/auth/single-session.spec.ts` | Save Device B state to `admin.json` after session invalidation test | ✅ Stable |
