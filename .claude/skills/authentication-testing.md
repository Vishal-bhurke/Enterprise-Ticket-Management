# Skill: Authentication Testing

## Trigger
"test login flow" or "test authentication for [role]"

## Input
- Credentials: email and password (valid or invalid)
- Expected outcome: success (redirect to /dashboard) or failure (stay on login, error shown)

## Steps
1. Navigate to `/auth/login`
2. Enter email in email field
3. Enter password in password field
4. Click "Sign In" button
5. **If valid credentials**: verify redirect to `/dashboard` within 5s; verify user name shown in header; verify JWT stored in localStorage/cookies
6. **If invalid credentials**: verify error toast shown; verify page stays on `/auth/login`; verify no JWT stored
7. **Logout flow**: click user menu → "Sign Out" → verify redirect to `/auth/login`; verify JWT cleared; verify accessing `/dashboard` redirects back to login

## Single Active Session Test
1. Login on Chrome (Session A)
2. Login on Firefox (Session B) — same account
3. In Chrome: navigate to any page
4. Verify Chrome redirects to `/auth/login` with session invalidation banner (amber/warning)
5. Verify `profiles.session_token` has been updated

## Output
- PASS: auth flow works as expected for all scenarios
- FAIL: which step failed + actual vs expected outcome

## Reusable in
`tests/e2e/auth/*.spec.ts`
