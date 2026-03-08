# Skill: Workflow Transition Testing

## Trigger
"test status transition from [status] to [status]" or "verify ticket workflow"

## Input
- Ticket ID or create a new test ticket
- From-status (current status name)
- To-status (target status name)
- Expected result: SUCCESS | REJECTED

## Steps
1. Login as admin or agent
2. Navigate to ticket detail page (`/tickets/:id`)
3. Note current status badge
4. Open status dropdown or click status change control
5. Select target status
6. Click save/confirm
7. **If SUCCESS expected**:
   - Verify status badge updates to target status
   - Verify `ticket_history` entry created with old and new status
   - Verify `audit_logs` entry created
8. **If REJECTED expected**:
   - Verify error toast or confirmation blocked
   - Verify status badge unchanged

## Automation Rule Trigger Test
1. Create ticket that matches automation rule condition
2. Verify automated action executes (e.g., auto-assign, auto-notify)
3. Verify action logged in `audit_logs`

## Output
- PASS: transition behaves correctly, DB updated consistently
- FAIL: unexpected transition result + screenshot of status area

## Reusable in
`tests/e2e/workflow/workflow-transitions.spec.ts`
