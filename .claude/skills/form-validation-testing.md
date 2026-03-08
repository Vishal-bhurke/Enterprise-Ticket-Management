# Skill: Form Validation Testing

## Trigger
"test form validation on [page]" or "validate [form name] form"

## Input
- Form page URL
- List of required fields with their selectors
- Valid test data object

## Steps
1. Navigate to the form page
2. **Empty submission test**: click Submit without filling any fields → verify error state shown for each required field, form not submitted
3. **Invalid data test**: fill fields with invalid data (bad email format, too-short name) → verify field-level error messages appear
4. **Partial submission test**: fill only some required fields → verify remaining required fields block submission
5. **Valid submission test**: fill all fields with valid test data → verify form submits, success toast appears, dialog/page resets
6. **Uniqueness test** (where applicable): submit duplicate data → verify unique constraint error shown as toast
7. **Readonly field test** (where applicable): verify disabled/readonly fields cannot be edited (e.g., email in edit-user dialog)

## Output
- PASS: all validation scenarios work correctly
- FAIL: which validation case failed + screenshot

## Reusable in
All spec files in `tests/e2e/masters/*.spec.ts`, `tests/e2e/tickets/*.spec.ts`, `tests/e2e/auth/*.spec.ts`
