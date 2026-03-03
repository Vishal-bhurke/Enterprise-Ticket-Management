# Design Tokens — Color Reference

> Color palette, priority/status colors, and Tailwind surface class mappings used throughout the Enterprise Ticket System.

---

## Color Palette

| Token Name | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `brand-primary` | `#3B82F6` | `blue-500` | Primary buttons, links, active nav item indicator |
| `brand-primary-dark` | `#1D4ED8` | `blue-700` | Hovered primary buttons |
| `brand-accent` | `#6366F1` | `indigo-500` | Secondary highlights, ticket count badges |
| `surface-base` | `#F8FAFC` | `slate-50` | Page background, right panel of login |
| `surface-card` | `#FFFFFF` | `white` | Card backgrounds, modals, panels |
| `surface-border` | `#E2E8F0` | `slate-200` | Card borders, dividers, table rows |
| `surface-hover` | `#F1F5F9` | `slate-100` | Table row hover, dropdown item hover |
| `surface-sidebar` | `#0F172A` | `slate-900` | Sidebar background |
| `surface-sidebar-active` | `#1E293B` | `slate-800` | Active sidebar item background |
| `text-primary` | `#0F172A` | `slate-900` | Page headings, primary text |
| `text-secondary` | `#64748B` | `slate-500` | Subheadings, labels, timestamps |
| `text-muted` | `#94A3B8` | `slate-400` | Placeholder text, disabled states |
| `text-inverse` | `#F8FAFC` | `slate-50` | Text on dark backgrounds (sidebar) |
| `text-link` | `#3B82F6` | `blue-500` | Hyperlinks, navigation text |

---

## Priority Colors

Each priority level has a consistent color across badges, tags, SLA timers, and charts.

| Priority | Hex | Tailwind Class | Used In |
|---|---|---|---|
| **Critical** | `#DC2626` | `red-600` | Priority badge, SLA bar (urgent), ticket list row highlight |
| **High** | `#EA580C` | `orange-600` | Priority badge, chart bar segment |
| **Medium** | `#D97706` | `amber-600` | Priority badge (default for most tickets) |
| **Low** | `#16A34A` | `green-600` | Priority badge |

### Priority Badge Classes (Tailwind)

```html
<!-- Critical -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
  Critical
</span>

<!-- High -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
  High
</span>

<!-- Medium -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
  Medium
</span>

<!-- Low -->
<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
  Low
</span>
```

---

## Status Colors

Status colors are mapped from the status category, not the status name. This means custom status names still receive correct color coding.

| Status Category | Hex | Tailwind Class | Used In |
|---|---|---|---|
| `open` | `#3B82F6` | `blue-500` | Ticket list badge, dashboard stat card, ticket breakdown dot |
| `in_progress` | `#8B5CF6` | `violet-500` | Ticket list badge, dashboard stat card |
| `pending` | `#F59E0B` | `amber-500` | Ticket list badge, SLA pause indicator |
| `on_hold` | `#6B7280` | `gray-500` | Ticket list badge |
| `resolved` | `#10B981` | `emerald-500` | Ticket list badge, dashboard stat card |
| `closed` | `#64748B` | `slate-500` | Ticket list badge |
| `cancelled` | `#EF4444` | `red-400` | Ticket list badge |

### Status Badge Classes (Tailwind)

```html
<!-- Open -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
  Open
</span>

<!-- In Progress -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
  In Progress
</span>

<!-- Pending -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
  Pending
</span>

<!-- Resolved -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
  Resolved
</span>

<!-- Closed -->
<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
  Closed
</span>
```

---

## SLA Timer Colors

The SLA progress bar changes color based on time remaining.

| Condition | Hex | Tailwind Class | Meaning |
|---|---|---|---|
| > 50% time remaining | `#10B981` | `emerald-500` | On track |
| 10–50% remaining | `#F59E0B` | `amber-500` | Approaching deadline |
| < 10% remaining | `#EF4444` | `red-500` | Critical — act now |
| SLA breached | `#DC2626` | `red-600` | Deadline missed |

---

## Audit Log Action Colors

Action badges in the Audit Log use these colors.

| Action | Hex | Tailwind Classes |
|---|---|---|
| `CREATED` / `INSERT` | `#10B981` | `bg-emerald-100 text-emerald-700` |
| `UPDATED` / `UPDATE` | `#F59E0B` | `bg-amber-100 text-amber-700` |
| `STATUS_CHANGED` | `#3B82F6` | `bg-blue-100 text-blue-700` |
| `REASSIGNED` | `#8B5CF6` | `bg-violet-100 text-violet-700` |
| `DELETED` / `DELETE` | `#EF4444` | `bg-red-100 text-red-700` |

---

## Metric Card Accent Colors

The four KPI metric cards on the Dashboard and Overview tab use these accent colors.

| Card | Color Name | Hex | Tailwind |
|---|---|---|---|
| Total Users / first card | Blue | `#3B82F6` | `blue-500` |
| Total Tickets / second card | Violet/Purple | `#8B5CF6` | `violet-500` |
| SLA Compliance / third card | Green | `#10B981` | `emerald-500` |
| Active Automations / fourth card | Amber | `#F59E0B` | `amber-500` |

---

## Role Badge Colors

Each role is displayed with a distinct badge color.

| Role | Hex | Tailwind Classes |
|---|---|---|
| `super_admin` | `#3B82F6` | `bg-blue-100 text-blue-700` |
| `admin` | `#8B5CF6` | `bg-violet-100 text-violet-700` |
| `agent` | `#10B981` | `bg-emerald-100 text-emerald-700` |
| `end_user` | `#F59E0B` | `bg-amber-100 text-amber-700` |

---

## Tailwind Surface Classes → Hex

These are the Tailwind Slate scale values used as semantic surface colors in this application.

| Tailwind Class | Hex | Usage |
|---|---|---|
| `slate-50` (`#F8FAFC`) | `#F8FAFC` | Page background |
| `slate-100` (`#F1F5F9`) | `#F1F5F9` | Table row hover, chip backgrounds |
| `slate-200` (`#E2E8F0`) | `#E2E8F0` | Borders, dividers |
| `slate-300` (`#CBD5E1`) | `#CBD5E1` | Disabled input borders |
| `slate-400` (`#94A3B8`) | `#94A3B8` | Placeholder text |
| `slate-500` (`#64748B`) | `#64748B` | Secondary text, labels |
| `slate-600` (`#475569`) | `#475569` | Body text |
| `slate-700` (`#334155`) | `#334155` | Subheadings |
| `slate-800` (`#1E293B`) | `#1E293B` | Sidebar active item, dark card |
| `slate-900` (`#0F172A`) | `#0F172A` | Sidebar background, headings |

---

## Internal Note / Diff Viewer Colors

Internal ticket comments and audit log diff viewers use these highlight colors.

| Element | Background | Border | Tailwind |
|---|---|---|---|
| Internal note card | `#FFFBEB` | `#FCD34D` | `bg-amber-50 border-amber-300` |
| Diff viewer — before (removed) | `#FEE2E2` | — | `bg-red-100` |
| Diff viewer — after (added) | `#D1FAE5` | — | `bg-emerald-100` |

---

## CSS Custom Properties (Optional Override)

If you integrate a custom theme or want to apply the color palette via CSS variables, use these definitions in your global `styles.css`:

```css
:root {
  /* Brand */
  --color-primary:       #3B82F6;
  --color-primary-dark:  #1D4ED8;
  --color-accent:        #6366F1;

  /* Surfaces */
  --color-surface-base:    #F8FAFC;
  --color-surface-card:    #FFFFFF;
  --color-surface-border:  #E2E8F0;
  --color-surface-hover:   #F1F5F9;
  --color-sidebar-bg:      #0F172A;
  --color-sidebar-active:  #1E293B;

  /* Text */
  --color-text-primary:    #0F172A;
  --color-text-secondary:  #64748B;
  --color-text-muted:      #94A3B8;
  --color-text-inverse:    #F8FAFC;

  /* Status */
  --color-open:        #3B82F6;
  --color-in-progress: #8B5CF6;
  --color-pending:     #F59E0B;
  --color-resolved:    #10B981;
  --color-closed:      #64748B;

  /* Priority */
  --color-critical:    #DC2626;
  --color-high:        #EA580C;
  --color-medium:      #D97706;
  --color-low:         #16A34A;
}
```
