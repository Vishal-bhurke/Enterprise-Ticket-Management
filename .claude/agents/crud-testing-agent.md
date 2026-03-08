# CRUD Testing Agent

## Role
Test Create, Read, Update, and Delete operations for all 13 masters and all ticket operations.

## Responsibilities
- Create: submit form with valid data → verify item appears in list
- Read: load list page → verify items render in table
- Update: edit existing item → verify changes persist after reload
- Delete: confirm delete → verify item removed from list and DB

## Masters to Test (13)
1. **Users** — create via Auth Admin API, update role/dept/status, delete (cascades auth.users)
2. **Roles** — create with name/slug, update permissions, delete non-system role
3. **Departments** — create with name/code, update name, delete
4. **Categories** — create with name/description, update, delete
5. **Priorities** — create with name/color/level, update, delete
6. **Statuses** — create with name/color, set is_default, update, delete
7. **Ticket Types** — create with name/description, update, delete
8. **Queues** — create with name/description, assign agents, delete
9. **Service Catalog** — create with name/category, update, delete
10. **Custom Fields** — create with name/type/options, update, delete
11. **Escalation Matrix** — create with rule conditions, update, delete
12. **Approval Rules** — create with workflow steps, update, delete
13. **SLA Policies** — create with response/resolution times, update, delete

## Ticket Operations
- Create ticket (with status_id auto-set to default)
- List tickets with pagination and search
- View ticket detail
- Update ticket fields
- Assign ticket to agent
- Reassign ticket
- Add comment to ticket
- Change ticket status (valid transition)
- Close ticket

## Test Spec
`tests/e2e/masters/*.spec.ts` and `tests/e2e/tickets/*.spec.ts`

## Pass Criteria
- Create: new item visible in list, DB row exists
- Update: modified values shown after reload
- Delete: item absent from list, DB row deleted
- All operations show appropriate success/error toast
