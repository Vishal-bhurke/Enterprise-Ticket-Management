# Sales & Pre-Sales Guide

> For sales representatives, pre-sales consultants, and business development teams.

---

## Elevator Pitch

Enterprise Ticket System is a production-grade ITSM platform built on Angular 18 and Supabase. It gives IT teams a single pane of glass for ticket management, SLA enforcement, audit compliance, and automation — at a fraction of the cost of Jira Service Management or ServiceNow. You get the source code, the full database schema, and complete ownership of your data from day one.

---

## Target Market Segments

| Segment | Typical Size | Primary Pain Point | Why This System Wins |
|---|---|---|---|
| **Mid-Market IT Departments** | 50–500 users | Jira is too complex, Zendesk too light | Right-sized, fully configurable, no per-seat fees |
| **Enterprise IT Operations** | 500+ users | ServiceNow licensing is prohibitive | Full feature parity at a one-time cost |
| **Managed Service Providers** | Multi-tenant | Need structured queues per department | Queue + department model built in |
| **SaaS Companies** | Engineering teams | Internal helpdesk with dev tool integration | Webhooks + REST API + audit logs |
| **Compliance-Heavy Orgs** | Finance / Healthcare | Need immutable audit trail | Database-level audit triggers, RLS on all tables |

---

## Feature Matrix

| Feature | End User | Agent | Admin | Super Admin |
|---|:---:|:---:|:---:|:---:|
| Create tickets | ✓ | ✓ | ✓ | ✓ |
| View own tickets | ✓ | ✓ | ✓ | ✓ |
| View all tickets | — | ✓ | ✓ | ✓ |
| Add comments | ✓ | ✓ | ✓ | ✓ |
| Add internal notes (agents only) | — | ✓ | ✓ | ✓ |
| Assign / reassign tickets | — | — | ✓ | ✓ |
| Configure master data | — | — | ✓ | ✓ |
| Manage users & roles | — | — | ✓ | ✓ |
| Build workflows | — | — | — | ✓ |
| Manage SLA policies | — | — | ✓ | ✓ |
| Create automation rules | — | — | — | ✓ |
| View reports & analytics | — | — | ✓ | ✓ |
| Access audit logs | — | — | ✓ | ✓ |
| Manage integrations (API/Webhooks) | — | — | — | ✓ |
| System Overview control center | — | — | — | ✓ |

---

## Competitive Positioning

| Criterion | **Enterprise Ticket System** | Jira Service Mgmt | Zendesk | ServiceNow |
|---|---|---|---|---|
| **Source code ownership** | ✓ Full ownership | ✗ SaaS only | ✗ SaaS only | ✗ SaaS only |
| **Self-hostable** | ✓ Any static host | Partial (Data Center) | ✗ | ✗ |
| **Database-layer RLS security** | ✓ All 24 tables | ✗ App-layer only | ✗ | Partial |
| **No per-seat licensing** | ✓ | ✗ per agent/month | ✗ per agent/month | ✗ enterprise licensing |
| **Setup time** | < 1 hour | Days to weeks | Hours | Weeks to months |
| **Supabase / PostgreSQL backend** | ✓ | ✗ | ✗ | ✗ |
| **Custom fields** | ✓ | ✓ | ✓ | ✓ |
| **Automation rules** | ✓ 10 trigger types | ✓ | ✓ | ✓ |
| **Webhook support** | ✓ | ✓ | ✓ | ✓ |
| **Audit logging** | ✓ DB-trigger level | ✓ | Partial | ✓ |

---

## Value Proposition by Persona

### IT Manager

> "I need to know my team is resolving tickets on time, with full visibility into who's doing what."

This system gives you a live dashboard with SLA compliance rates, agent workload, and escalation counts — all in one screen. When an SLA is about to breach, the escalation matrix automatically notifies the right person. No more chasing agents or missing deadlines silently.

### CTO / VP Engineering

> "We need a tool we own and control. I'm not paying $40/agent/month for something we could build ourselves."

You receive the complete source code (Angular 18) and the full database schema (10 migration files, 24 tables). Host it on Netlify for free. Connect it to Supabase's generous free tier. Scale when you need to. There are no recurring software fees beyond hosting.

### Compliance Officer

> "Our auditors want to see a complete record of every change made to every ticket."

Every INSERT, UPDATE, and DELETE on tickets and comments is captured automatically by database triggers — not application code. The audit log stores the actor's ID, IP address, timestamp, old values, and new values as structured JSON. It's tamper-resistant by design.

### Agent

> "I need to see my tickets, respond fast, and know when I'm about to miss an SLA."

The SLA timer on each ticket shows you exactly how much response and resolution time remains — color-coded red/yellow/green. Internal notes let you collaborate with colleagues without the requester seeing your working notes. The notification bell updates in real time.

### End User

> "I just want to raise a request and know it won't get lost."

Your ticket gets a unique ID (TICK-#####) the moment you submit. You receive a notification every time the status changes. You can add comments to provide more information. You can see exactly where your request is in the resolution process.

---

## Common Objections and Responses

**"We already have Jira."**

Jira is a powerful tool for software development project management. However, Jira Service Management adds significant licensing cost ($20–$40/agent/month) and requires dedicated Jira administrators. This system is purpose-built for IT service management with a simpler setup and full source code ownership. Many organizations run both — Jira for dev projects, this system for IT helpdesk.

**"Is it really production-ready? It sounds like a demo."**

This system has a complete 24-table PostgreSQL schema with Row-Level Security on every table, database-level triggers for audit logging and SLA management, 10 ordered migration files, and seed data for all core configuration. The Angular app uses lazy loading, signal-based state management, and proper error/loading/empty states on every page. It is built to the same standard as enterprise SaaS products.

**"What happens if we need support or customizations?"**

You own the source code. Any Angular developer can extend it. The codebase follows a clear layered architecture (standalone components, service layer, Supabase data layer) that is easy to navigate. The full documentation package (this folder) is designed to onboard a new developer in under a day.

---

## Demo Script (Recommended Flow)

Use this sequence for a 20–30 minute live demonstration.

1. **System Overview tab** (Super Admin login) — Show the executive control center. Highlight the live ticket breakdown, SLA compliance %, and configuration status grid. This immediately establishes the "single pane of glass" value.

2. **Dashboard** — Walk through the 8 KPI cards, ticket trend line chart, SLA doughnut, and agent workload table.

3. **Create a Ticket** — Go to Tickets → Create. Fill in title, type (Incident), priority (Critical), category, description. Submit. Show the TICK-##### number assigned instantly.

4. **SLA breach demo** — Open any ticket with a Critical priority. Show the SLA timer card — response due in 1 hour, resolution in 4 hours. Explain that the escalation matrix fires automatically at configurable intervals.

5. **Automation rule** — Go to Automation. Show an existing rule: "When ticket_created AND priority = critical → assign to IT Support queue AND send notification." Explain the AND/OR condition builder and 10 trigger events.

6. **Audit log** — Go to Audit Logs. Open the diff viewer on a recent ticket update. Show the before/after JSON values, actor name, and timestamp.

7. **Webhook configuration** — Go to Integrations → Webhooks. Show the event subscription checkboxes and the HMAC-SHA256 secret for payload verification.

---

## Pricing Considerations

This system is sold as a one-time software asset — not a SaaS subscription. Typical pricing models:

| Model | Description |
|---|---|
| **One-time license** | Pay once, receive source code + documentation + deployment support |
| **White-label** | Rebrand with your company name, logo, and color scheme |
| **Managed deployment** | Vendor handles Supabase setup, migrations, and Netlify deployment |
| **Custom development** | Additional features, integrations, or multi-tenancy added on quote |

Ongoing hosting costs are minimal: Netlify free tier (static hosting) + Supabase free tier (up to 500MB DB, 50K MAU). Paid tiers start at $25/month combined for mid-scale usage.

---

*For a technical deep-dive, share the [Deployment Guide](03-deployment-guide.md) and [Database Schema](06-database-schema.md) with the prospect's technical team.*
