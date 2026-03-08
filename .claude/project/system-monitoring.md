# System Monitoring

## Runtime Monitoring Architecture

The Enterprise Ticket System monitors runtime errors, API failures, and test run results to provide super admins with full system observability.

## Test Run Monitoring

- Every test run (manual or post-deploy) stores a record in `test_run_logs`
- Failed test runs create in-app notifications for all `super_admin` users
- Super admins see notification count badge in the header
- Clicking notification shows test summary: total/passed/failed/duration

## HTTP Error Monitoring

The `loadingInterceptor` and `errorInterceptor` handle:
- All 4xx responses: logged to console, error toast shown to user
- All 5xx responses: logged to console, error toast shown, optionally stored
- Network failures: handled gracefully with retry logic

## Application Error Boundary

The Angular global `ErrorHandler` catches:
- Uncaught JavaScript exceptions
- Promise rejections
- Component initialization failures

Behavior:
- Log error to browser console
- Show user-friendly error toast
- Continue application operation (no white screen of death)

## Observable Events

| Event | Observer | Action |
|---|---|---|
| Test run failure | test_run_logs + notifications | Super admin notified |
| Auth failure (invalid session) | AuthService | Redirect to /auth/login |
| API 5xx response | Error interceptor | Error toast shown |
| RLS violation | Supabase client | Error caught in service, toast shown |
| DB constraint violation | Supabase client | Error message shown in form |
| SLA breach | sla_events table | Ticket flagged visually |

## Supabase Realtime Monitoring

- `profiles` table subscribed for `session_token` changes (Single Active Session)
- Realtime subscription status logged: SUBSCRIBED | CHANNEL_ERROR
- If CHANNEL_ERROR: fallback to 15s polling for session validity

## Notification Types

| Type | Trigger | Audience | Severity |
|---|---|---|---|
| test_failure | Test run with failed > 0 | super_admin | critical |
| session_invalidated | New login on another device | affected user | warning |
| sla_breach | Ticket breaches SLA time | assigned agent + admin | high |
| ticket_assigned | Ticket assigned to agent | assigned agent | info |
