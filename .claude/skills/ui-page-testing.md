# Skill: UI Page Testing

## Trigger
"test page [URL]" or "check if [page] loads correctly"

## Input
- Page URL (relative path, e.g., `/dashboard`)
- Role to test as (super_admin | admin | agent | end_user)

## Steps
1. Log in as the specified role using `loginAs(role)` from `tests/helpers/auth.helper.ts`
2. Navigate to the target URL
3. Check for browser console errors — fail if any errors with severity `error`
4. Verify loading state (skeleton or spinner) is visible within 500ms of navigation
5. Wait for loading state to disappear (content loaded)
6. Verify page title matches expected value
7. Verify breadcrumbs match expected path
8. Verify role-appropriate action buttons visible (e.g., "Add" button for admin, hidden for agent)
9. If unauthorized role: verify redirect to `/unauthorized`
10. Take screenshot on any failure

## Output
- PASS: page loads correctly for role, no console errors, correct UI elements visible
- FAIL: screenshot saved to `test-results/screenshots/[page]-[role]-[timestamp].png`, error logged

## Reusable in
`tests/e2e/**/*.spec.ts` — import `testPage(page, url, role)` from helpers
