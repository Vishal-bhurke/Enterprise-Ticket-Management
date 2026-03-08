# Skill: CRUD Operation Testing

## Trigger
"test CRUD for [master name]" or "verify create/read/update/delete for [entity]"

## Input
- Master/entity name (e.g., "Department", "Category", "SLA Policy")
- Valid create data
- Valid update data
- Admin credentials (CRUD operations require admin or super_admin)

## Steps
1. **Create**: Login as admin → click "Add [Entity]" → fill form with valid data → submit → verify item appears in list table → verify DB row exists using `supabase.helper.ts`
2. **Read**: Reload page → verify list loads with item → verify all columns show correct data
3. **Update**: Click edit icon on item → modify fields → save → verify updated values shown in list → verify DB row has new values
4. **Delete**: Click delete icon → confirm dialog → verify item removed from list → verify DB row deleted
5. **Cascade check** (where applicable): delete parent entity → verify child entities handled correctly

## Output
- PASS: full CRUD chain completed successfully, DB consistent with UI
- FAIL: which step failed + current DB state + screenshot

## Reusable in
`tests/e2e/masters/*.spec.ts` — one spec file per master entity
