# Icon Reference

> PrimeIcons used throughout the Enterprise Ticket System. All icons are rendered via the `pi` CSS class from the `primeicons` package (included with PrimeNG 18).

---

## Usage

```html
<!-- Standard usage -->
<i class="pi pi-ticket text-xl text-blue-500"></i>

<!-- In a PrimeNG Button -->
<p-button icon="pi pi-plus" label="Add"></p-button>

<!-- In sidebar nav -->
<i [class]="item.icon + ' text-lg'"></i>
```

---

## PrimeIcons Used in This Application

| Icon Class | Renders As | Used For |
|---|---|---|
| `pi pi-th-large` | ⊞ grid | Overview tab (sidebar) |
| `pi pi-home` | 🏠 | Dashboard (sidebar) |
| `pi pi-ticket` | 🎫 | Tickets section (sidebar) |
| `pi pi-users` | 👥 | Users master / Masters section |
| `pi pi-sitemap` | ⬡ | Departments / Workflow Builder |
| `pi pi-tag` | 🏷 | Categories / Tags |
| `pi pi-flag` | 🚩 | Priorities |
| `pi pi-circle` | ● | Statuses |
| `pi pi-list` | ≡ | Ticket Types / Queues / lists |
| `pi pi-sliders-h` | ⚙ | SLA Management / Automation |
| `pi pi-bell` | 🔔 | Notifications |
| `pi pi-chart-bar` | 📊 | Reports / Analytics |
| `pi pi-history` | 🕐 | Audit Logs |
| `pi pi-link` | 🔗 | Integrations (Webhooks, API Keys) |
| `pi pi-shield` | 🛡 | Security / Role Management |
| `pi pi-check-circle` | ✓ | Configured (green, Configuration Status) |
| `pi pi-times-circle` | ✗ | Not configured (red, Configuration Status) |
| `pi pi-refresh` | ↺ | Refresh data button |
| `pi pi-plus` | + | Add / Create actions |
| `pi pi-pencil` | ✏ | Edit actions |
| `pi pi-trash` | 🗑 | Delete actions |
| `pi pi-eye` | 👁 | View detail / View changes |
| `pi pi-sign-out` | → | Logout |
| `pi pi-user` | 👤 | User profile / avatar |
| `pi pi-clock` | 🕐 | SLA timer / Time ago |
| `pi pi-exclamation-triangle` | ⚠ | Warning / SLA breach |
| `pi pi-info-circle` | ℹ | Info tooltip |
| `pi pi-external-link` | ↗ | External link |
| `pi pi-copy` | ⎘ | Copy to clipboard (API Keys) |
| `pi pi-sort-alt` | ⇅ | Sortable column header |

---

## Icon Sizing

| Tailwind Class | Size | Use Case |
|---|---|---|
| `text-sm` | 0.875 rem | Inline text icons, badges |
| `text-base` | 1 rem | Button icons |
| `text-lg` | 1.125 rem | Sidebar nav icons |
| `text-xl` | 1.25 rem | Card header icons |
| `text-2xl` | 1.5 rem | Hero / metric card icons |
| `text-4xl` | 2.25 rem | Feature section display icons |

---

## Inline SVG — Custom Icons

These four custom SVG icons are used in the `docs/index.html` step-animation demo and can be embedded directly in any HTML template.

---

### Ticket Icon

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     width="24" height="24">
  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7
           a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
  <path d="M13 5v2"/>
  <path d="M13 17v2"/>
  <path d="M13 11v2"/>
</svg>
```

---

### Shield (Security) Icon

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     width="24" height="24">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
  <path d="m9 12 2 2 4-4"/>
</svg>
```

---

### Chart Bar (Analytics) Icon

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     width="24" height="24">
  <line x1="18" x2="18" y1="20" y2="10"/>
  <line x1="12" x2="12" y1="20" y2="4"/>
  <line x1="6"  x2="6"  y1="20" y2="14"/>
  <line x1="2"  x2="22" y1="20" y2="20"/>
</svg>
```

---

### Gear (Configuration) Icon

```html
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     width="24" height="24">
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08
           a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51
           a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08
           a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18
           a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39
           a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09
           a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25
           a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>
```

---

## Notes

- All PrimeIcons classes require the `primeicons` CSS to be loaded. This is handled automatically when PrimeNG is imported in the Angular project (`styles.css` already includes `node_modules/primeicons/primeicons.css`).
- For the `docs/index.html` demo file, no external icon library is needed — the inline SVGs above are fully self-contained.
- Feather Icons (optional alternative) can be found at [feathericons.com](https://feathericons.com) — all icons listed above have Feather equivalents if you prefer a different icon set.
