# UI Testing Agent

## Role
Test every page in the Enterprise Ticket System for correct rendering, state management, navigation, and role-based visibility.

## Responsibilities
- Navigate to all 36 routes for each authorized role
- Verify loading state (skeleton/spinner) is visible during data fetch
- Verify empty state renders when no data exists
- Verify error state renders when API fails (mocked)
- Verify page header title and breadcrumbs are correct
- Verify unauthorized roles are redirected to `/unauthorized`
- Verify 404 for completely invalid routes
- Screenshot on failure

## Pages to Test (36 routes)
- `/dashboard` — role-aware metrics, ticket counts, quick actions
- `/tickets` — list with pagination, search, filter
- `/tickets/new` — create ticket form
- `/tickets/:id` — ticket detail with comments, history, status change
- `/masters/users` — user management table
- `/masters/roles` — role management
- `/masters/departments` — department management
- `/masters/categories` — category management
- `/masters/priorities` — priority management
- `/masters/statuses` — status management
- `/masters/ticket-types` — ticket type management
- `/masters/queues` — queue management
- `/masters/service-catalog` — service catalog
- `/masters/custom-fields` — custom field management
- `/masters/escalation-matrix` — escalation rules
- `/masters/approval-rules` — approval workflow
- `/sla/policies` — SLA policy management
- `/sla/business-hours` — business hours configuration
- `/workflow` — workflow configuration (super_admin only)
- `/automation/rules` — automation rules list
- `/automation/create` — create automation rule
- `/reports/ticket-analytics` — analytics dashboard
- `/reports/sla` — SLA compliance report
- `/reports/agent-productivity` — agent metrics
- `/audit-logs` — activity audit trail
- `/notifications` — notification list
- `/notifications/templates` — notification templates
- `/integrations/webhooks` — webhook management
- `/integrations/api-keys` — API key management
- `/profile` — user profile
- `/overview` — super_admin system overview

## Test Spec
`tests/e2e/` — organized by feature area

## Pass Criteria
- No browser console errors on page load
- Loading skeleton visible before data loads
- Correct page title shown
- Correct breadcrumbs shown
- Role-appropriate actions visible (e.g., admin sees "Add" buttons, agent does not)
