# Complete Test Scenario Library

## Authentication Scenarios (6)

| Scenario | Steps | Expected | DB Check |
|---|---|---|---|
| Login valid | Enter correct email/password, click Sign In | Redirect to /dashboard, session created | `auth.sessions` has new record |
| Login invalid | Enter wrong password, click Sign In | Error toast shown, stay on login | No session created |
| Forgot password | Enter email, click Send | Success message shown | Reset token in auth |
| Reset password | Follow reset link, enter new password | Redirect to login | Password updated |
| Single session — Device A logout | Login on A, then login on B | A redirects to login with amber banner | `profiles.session_token` changed |
| Logout | Click user menu → Sign Out | Redirect to login, session cleared | `session_token` set to NULL |

---

## Ticket Scenarios (8)

| Scenario | Steps | Expected | DB Check |
|---|---|---|---|
| Create ticket | Fill all required fields, click Submit | Redirected to ticket detail, ticket number shown | `tickets` row created, `status_id` = Open |
| Create ticket — missing subject | Leave title empty, click Submit | Validation error shown, no submission | No row created |
| Update ticket title | Open ticket, edit title, save | New title shown, audit log entry | `tickets.title` updated, `ticket_history` row |
| Assign ticket | Open ticket, select assignee, save | Assignee name shown | `tickets.assignee_id` updated |
| Reassign ticket | Change assignee | New assignee shown, old removed | `tickets.assignee_id` updated |
| Add comment | Open ticket, type comment, submit | Comment visible in thread | `ticket_comments` row created |
| Close ticket | Change status to Closed | Status badge = Closed, SLA event logged | `tickets.status_id` = Closed, `sla_events` row |
| Delete ticket (admin only) | Admin clicks delete | Ticket removed from list | Row deleted from `tickets` |

---

## User Management Scenarios (5)

| Scenario | Steps | Expected | DB Check |
|---|---|---|---|
| Create user | Fill name, email, role, click Create | User in list, success toast | `auth.users` row + `profiles` row |
| Create user — duplicate email | Enter existing email | Error: email already exists | No duplicate created |
| Update user role | Edit user, change role to Admin | New role shown in list | `profiles.role_id` updated |
| Deactivate user | Toggle Active off, save | Status = Inactive | `profiles.is_active` = false |
| Delete user | Click delete, confirm | User removed from list | Both `auth.users` and `profiles` deleted (cascade) |

---

## Department Scenarios (3)

| Scenario | Steps | Expected | DB Check |
|---|---|---|---|
| Create department | Enter name, save | Dept in list | `departments` row created |
| Update department | Edit name, save | Updated name shown | `departments.name` updated |
| Delete department | Delete, confirm | Removed from list | Row deleted |

## Role Scenarios (3)

| Scenario | Steps | Expected | DB Check |
|---|---|---|---|
| Create role | Enter name/slug, save | Role in list | `roles` row created |
| Update permissions | Edit role, save | Updated permissions saved | `roles` row updated |
| Delete non-system role | Delete, confirm | Removed from list | Row deleted |

## Category Scenarios (3) — same CRUD pattern as Department
## Priority Scenarios (3) — same CRUD pattern
## Status Scenarios (3) — same CRUD pattern + verify is_default flag
## Ticket Type Scenarios (3) — same CRUD pattern
## Queue Scenarios (3) — same CRUD pattern
## Service Catalog Scenarios (3) — same CRUD pattern
## Custom Field Scenarios (3) — same CRUD pattern
## Escalation Matrix Scenarios (3) — same CRUD pattern
## Approval Rule Scenarios (3) — same CRUD pattern

---

## SLA Policy Scenarios (4)

| Scenario | Steps | Expected | DB Check |
|---|---|---|---|
| Create SLA policy | Fill name, response/resolution times | Policy in list | `sla_policies` row created |
| Assign SLA to ticket type | Link policy to type | Policy applied | FK updated |
| SLA breach detection | Create ticket, advance time past SLA | Ticket flagged as breached | `sla_events.is_breached` = true |
| Business hours config | Set work days/hours | Hours saved | `business_hours` rows created |

---

## Role Access Scenarios (4 roles × 36 routes = 144 checks)

| Route | super_admin | admin | agent | end_user |
|---|---|---|---|---|
| /dashboard | ALLOW | ALLOW | ALLOW | ALLOW |
| /tickets | ALLOW | ALLOW | ALLOW | ALLOW |
| /tickets/new | ALLOW | ALLOW | ALLOW | ALLOW |
| /tickets/:id | ALLOW | ALLOW | ALLOW | ALLOW |
| /masters/users | ALLOW | ALLOW | DENY | DENY |
| /masters/roles | ALLOW | ALLOW | DENY | DENY |
| /masters/departments | ALLOW | ALLOW | DENY | DENY |
| /masters/categories | ALLOW | ALLOW | DENY | DENY |
| /masters/priorities | ALLOW | ALLOW | DENY | DENY |
| /masters/statuses | ALLOW | ALLOW | DENY | DENY |
| /masters/ticket-types | ALLOW | ALLOW | DENY | DENY |
| /masters/queues | ALLOW | ALLOW | DENY | DENY |
| /masters/service-catalog | ALLOW | ALLOW | DENY | DENY |
| /masters/custom-fields | ALLOW | ALLOW | DENY | DENY |
| /masters/escalation-matrix | ALLOW | ALLOW | DENY | DENY |
| /masters/approval-rules | ALLOW | ALLOW | DENY | DENY |
| /sla/policies | ALLOW | ALLOW | DENY | DENY |
| /sla/business-hours | ALLOW | ALLOW | DENY | DENY |
| /workflow | ALLOW | DENY | DENY | DENY |
| /automation/rules | ALLOW | DENY | DENY | DENY |
| /reports/ticket-analytics | ALLOW | ALLOW | DENY | DENY |
| /reports/sla | ALLOW | ALLOW | DENY | DENY |
| /reports/agent-productivity | ALLOW | ALLOW | DENY | DENY |
| /audit-logs | ALLOW | ALLOW | DENY | DENY |
| /notifications | ALLOW | ALLOW | ALLOW | ALLOW |
| /notifications/templates | ALLOW | ALLOW | DENY | DENY |
| /integrations/webhooks | ALLOW | DENY | DENY | DENY |
| /integrations/api-keys | ALLOW | DENY | DENY | DENY |
| /profile | ALLOW | ALLOW | ALLOW | ALLOW |
| /overview | ALLOW | DENY | DENY | DENY |

---

## Workflow Scenarios (4)

| Scenario | Steps | Expected |
|---|---|---|
| Valid transition: Open → In Progress | Change status | Succeeds, ticket_history updated |
| Valid transition: In Progress → Resolved | Change status | Succeeds |
| Invalid transition: Closed → Open | Attempt change | Rejected or blocked |
| Automation rule fires | Create trigger condition | Automated action executes, audit_log entry |

---

## Page Load Scenarios (36 routes — automated)

Every route tested for:
- Page loads without console errors
- Loading state visible (skeleton/spinner) during data fetch
- Empty state visible when no data exists
- Error state visible when API fails (intercepted/mocked)
- Correct page title shown in browser tab / page header
