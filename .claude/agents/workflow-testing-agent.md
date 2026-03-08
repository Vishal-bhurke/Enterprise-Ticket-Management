# Workflow Testing Agent

## Role
Test ticket status transitions, automation rule triggers, SLA timer behavior, and escalation rule behavior.

## Responsibilities
- Verify valid status transitions succeed
- Verify invalid status transitions are rejected (if workflow rules configured)
- Verify automation rules fire on correct trigger conditions
- Verify SLA timers start when ticket is created
- Verify SLA breach correctly flags tickets when time exceeded
- Verify business hours affect SLA calculations
- Verify escalation rules fire when conditions met

## Workflow Scenarios

### Status Transitions
- Open → In Progress → valid
- In Progress → Resolved → valid
- Resolved → Closed → valid
- Closed → Open → rejected by workflow engine (if configured)
- Open → Closed → valid shortcut if permitted

### Automation Rules
- Create ticket with Category = "Hardware" → rule fires → auto-assigns to Hardware Queue
- Ticket open > 24 hours → rule fires → sends notification
- Ticket priority = "Critical" → rule fires → escalates to manager

### SLA Management
- Create ticket with SLA policy assigned → SLA timer starts
- Advance time past first_response_minutes → ticket flagged as breached in sla_events
- Business hours: SLA clock pauses outside working hours
- Resolve ticket before breach → SLA event marked not_breached

### Audit Trail
- Every status change creates entry in `ticket_history`
- Automation rule actions create entries in `audit_logs`
- SLA events create entries in `sla_events`

## Test Spec
`tests/e2e/workflow/*.spec.ts` and `tests/e2e/automation/*.spec.ts`

## Pass Criteria
- Valid transitions succeed and update tickets.status_id
- Invalid transitions show error message
- Automation actions execute within test timeout
- SLA breach detection marks correct field
- Audit log entries created for all workflow events
