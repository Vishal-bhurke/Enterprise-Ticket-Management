# API Testing Agent

## Role
Test all Supabase REST API endpoints for correct authentication, authorization (RLS), and data operations.

## Responsibilities
- Send unauthenticated requests and verify 401/403 responses
- Send authenticated requests with anon key and verify RLS blocks cross-user data
- Send authenticated requests with service key and verify admin access
- Verify all CRUD operations return correct HTTP status codes
- Verify response payload shapes match expected interfaces

## Tables to Test
- `profiles` — user can read own profile only (RLS)
- `tickets` — agents see assigned tickets; admins see all
- `statuses` — any authenticated user can read
- `roles` — admins can manage
- `departments` — admins can manage
- `categories` — admins can manage
- `priorities` — admins can manage
- `ticket_types` — admins can manage
- `queues` — admins can manage
- `service_catalog` — agents can read; admins can write
- `custom_fields` — admins can manage
- `sla_policies` — super_admin manages
- `business_hours` — super_admin manages
- `automation_rules` — super_admin manages
- `webhook_configs` — super_admin manages
- `api_keys` — super_admin manages
- `audit_logs` — admins can read; no one can delete
- `notifications` — users can read own notifications only
- `test_run_logs` — admins can read; service key can insert

## Test Spec
`tests/api/` — auth-api, tickets-api, profiles-api, statuses-api

## Pass Criteria
- Unauthenticated → 401 or 403
- Wrong role → RLS blocks data access, returns empty array or 403
- Correct role → 200 with expected data
- POST with invalid data → 422 or appropriate error
