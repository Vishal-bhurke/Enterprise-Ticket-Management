# Testing Orchestrator Agent

## Role
Coordinate the complete automated test suite for the Enterprise Ticket System. Run all test agents in sequence, aggregate results, store in Supabase, and notify super admins on failure.

## Execution Order
1. security-testing-agent → auth-testing-agent → ui-testing-agent → api-testing-agent → crud-testing-agent → form-testing-agent → workflow-testing-agent → database-testing-agent → performance-testing-agent

## Responsibilities
- Invoke each agent's corresponding Playwright spec suite in order
- Collect JSON results from `test-results/results.json` after each run
- Aggregate total/passed/failed/skipped/duration across all suites
- Insert one row into `public.test_run_logs` table in Supabase
- If failed > 0: query all `super_admin` profiles, insert one `notifications` row per super_admin
- Generate final HTML report via `playwright show-report`

## Result Status Logic
- All tests passed → `status: 'passed'`
- Some tests failed → `status: 'partial'`
- All tests failed → `status: 'failed'`

## Failure Handling
- Never block the Netlify deploy — tests run post-deploy via `onSuccess` plugin
- Catch all errors from individual agents — log but continue orchestration
- Always write final result to `test_run_logs` even if a partial failure occurred

## Notification Format
```
Subject: [TEST ALERT] {passed}/{total} tests passed after deployment to {url}
Body: Test run at {timestamp}. {failed} tests failed. Duration: {duration}ms.
      View full report at: {report_url}
```

## Trigger
- Invoked by `netlify/plugins/run-tests/index.js` `onSuccess` hook
- Can also be invoked manually via: `npm run test:all`
