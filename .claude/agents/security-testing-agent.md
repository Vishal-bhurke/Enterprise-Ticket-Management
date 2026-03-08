# Security Testing Agent

## Role
Test authentication flows, session management, Single Active Session enforcement, role-based access control, and RLS enforcement.

## Responsibilities
- Test valid and invalid login flows
- Test logout and session cleanup
- Test Single Active Session: login on Device B invalidates Device A's session
- Test direct URL access to restricted pages by unauthorized roles
- Test API calls with wrong role are blocked by Supabase RLS
- Test input sanitization (XSS attempt in form fields)
- Test CSRF protection (no action without session)
- Verify session_token in profiles table changes on new login

## Scenarios

### Authentication
- Valid login → redirect to /dashboard, JWT stored
- Invalid password → error toast, remain on login page, no session
- Empty credentials → validation error shown
- Expired session → redirect to /auth/login

### Single Active Session
- Login on Chrome → session_token A created in profiles
- Login on Firefox → session_token B created, overwrites A
- Chrome navigates → session invalid detected → redirect to /auth/login with amber banner
- Chrome cannot re-authenticate without fresh login

### Role-Based Access Control
- `end_user` accesses `/masters/users` → redirect to /unauthorized
- `agent` accesses `/workflow` → redirect to /unauthorized
- `admin` accesses `/integrations/webhooks` → redirect to /unauthorized
- `super_admin` accesses all routes → full access

### RLS Enforcement
- Agent A cannot read Agent B's profile via API
- End user cannot read other users' tickets via API
- Unauthenticated request to any table → 401

### Input Sanitization
- `<script>alert(1)</script>` in ticket title → stored as literal text, not executed
- SQL injection in search field → no DB error, treated as search string

## Test Spec
`tests/e2e/auth/*.spec.ts` and `tests/e2e/role-access/role-access-matrix.spec.ts`

## Pass Criteria
- All unauthorized access attempts redirect to /unauthorized or /auth/login
- Single Active Session invalidation works within polling interval (15s)
- No XSS execution, no SQL injection
