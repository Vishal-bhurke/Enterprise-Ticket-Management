# System Overview Tab — Guide

> Documentation for the System Overview control center, accessible exclusively to Super Admins.

---

## Purpose

The System Overview tab is a single-screen executive control center for Super Admins. It answers the question **"Is my system healthy?"** without having to navigate across 8 different pages.

Instead of opening Dashboard → Reports → Audit Logs → Masters → SLA → Integrations one by one, the Overview tab aggregates the most critical health signals from across the entire system onto one screen — loaded in parallel in under a second.

---

## Access

| Who can see it | How to open it |
|---|---|
| **Super Admin only** | Sidebar → **Overview** (first item, `pi-th-large` icon) |
| Admin, Agent, End User | Not visible in sidebar. Direct navigation to `/overview` redirects to `/unauthorized` |

The route is protected by `roleGuard(['super_admin'])` at the Angular router level and by Row-Level Security at the Supabase database level.

---

## Screen Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  System Overview                            [Refresh button]        │
│  Executive control center — system health at a glance               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Total Users  │ │Total Tickets │ │SLA Compliance│ │Active Auto-│ │
│  │     142      │ │    1,847     │ │     94%      │ │mations: 12 │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
├────────────────────────────────┬────────────────────────────────────┤
│  Ticket Breakdown              │  Recent Audit Activity             │
│  ● Open          48            │  UPDATED   ticket   Alice · 2m ago │
│  ● In Progress   31            │  CREATED   ticket   Bob · 15m ago  │
│  ● Resolved      12            │  STATUS_C  ticket   Alice · 1h ago │
│  ● Escalated      5            │  CREATED   profile  System · 2h ago│
│  [View all tickets →]          │  [Full audit log →]                │
├────────────────────────────────┼────────────────────────────────────┤
│  Configuration Status          │  Integration Health                │
│  ✓ Roles          4            │  ┌────────────────────────────┐    │
│  ✓ Departments    5            │  │ 🔵 Active Webhooks      3  │    │
│  ✓ Categories     8            │  └────────────────────────────┘    │
│  ✓ Priorities     4            │  ┌────────────────────────────┐    │
│  ✓ Statuses       7            │  │ 🟡 Active API Keys      2  │    │
│  ✓ Ticket Types   5            │  └────────────────────────────┘    │
│  ✓ Queues         5            │  [Manage integrations →]           │
│  ✓ SLA Policies   4            │                                    │
│  ✓ Business Hours 2            │                                    │
│  ✓ Automation    12            │                                    │
├────────────────────────────────┴────────────────────────────────────┤
│  Quick Actions                                                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │  Add User   │ │Configure SLA│ │Build Wflow  │ │Create Auto  │  │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Section Reference

| Section | Data Source | What It Shows | Refresh |
|---|---|---|---|
| **System Health Bar** | profiles, tickets, sla_events, automation_rules | Total Users, Total Tickets, SLA Compliance %, Active Automations | On page load / manual refresh |
| **Ticket Breakdown** | tickets joined to statuses | Open / In Progress / Resolved / Escalated counts | On page load / manual refresh |
| **Recent Audit Activity** | audit_logs joined to profiles | Last 5 change events with actor and timestamp | On page load / manual refresh |
| **Configuration Status** | COUNT queries on 10 master tables | Configured record count per master area | On page load / manual refresh |
| **Integration Health** | webhook_configs, api_keys | Active webhooks and API key counts | On page load / manual refresh |
| **Quick Actions** | Static links | Shortcut buttons to common admin destinations | N/A — static |

---

## Section Details

### System Health Bar (Top Row)

Four KPI cards summarizing the most critical system metrics.

| Card | Source Query | Color |
|---|---|---|
| **Total Users** | `COUNT(*) FROM profiles` | Blue |
| **Total Tickets** | `COUNT(*) FROM tickets` | Purple |
| **SLA Compliance %** | `(total_resolution_events - breached) / total_resolution_events × 100` from `sla_events` | Green |
| **Active Automations** | `COUNT(*) FROM automation_rules WHERE is_active = true` | Amber |

The SLA Compliance % is calculated from resolved tickets only (those with a completed `resolution` SLA event). It shows `100%` when no resolution events exist yet.

---

### Ticket Breakdown

Shows the live count of tickets in each stage, with a color-coded dot per category:

- **Open** (blue) — tickets awaiting pickup
- **In Progress** (purple) — actively being worked on
- **Resolved** (green) — fixed, awaiting confirmation
- **Escalated** (orange) — flagged with `is_escalated = true`

Click **"View all tickets →"** to navigate directly to the full ticket list.

---

### Recent Audit Activity

Shows the last 5 entries from the audit log with:

- **Action badge** — color-coded: CREATED (green), UPDATED (amber), STATUS_CHANGED (blue), REASSIGNED (purple), DELETED (red)
- **Entity type** — the record type that changed (e.g., "ticket", "profile", "status")
- **Actor** — the full name of the user who made the change, or "System" for trigger-based changes
- **Time ago** — relative timestamp (e.g., "2m ago", "3h ago")

Click **"Full audit log →"** to open the complete audit log with filters and diff viewer.

---

### Configuration Status

A grid of 10 master configuration areas, each showing:

- **Green ✓ icon** — at least one record is configured in this area
- **Red ✗ icon** — zero records exist — action needed
- **Count** — the number of configured records

| Area | Why It Matters |
|---|---|
| Roles | Required for authentication and access control |
| Departments | Used for ticket routing and agent assignment |
| Categories | Used for ticket classification and analytics |
| Priorities | Required — every ticket must have a priority |
| Statuses | Required — tickets need at least one default status |
| Ticket Types | Required — every ticket must have a type |
| Queues | Used for team-based routing and assignment |
| SLA Policies | Required for SLA tracking to function |
| Business Hours | Required for accurate SLA time calculations |
| Automation Rules | Optional — zero is fine if you use manual processes |

> **Important:** Items marked with a red ✗ may cause ticket creation errors or missing SLA tracking. Click any item to navigate directly to its configuration page.

---

### Integration Health

Shows the count of active integration configurations:

- **Active Webhooks** — outbound webhook endpoints with `is_active = true`
- **Active API Keys** — API keys with `is_active = true`

Click **"Manage integrations →"** to open the full integrations page.

---

### Quick Actions

Four clickable tiles for the most frequent Super Admin tasks:

| Tile | Navigates To | Use Case |
|---|---|---|
| **Add User** | /masters (Users tab) | Onboard a new team member |
| **Configure SLA** | /sla | Create or adjust SLA policies |
| **Build Workflow** | /workflow | Define a new status transition workflow |
| **Create Automation** | /automation | Add a new event-driven rule |

---

## Data Refresh

All data on the Overview tab is loaded **on page open** using parallel Supabase queries. There is no automatic polling or real-time subscription on this page.

To refresh the data:
- Click the **Refresh** button in the top-right of the page header
- Or navigate away and return to the Overview tab

The page shows skeleton placeholders in all sections while loading. If any query fails, an error banner appears with a **Try Again** button.

---

## Interpreting Configuration Status

### All green ✓

Your system is fully configured. All master data areas have at least one record. Ticket creation and SLA tracking will function normally.

### One or more red ✗

| Red item | Potential impact |
|---|---|
| Statuses = 0 | Tickets cannot be created (no default status) |
| Priorities = 0 | Ticket creation form will have no priority options |
| Ticket Types = 0 | Ticket creation form will have no type options |
| SLA Policies = 0 | New tickets will have no SLA tracking |
| Business Hours = 0 | SLA policies cannot calculate adjusted deadlines |
| Roles = 0 | Authentication and access control will break |

Click the red item to go directly to that configuration page and add the missing data.

---

## Interpreting Integration Health

| Count | Meaning |
|---|---|
| **Webhooks = 0** | No external systems will receive event notifications from this system |
| **Webhooks > 0** | External systems are connected. Check the Integrations page for `failure_count` — a high count indicates a failing endpoint |
| **API Keys = 0** | No external systems are accessing the REST API |
| **API Keys > 0** | External systems have API access. Review which keys are active and when they were last used |

---

*This feature was implemented in Phase 5+ as part of the Super Admin control center. For technical implementation details, see [src/app/features/overview/overview.component.ts](../src/app/features/overview/overview.component.ts).*
