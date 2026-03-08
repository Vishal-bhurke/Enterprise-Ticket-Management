# Skill: Run Full System Test

## Trigger
"run full system test" or "run all tests" or "test everything"

## What This Does
Executes the complete automated test suite across all 36 routes, 13 masters, 4 roles, all API endpoints, all database constraints, and all workflows. Then stores results in Supabase and notifies super admins.

## Steps
1. Ensure local dev server is running (`npm run start`) OR set `PLAYWRIGHT_BASE_URL` to deployed URL
2. Run: `npm run test:all`
   - This invokes `tests/run-full-test.sh` which:
     a. Runs `npx playwright test` against all spec files
     b. Generates `playwright-report/index.html` and `test-results/results.json`
     c. Runs `npx ts-node tests/notify-admin.ts` to store results in DB
3. Open report: `npm run test:e2e:report`
4. View in-app: Log in as super_admin → check notification bell → see test run summary

## Alternatively (UI mode for debugging)
Run: `npm run test:e2e:ui` — opens Playwright's interactive test UI for selecting and running specific tests

## Environment Variables Required
- `PLAYWRIGHT_BASE_URL` — target URL (defaults to `http://localhost:4200`)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — service role key for admin operations and result insertion

## Output
- HTML report at `playwright-report/index.html`
- JSON results at `test-results/results.json`
- DB row in `test_run_logs` table
- In-app notification for all super_admin users (if any failures)
