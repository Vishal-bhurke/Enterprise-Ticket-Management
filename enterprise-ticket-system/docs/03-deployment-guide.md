# Deployment Guide

> For DevOps engineers, system integrators, and technical administrators setting up the system for the first time or deploying to a new environment.

---

## Prerequisites

Before you begin, make sure you have the following:

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm 9+** — bundled with Node.js
- **Angular CLI 18** — `npm install -g @angular/cli@18`
- **Supabase account** — [supabase.com](https://supabase.com) (free tier is sufficient)
- **Netlify account** (optional) — [netlify.com](https://netlify.com) for static hosting, or use any web server

---

## Environment Variables

The application reads Supabase credentials from the Angular environment files.

| Variable | File Location | Purpose |
|---|---|---|
| `supabaseUrl` | `src/environments/environment.ts` | Supabase project REST API URL |
| `supabaseAnonKey` | `src/environments/environment.ts` | Supabase anonymous (public) key |
| Service key | **Edge functions only** — never in frontend code | Server-side operations |

**Example `src/environments/environment.ts`:**

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY_HERE',
  },
  appName: 'Enterprise Ticket System',
  version: '1.0.0',
};
```

Replace the same values in `src/environments/environment.prod.ts` for production builds.

> **Security note:** The anon key is safe to include in frontend code — it is a public key. Supabase Row-Level Security policies control what each authenticated user can access. Never include the service key in frontend code.

---

## Supabase Setup

### Step 1 — Create a Supabase Project

1. Log in to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Choose your organization, set a project name, database password, and region
4. Wait for the project to initialize (approximately 2 minutes)

### Step 2 — Get Your Credentials

1. In the Supabase dashboard, go to **Settings → API**
2. Copy the **Project URL** → paste into `environment.ts` as `supabaseUrl`
3. Copy the **anon / public key** → paste into `environment.ts` as `supabaseAnonKey`
4. Copy the **service_role key** → store securely (only for server-side/edge function use)

### Step 3 — Configure Authentication

1. Go to **Authentication → Providers**
2. Ensure **Email** provider is enabled
3. Under **Authentication → Email Templates**, customize the confirmation and password reset emails if needed
4. Under **Authentication → URL Configuration**, set your **Site URL** to your production domain (e.g., `https://your-app.netlify.app`)

---

## Running Migrations

The database schema is defined across 10 ordered migration files. They must be applied in numeric order.

> **Why this matters:** Migration `008_rls_policies.sql` creates Row-Level Security policies that reference tables created in migrations `001` through `007`. Running them out of order will cause foreign key or reference errors.

### Migration Files

| File | Tables Created |
|---|---|
| `001_core_tables.sql` | roles, departments, profiles |
| `002_ticket_tables.sql` | priorities, statuses, categories, ticket_types, queues, queue_members, tickets, ticket_links, ticket_comments, ticket_attachments |
| `003_workflow_tables.sql` | approval_rules, workflow_definitions, workflow_transitions, approval_requests |
| `004_sla_tables.sql` | business_hours, escalation_matrices, escalation_rules, escalation_logs, sla_policies, sla_events |
| `005_automation_tables.sql` | automation_rules, automation_logs, webhook_configs |
| `006_notification_tables.sql` | notification_templates, notifications, service_catalog, custom_fields |
| `007_audit_tables.sql` | audit_logs, api_keys, ticket_watchers |
| `008_rls_policies.sql` | Row-Level Security policies on all tables |
| `009_functions_triggers.sql` | 6 functions, triggers for audit, SLA, ticket numbering |
| `010_seed_data.sql` | Default roles, priorities, statuses, departments, SLA policies, workflow |

### Option A — Supabase SQL Editor (Recommended for first-time setup)

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Open each migration file from `supabase/migrations/` in your local project
4. Paste the content into the SQL Editor and click **Run**
5. Repeat for each file in order: 001 → 002 → 003 → ... → 010

### Option B — Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Log in
supabase login

# Link to your project (get the project ref from your Supabase dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push
```

### Verify Migration Success

After running all migrations, go to **Table Editor** in your Supabase dashboard. You should see all 24 tables listed. Go to **Authentication → Users** — the `handle_new_user` trigger will automatically create a profile row in `profiles` when you create the first admin user.

---

## Creating the First Super Admin User

After migrations and seed data are applied:

1. In Supabase dashboard, go to **Authentication → Users → Invite User**
2. Enter the admin email and send the invitation
3. The user will receive an email with a confirmation link
4. After they confirm, go to **Table Editor → profiles**
5. Find the new user's row and set `role_id` to the UUID of the `super_admin` role from the `roles` table

Alternatively, run this SQL to promote a user by email:

```sql
UPDATE profiles
SET role_id = (SELECT id FROM roles WHERE slug = 'super_admin')
WHERE email = 'admin@yourcompany.com';
```

---

## Local Development

```bash
# Clone or unzip the project
cd enterprise-ticket-system

# Install dependencies
npm install

# Start development server
npx ng serve

# Application runs at http://localhost:4200
# Hot reload is enabled — changes reflect immediately
```

---

## Production Build

```bash
# Build for production (optimized, minified, content-hashed assets)
npx ng build --configuration=production

# Output directory:
# dist/enterprise-ticket-system/browser/
```

The `browser/` subfolder is the deployable artifact. It contains:
- `index.html` — entry point
- `main-HASH.js` — main application bundle
- Lazy-loaded chunk files (one per feature module)
- `styles-HASH.css` — compiled Tailwind + PrimeNG styles
- `favicon.ico`

---

## Netlify Deployment

### Option A — Drag and Drop

1. Build the project: `npx ng build --configuration=production`
2. Go to [app.netlify.com](https://app.netlify.com)
3. Drag the `dist/enterprise-ticket-system/browser/` folder onto the Netlify drop zone
4. Done — your app is live at a generated URL

### Option B — Connect GitHub Repository (Recommended for CI/CD)

1. Push your project to a GitHub repository
2. In Netlify, click **Add new site → Import an existing project**
3. Connect GitHub and select your repository
4. Set build settings:
   - **Build command:** `npx ng build --configuration=production`
   - **Publish directory:** `dist/enterprise-ticket-system/browser`
5. Click **Deploy site**

### `netlify.toml` (Already Included)

The project root already contains a `netlify.toml` with the correct configuration:

```toml
[build]
  publish = "dist/enterprise-ticket-system/browser"
  command  = "npx ng build --configuration=production"

# SPA redirect — without this, page refresh returns 404
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200

# index.html: always fetch fresh (no cache)
[[headers]]
  for = "/index.html"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

# JS/CSS chunks: content-hashed, safe to cache 1 year
[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

> **Why the SPA redirect matters:** Angular handles routing client-side. Without the `/*` → `/index.html` redirect, refreshing any page other than the root (e.g., `/dashboard`) returns a 404 from Netlify because there is no actual file at that path on disk.

---

## CI/CD Pipeline (GitHub Actions)

Add this file as `.github/workflows/deploy.yml` to your repository:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build production
        run: npx ng build --configuration=production

      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: './dist/enterprise-ticket-system/browser'
          production-branch: main
          production-deploy: true
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

Add `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` as GitHub Secrets in your repository settings.

---

## Post-Deploy Verification Checklist

After deploying to production, verify each item:

- [ ] Application loads at the production URL without errors
- [ ] Login page displays correctly (split-panel on desktop, single card on mobile)
- [ ] Log in with super_admin credentials — dashboard loads
- [ ] "Overview" appears in sidebar for super_admin; not visible for admin/agent
- [ ] Create a test ticket — ticket number (TICK-#####) is assigned
- [ ] Ticket appears in All Tickets list
- [ ] Navigate to Audit Logs — creation event is recorded
- [ ] Log in as end_user — Overview tab is absent; direct navigation to `/overview` redirects to `/unauthorized`

---

## Rollback Procedure

### Frontend Rollback

Netlify keeps a full deployment history. To roll back:
1. Go to **Netlify → Site → Deploys**
2. Find the previous successful deployment
3. Click **Publish deploy**

### Database Rollback

Supabase does not auto-rollback migrations. To revert a schema change:
1. Write a reverse migration SQL (DROP TABLE, ALTER TABLE, etc.)
2. Run it in the Supabase SQL Editor
3. Re-deploy the previous frontend version from Netlify

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| 404 on page refresh | Missing SPA redirect | Verify `netlify.toml` exists and `[[redirects]]` rule is correct |
| "relation does not exist" error | Migrations not applied | Run all 10 migration files in order via Supabase SQL Editor |
| Login works but profile not found | `handle_new_user` trigger not applied | Re-run `009_functions_triggers.sql` |
| Blank dashboard after login | RLS policies blocking data | Run `008_rls_policies.sql` and verify user has a valid `role_id` |
| Build fails with "Cannot find module" | Node modules missing | Run `npm install` |
| App loads but Supabase calls 401 | Wrong anon key in environment file | Verify `anonKey` matches the Supabase project's anon key |
