# Testing Rules

## Mandatory Test Coverage

- Every page MUST have: loading state test, empty state test, error state test
- Every form MUST have: validation test (required fields), success test, failure test
- Every CRUD master MUST have: create, read, update, delete tests
- Every API endpoint MUST have: unauthenticated request test → must be rejected (401/403)
- Every role (super_admin, admin, agent, end_user) MUST be tested for access to permitted AND restricted routes

## Deployment Integration

- Tests MUST run automatically after every successful Netlify deployment
- Deployment MUST NOT be blocked by test failures — tests run post-deploy via `onSuccess` hook
- Test failures MUST create an in-app notification for every `super_admin` user
- Test results MUST be stored in `public.test_run_logs` table in Supabase

## Test Infrastructure

- Framework: Playwright (E2E + API + UI)
- Config: `enterprise-ticket-system/playwright.config.ts`
- Test directory: `enterprise-ticket-system/tests/`
- Reports: HTML at `playwright-report/index.html`, JSON at `test-results/results.json`
- CI hook: `netlify/plugins/run-tests/index.js` (`onSuccess`)
- Admin notification script: `tests/notify-admin.ts`

## Test Organization

```
tests/
├── helpers/          (auth.helper.ts, supabase.helper.ts, test-data.ts)
├── e2e/
│   ├── auth/         (login, logout, forgot-password, single-session)
│   ├── dashboard/    (dashboard)
│   ├── tickets/      (list, create, detail, update, assign, close)
│   ├── masters/      (12 master spec files — one per master entity)
│   ├── sla/          (sla-policies, business-hours)
│   ├── workflow/     (workflow-list, workflow-transitions)
│   ├── automation/   (automation-list, automation-create, automation-trigger)
│   ├── reports/      (ticket-analytics, sla-report, agent-productivity)
│   ├── audit/        (audit-logs)
│   ├── notifications/ (notification-list, notification-templates)
│   ├── integrations/ (webhooks, api-keys)
│   ├── profile/      (profile)
│   ├── overview/     (overview)
│   └── role-access/  (role-access-matrix — 144 checks)
├── api/              (auth-api, tickets-api, profiles-api, statuses-api)
└── database/         (constraints)
```

## Core Rules

- Test CRUD operations for all masters
- Test form validation (required fields, invalid data, duplicate prevention)
- Test access control enforcement via RLS and route guards
