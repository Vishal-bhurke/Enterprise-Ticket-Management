# Skill: Role Access Testing

## Trigger
"test role access for [role]" or "verify [role] can/cannot access [route]"

## Input
- Role name: super_admin | admin | agent | end_user
- List of routes to test
- Expected access for each route: ALLOW | DENY (redirect to /unauthorized)

## Steps
1. Login as the specified role using test credentials
2. For each route in the list:
   a. Navigate directly to the URL
   b. If ALLOW expected: verify page loads (not /unauthorized, not /auth/login)
   c. If DENY expected: verify redirect to `/unauthorized` within 2s
3. Verify role-specific UI elements: admin sees action buttons; agent/end_user do not

## Role Access Matrix (confirmed from app.routes.ts)

| Route | super_admin | admin | agent | end_user |
|---|---|---|---|---|
| /dashboard | ALLOW | ALLOW | ALLOW | ALLOW |
| /tickets | ALLOW | ALLOW | ALLOW | ALLOW |
| /masters/* | ALLOW | ALLOW | DENY | DENY |
| /sla/* | ALLOW | ALLOW | DENY | DENY |
| /workflow | ALLOW | DENY | DENY | DENY |
| /automation/* | ALLOW | DENY | DENY | DENY |
| /reports/* | ALLOW | ALLOW | DENY | DENY |
| /audit-logs | ALLOW | ALLOW | DENY | DENY |
| /notifications/* | ALLOW | ALLOW | ALLOW | ALLOW |
| /integrations/* | ALLOW | DENY | DENY | DENY |
| /overview | ALLOW | DENY | DENY | DENY |
| /profile | ALLOW | ALLOW | ALLOW | ALLOW |

## Output
- PASS: all route access matches expected matrix
- FAIL: which routes had incorrect access + actual vs expected behavior

## Reusable in
`tests/e2e/role-access/role-access-matrix.spec.ts`
