# Skill: Database Integrity Testing

## Trigger
"test database constraints for [table]" or "verify DB integrity"

## Input
- Table name
- Constraint type: NOT_NULL | UNIQUE | FK | TRIGGER | CHECK
- Violating data to attempt inserting

## Steps
1. Connect to Supabase using service role key via `supabase.helper.ts`
2. **NOT NULL test**: attempt INSERT without required column → expect `23502` error code (not_null_violation)
3. **UNIQUE test**: insert duplicate value into unique column → expect `23505` error code (unique_violation)
4. **FK test**: insert row with non-existent FK value → expect `23503` error code (foreign_key_violation)
5. **CASCADE test**: delete parent row → verify child rows deleted automatically (or restricted)
6. **TRIGGER test**: insert into `auth.users` → verify corresponding `profiles` row created by `handle_new_user` trigger
7. **CHECK test**: insert value outside CHECK constraint range → expect `23514` error code (check_violation)
8. **Valid insert**: insert valid data → expect success

## Output
- PASS: all constraint violations produce correct error codes; valid data inserts successfully
- FAIL: which constraint did not enforce correctly + actual DB response

## Reusable in
`tests/database/constraints.spec.ts`
