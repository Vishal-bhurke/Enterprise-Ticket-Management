# Skill: API Endpoint Testing

## Trigger
"test API endpoint for [table]" or "verify RLS on [table]"

## Input
- Supabase table name
- Operation to test (SELECT | INSERT | UPDATE | DELETE)
- Role context (unauthenticated | anon | authenticated_user | admin | super_admin)

## Steps
1. **Unauthenticated request**: send REST request with no Authorization header → expect 401 or 403
2. **Anon key request** (for public-readable tables): send with anon key → verify only permitted data returned
3. **Authenticated user request**: send with user's JWT from login → verify RLS filters to own data
4. **Admin request**: send with admin JWT → verify broader data access
5. **Service key request** (for admin operations): send with service role key → verify full access
6. Verify response payload shape matches expected interface (fields present, types correct)
7. Verify 4xx responses include meaningful error message in response body

## Output
- PASS: correct HTTP status codes and data for each permission level
- FAIL: which permission level returned wrong status or wrong data

## Reusable in
`tests/api/*.spec.ts` — all API test files
