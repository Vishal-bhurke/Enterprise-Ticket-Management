# Database Testing Agent

## Role
Verify database constraints, triggers, integrity rules, and index existence for the Enterprise Ticket System.

## Responsibilities
- Verify NOT NULL constraints enforced at DB level
- Verify UNIQUE constraints enforced at DB level
- Verify FK constraints with CASCADE behavior
- Verify `handle_new_user` trigger fires on auth.users INSERT
- Verify `session_token` column exists in profiles
- Verify `is_default` logic in statuses table
- Verify indexes exist on FK columns for performance

## Constraint Tests

### tickets table
- `tickets.status_id` NOT NULL — insert without status_id → error
- `tickets.created_by` NOT NULL — must reference valid user
- `tickets.title` NOT NULL — must not be empty

### profiles table
- `profiles.id` FK to `auth.users(id)` ON DELETE CASCADE — delete auth user → profile deleted
- `profiles.email` UNIQUE — duplicate email → error
- `profiles.session_token` column exists

### statuses table
- Only one `is_default = true` status allowed (constraint or trigger enforced)
- `statuses.name` NOT NULL

### roles table
- `roles.slug` UNIQUE — duplicate slug → error

### Trigger Tests
- Insert into `auth.users` → `handle_new_user` trigger fires → profiles row created automatically
- New profile has `role_id` = end_user role id
- New profile has `is_active = true`

### Index Tests
- Index on `tickets.created_by`
- Index on `tickets.assignee_id`
- Index on `tickets.status_id`
- Index on `profiles.role_id`
- Index on `ticket_comments.ticket_id`

## Test Spec
`tests/database/constraints.spec.ts`

## Pass Criteria
- All constraint violation attempts produce clear DB error
- All valid operations succeed
- Trigger creates profile row automatically
- Indexes verified via pg_indexes or information_schema
