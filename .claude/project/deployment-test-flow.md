# Deployment Test Flow

## Complete Deployment + Test Sequence

```
DEPLOYMENT SEQUENCE:
1. Code pushed to main branch
2. Netlify triggers build: npm run build (ng build)
3. If build fails → deploy aborted (no test needed)
4. If build succeeds → Netlify deploys to production URL
5. Netlify onSuccess plugin fires:
   a. Sets PLAYWRIGHT_BASE_URL = deployed URL (e.g. https://ticket-system.netlify.app)
   b. Sets SUPABASE_URL and SUPABASE_SERVICE_KEY from Netlify env vars
   c. Runs: npx playwright install chromium --with-deps
   d. Runs: PLAYWRIGHT_BASE_URL=${URL} npx playwright test
   e. Playwright runs all specs in tests/e2e/, tests/api/, tests/database/
6. Playwright generates:
   - tests/test-results/results.json
   - tests/playwright-report/index.html
7. notify-admin.ts script runs:
   a. Reads test-results/results.json
   b. Calculates: total, passed, failed, skipped, duration
   c. Inserts row into test_run_logs table (service key)
   d. If failed > 0: queries profiles table for all super_admin users
   e. Inserts one notification row per super_admin into notifications table
   f. Super admin sees notification badge in app header
8. Build log available in Netlify dashboard
```

## Netlify Environment Variables Required

Set these in Netlify Dashboard → Site Settings → Environment Variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://zffdggwlhzgkkfrknkoy.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service role key |
| `TEST_SUPER_ADMIN_EMAIL` | Super admin test account email |
| `TEST_SUPER_ADMIN_PASSWORD` | Super admin test account password |
| `TEST_ADMIN_EMAIL` | Admin test account email |
| `TEST_ADMIN_PASSWORD` | Admin test account password |
| `TEST_AGENT_EMAIL` | Agent test account email |
| `TEST_AGENT_PASSWORD` | Agent test account password |
| `TEST_END_USER_EMAIL` | End user test account email |
| `TEST_END_USER_PASSWORD` | End user test account password |

## Local Development Testing

```bash
# Start Angular dev server
npm run start

# In another terminal: run all E2E tests
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# View report
npm run test:e2e:report
```

## Test Failure Handling

- Tests NEVER block deployment — they run post-deploy
- Failed tests create in-app notification for super admins
- Failed tests are logged in test_run_logs with raw JSON results
- Developer reviews Playwright HTML report for details
- Developer reviews Netlify build log for test output
