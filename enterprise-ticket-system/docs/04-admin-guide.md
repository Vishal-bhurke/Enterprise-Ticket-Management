# Admin & Super Admin Guide

> For system administrators and super administrators who configure, operate, and maintain the Enterprise Ticket System.

---

## Role Permissions Overview

| Feature Area | Admin | Super Admin |
|---|:---:|:---:|
| View all tickets | ✓ | ✓ |
| Assign / reassign tickets | ✓ | ✓ |
| Delete tickets | ✓ | ✓ |
| Masters (Users, Roles, Departments, etc.) | ✓ | ✓ |
| SLA Policies | ✓ | ✓ |
| Business Hours | ✓ | ✓ |
| Workflow Builder | — | ✓ |
| Automation Rules | — | ✓ |
| Integrations (API Keys, Webhooks) | — | ✓ |
| Reports & Analytics | ✓ | ✓ |
| Audit Logs | ✓ | ✓ |
| Notification Templates | ✓ | ✓ |
| System Overview tab | — | ✓ |

---

## Masters — Configuring System Data

Masters are the foundational configuration tables. Everything else — ticket creation, SLA policies, automation rules — depends on master data being set up correctly.

### Master Data Reference

| Master | Route | Purpose | Key Fields |
|---|---|---|---|
| **Users** | Sidebar → Masters → Users | Manage all user accounts and role assignments | Full name, email, role, department, employee ID |
| **Roles** | Sidebar → Masters → Roles | Define permission sets | Name, slug, permissions JSON |
| **Departments** | Sidebar → Masters → Departments | Organizational hierarchy | Name, code, parent department |
| **Categories** | Sidebar → Masters → Categories | Ticket classification (hierarchical) | Name, code, parent category |
| **Priorities** | Sidebar → Masters → Priorities | Urgency levels with SLA multipliers | Name, level (1–4), color, SLA multiplier |
| **Statuses** | Sidebar → Masters → Statuses | Ticket lifecycle states | Name, category, is_default, is_closed, sort order |
| **Ticket Types** | Sidebar → Masters → Ticket Types | Incident / SR / Problem / Change / Task | Name, slug, default priority, custom field schema |
| **Queues** | Sidebar → Masters → Queues | Agent teams or routing buckets | Name, team lead, members |
| **Service Catalog** | Sidebar → Masters → Service Catalog | Self-service request items | Name, category, default ticket type, default priority |
| **Custom Fields** | Sidebar → Masters → Custom Fields | Extend ticket forms per type | Name, field type, options (for select), required flag |
| **Escalation Matrix** | Sidebar → Masters → Escalation Matrix | Escalation chains and timing | Name, escalation rules (level, timing, action) |
| **Approval Rules** | Sidebar → Masters → Approval Rules | Workflow approval configuration | Name, approval type, approver roles |
| **Business Hours** | Sidebar → SLA → Business Hours | Working hour schedules for SLA timing | Name, timezone, Mon–Sun schedule |

---

## User Management

### Creating a New User

1. Go to **Sidebar → Masters → Users**
2. Click **+ Add User**
3. Fill in: Full Name (required), Email (required), Employee ID (optional), Role (required), Department (optional)
4. Click **Save**
5. The user receives a Supabase email invitation to set their password

### Editing a User

1. Go to **Sidebar → Masters → Users**
2. Find the user in the table (use the search bar to filter by name or email)
3. Click the **Edit** (pencil) icon
4. Update the fields you need — note that email cannot be changed after creation
5. Click **Save**

### Deactivating a User

1. Edit the user record
2. Toggle **Active** to OFF
3. Click **Save**

The user will no longer be able to log in, but their ticket history and comments are preserved.

---

## Workflow Builder

The Workflow Builder lets you define how tickets move between statuses. Each workflow is a set of allowed transitions (from status → to status), with optional role restrictions and approval gates.

> **Access:** Super Admin only (Sidebar → Workflow Builder)

### Create a Workflow Definition

1. Go to **Sidebar → Workflow Builder**
2. Click **+ New Workflow**
3. Enter a name (e.g., "Standard IT Workflow") and an optional description
4. Toggle **Is Default** ON if this workflow should apply to all new tickets

### Add Transitions

Each transition defines one allowed movement between two statuses.

1. In your workflow definition, click **+ Add Transition**
2. Set:
   - **Name** — a label for this transition (e.g., "Start Work")
   - **From Status** — the current status (leave blank for the initial "open" state)
   - **To Status** — the target status
   - **Allowed Roles** — which roles can perform this transition (leave empty for all roles)
   - **Requires Approval** — toggle ON to require an approval gate before the transition completes
   - **Approval Rule** — select which approval rule applies (if approval required)
3. Click **Save Transition**

### Link Workflow to a Ticket Type

1. Go to **Masters → Ticket Types**
2. Edit the ticket type (e.g., "Change Request")
3. Set **Default Workflow** to your new workflow definition
4. Save

---

## SLA Management

SLA (Service Level Agreement) policies define how quickly tickets must receive a response and resolution.

> **Access:** Admin and Super Admin (Sidebar → SLA Management)

### Understanding SLA Components

- **Response time** — maximum time before the first agent response on a ticket
- **Resolution time** — maximum total time before the ticket is resolved
- **Business hours** — the working schedule used to calculate elapsed time
- **SLA multiplier** — the priority's multiplier adjusts the SLA times (Critical = 0.5× = twice as fast)
- **Escalation matrix** — the escalation chain that fires when the SLA is approaching breach

### Create a Business Hours Schedule

1. Go to **Sidebar → SLA → Business Hours**
2. Click **+ Add Schedule**
3. Enter a name (e.g., "Standard IST Hours") and select a timezone
4. Toggle each day ON/OFF and set start/end times
5. Click **Save**

### Create an SLA Policy

1. Go to **Sidebar → SLA → SLA Policies**
2. Click **+ Add Policy**
3. Fill in:
   - **Name** — descriptive label (e.g., "Critical Priority SLA")
   - **Priority** — which priority level this policy applies to
   - **Ticket Type** — (optional) restrict to a specific ticket type
   - **Response Time (hours)** — maximum hours for first response
   - **Resolution Time (hours)** — maximum hours for full resolution
   - **Business Hours** — select a schedule (affects how hours are counted)
   - **Escalation Matrix** — (optional) which escalation chain to trigger
4. Click **Save**

The SLA engine automatically applies the matching policy to new tickets based on priority and type.

---

## Automation Rules

Automation rules execute actions automatically when ticket events occur.

> **Access:** Super Admin only (Sidebar → Automation Rules)

### Trigger Events

| Trigger Event | Fires When |
|---|---|
| `ticket_created` | A new ticket is submitted |
| `ticket_updated` | Any field on a ticket changes |
| `ticket_assigned` | The assignee field changes |
| `ticket_resolved` | Ticket status moves to a "resolved" category |
| `ticket_closed` | Ticket status moves to a "closed" category |
| `comment_added` | A new comment is posted |
| `sla_breached` | An SLA deadline is missed |
| `status_changed` | Ticket status changes (any transition) |
| `priority_changed` | Ticket priority changes |
| `scheduled` | A time-based trigger (cron-style) |

### Conditions

Each rule can have one or more conditions that must be true for the rule to fire:

- **Field** — priority, status, ticket_type, category, department, assignee, tag, title
- **Operator** — equals, not_equals, contains, in, not_in, is_empty
- **Value** — the comparison value

Multiple conditions are evaluated with AND logic (all must be true) or OR logic (any must be true).

### Actions

When the conditions match, the rule executes one or more actions:

| Action | What It Does |
|---|---|
| `assign_to` | Assigns the ticket to a specific user |
| `assign_round_robin` | Assigns to the next agent in a queue rotation |
| `set_priority` | Changes the ticket priority |
| `change_status` | Changes the ticket status |
| `add_tag` | Appends a tag to the ticket |
| `send_notification` | Sends an in-app or email notification using a template |
| `call_webhook` | POSTs the ticket payload to a configured webhook URL |

### Run Order and Stop on Match

- **Run order** — rules are evaluated in ascending numeric order (1 first, 999 last)
- **Stop on match** — if enabled, no further rules are evaluated after this rule fires

> **Best practice:** Always test a new automation rule on a low-priority test ticket before enabling it for all ticket types. Set **Stop on match = OFF** during testing so you can observe all rules that would fire.

### Create an Automation Rule

1. Go to **Sidebar → Automation Rules**
2. Click **+ New Rule**
3. Set the rule name, trigger event, and run order
4. Add one or more conditions (use AND/OR toggle)
5. Add one or more actions
6. Toggle **Active** ON when ready
7. Click **Save**

---

## Notification Templates

Notification templates define the content of in-app and email notifications sent to users.

> **Access:** Admin and Super Admin (Sidebar → Notifications → Templates)

### Seeded Templates

Eight notification templates are included by default:

| Template | Channel | Sent When |
|---|---|---|
| Ticket Created | In-App + Email | New ticket is submitted |
| Ticket Assigned | In-App + Email | Ticket is assigned to an agent |
| Ticket Status Changed | In-App | Status changes on a ticket |
| SLA Breach Warning | In-App + Email | SLA is approaching (80% of time used) |
| SLA Breached | In-App + Email | SLA deadline is missed |
| Ticket Resolved | In-App + Email | Ticket moves to resolved status |
| Comment Added | In-App | New comment posted on a ticket |
| Mentioned in Comment | In-App | User is @mentioned in a comment |

### Template Variables (Handlebars Syntax)

Templates use `{{ variable_name }}` placeholders:

| Variable | Description |
|---|---|
| `{{ ticket_number }}` | TICK-##### identifier |
| `{{ ticket_title }}` | Ticket subject line |
| `{{ recipient_name }}` | Full name of the notification recipient |
| `{{ ticket_url }}` | Direct link to the ticket detail page |
| `{{ agent_name }}` | Assigned agent's full name |
| `{{ status_name }}` | Current status label |
| `{{ priority_name }}` | Priority label |

---

## Reports

> **Access:** Admin and Super Admin (Sidebar → Analytics → Reports)

### Ticket Analytics

Path: Sidebar → Analytics → Reports → Ticket Analytics

Shows: total, open, resolved, and escalated ticket counts. Bar charts for distribution by category and priority. Recent tickets table with filters. Export to CSV.

### SLA Report

Path: Sidebar → Analytics → Reports → SLA Report

Shows: response SLA compliance %, resolution SLA compliance %, total breaches, and per-ticket SLA status table. Filter by time period (7/30/90 days, all time).

### Agent Productivity

Path: Sidebar → Analytics → Reports → Agent Productivity

Shows: per-agent table with assigned tickets, resolved, open, average resolution time (hours), SLA met/breached count, and resolution rate %. Sortable columns.

---

## Audit Logs

> **Access:** Admin and Super Admin (Sidebar → Analytics → Audit Logs)

The audit log shows every INSERT, UPDATE, and DELETE event on tickets and comments.

### Reading the Audit Log

- **Action** — INSERT (green), UPDATE (amber), DELETE (red)
- **Entity Type** — ticket, ticket_comment, profile, status, etc.
- **Entity ID** — the UUID of the affected record (first 8 characters shown)
- **Actor** — full name and email of the user who made the change (or "System" for trigger-based changes)
- **Timestamp** — exact date and time

### Viewing the Change Diff

Click **View Changes** on any UPDATE row to see:
- **Before** (red background) — the field values before the change
- **After** (green background) — the field values after the change

### Filters

- Search by entity ID or actor name/email
- Filter by entity type (ticket, profile, etc.)
- Filter by action (INSERT / UPDATE / DELETE)

---

## System Overview Tab

> **Access:** Super Admin only (Sidebar → Overview)

The System Overview tab is a dedicated control center for Super Admins. It provides a consolidated view of:

- System health metrics (total users, total tickets, SLA compliance %, active automations)
- Ticket breakdown by status category
- Recent audit activity (last 5 events)
- Configuration status for all 10 master/config areas
- Integration health (active webhooks + API keys)
- Quick action buttons for common admin tasks

For full documentation of this tab, see [Overview Tab Guide](08-overview-tab-guide.md).

---

## Best Practices

> Keep these rules in mind to avoid common configuration mistakes.

1. **Never delete system roles.** The roles `super_admin`, `admin`, `agent`, and `end_user` are seeded by the system. Deleting them will break authentication guards and RLS policies.

2. **Run migrations in order.** If setting up a new Supabase project, always apply migration files 001 through 010 in sequence. See [Deployment Guide](03-deployment-guide.md).

3. **Test automation rules on low-priority tickets.** Before enabling a new automation rule for all ticket types, create a test ticket with Low priority and verify the rule fires as expected without unintended side effects.

4. **Set at least one default status.** Every ticket must have a default status on creation. Go to Masters → Statuses and ensure exactly one status has **Is Default = ON**.

5. **Configure SLA policies before creating tickets.** SLA timers are applied at ticket creation time. Tickets created before SLA policies exist will not have SLA tracking.

6. **Use the SLA multiplier on priorities.** Critical tickets should have a multiplier below 1.0 (e.g., 0.5) to make their SLA times shorter. Low tickets should have a multiplier above 1.0 (e.g., 1.5) to allow more time.

7. **Business hours affect SLA calculations.** If your team does not work weekends, select a "Mon–Fri 9–6" business hours schedule for your SLA policies. SLA time does not count during non-working hours.
