# Integrations & API Reference

> For technical integrators connecting the Enterprise Ticket System to external tools, monitoring platforms, or custom applications.

---

## API Keys

API keys let external systems authenticate with the Supabase REST API using scoped permissions. Each key grants access to only the permissions you explicitly select.

### Generating an API Key

1. Log in as **Super Admin**
2. Go to **Sidebar → Integrations → API Keys**
3. Click **+ Generate Key**
4. Enter a descriptive name (e.g., "Monitoring System", "CI/CD Pipeline")
5. Select the permissions this key should have:

| Permission | What It Allows |
|---|---|
| `tickets:read` | List and retrieve ticket data |
| `tickets:write` | Create and update tickets |
| `tickets:delete` | Delete tickets |
| `comments:read` | Read ticket comments |
| `comments:write` | Post comments on tickets |
| `users:read` | List and retrieve user profiles |
| `reports:read` | Access report and analytics data |

6. Click **Generate**
7. **Copy the full key immediately** — it begins with `etk_` and is shown only once. The system stores only a SHA-256 hash; the plain key cannot be retrieved again.

### Managing API Keys

| Action | Steps |
|---|---|
| **View keys** | Integrations → API Keys — see name, prefix, permissions, last used, and status |
| **Revoke a key** | Click **Revoke** — sets `is_active = false`. The key stops working immediately |
| **Delete a key** | Click **Delete** — permanently removes the key record |

---

## Webhooks

Webhooks let the system notify external services in real time when ticket events occur. The system sends an HTTP POST to your endpoint with a JSON payload.

### Creating a Webhook

1. Go to **Sidebar → Integrations → Webhooks**
2. Click **+ Add Webhook**
3. Fill in:
   - **Name** — descriptive label (e.g., "Slack Alerts")
   - **Endpoint URL** — the URL that will receive POST requests
   - **Secret** — (optional) a secret string used to sign the payload with HMAC-SHA256
   - **Events** — check one or more events to subscribe to
4. Toggle **Active** ON
5. Click **Save**

### Subscribed Events

| Event | Fires When |
|---|---|
| `ticket.created` | A new ticket is submitted |
| `ticket.updated` | Any field on a ticket is changed |
| `ticket.resolved` | Ticket status moves to "resolved" category |
| `ticket.closed` | Ticket status moves to "closed" category |
| `comment.added` | A new comment is posted on a ticket |
| `sla.breached` | An SLA deadline is missed |
| `escalation.triggered` | An escalation rule fires |

### Testing a Webhook

Click the **Test** button on any webhook to send a sample payload to your endpoint. Verify your endpoint receives a 200 response.

---

## REST API Usage via Supabase

The system uses Supabase's auto-generated REST API. All endpoints follow the PostgREST standard.

**Base URL:** `https://YOUR_PROJECT_ID.supabase.co/rest/v1`

### Authentication

All API calls require two headers:
- `apikey` — your Supabase anon key (public, always required)
- `Authorization: Bearer TOKEN` — a user JWT from Supabase Auth

#### Step 1 — Get an Access Token

```bash
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/auth/v1/token?grant_type=password' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "agent@yourcompany.com",
    "password": "your_password"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": { ... }
}
```

Use the `access_token` value as your Bearer token in subsequent calls.

---

### Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/rest/v1/tickets` | List tickets (filtered by RLS — returns only what you can see) |
| `GET` | `/rest/v1/tickets?ticket_number=eq.TICK-00001` | Get a specific ticket by number |
| `POST` | `/rest/v1/tickets` | Create a new ticket |
| `PATCH` | `/rest/v1/tickets?id=eq.UUID` | Update a ticket |
| `GET` | `/rest/v1/ticket_comments?ticket_id=eq.UUID` | List comments on a ticket |
| `POST` | `/rest/v1/ticket_comments` | Add a comment to a ticket |

---

### Code Examples

#### List Open Tickets

```bash
curl 'https://YOUR_PROJECT_ID.supabase.co/rest/v1/tickets?select=ticket_number,title,created_at&status_id=eq.OPEN_STATUS_UUID&order=created_at.desc&limit=20' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

Response:
```json
[
  {
    "ticket_number": "TICK-00042",
    "title": "VPN not connecting from home office",
    "created_at": "2026-03-03T09:00:00Z"
  }
]
```

#### Create a Ticket

```bash
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/rest/v1/tickets' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -H 'Prefer: return=representation' \
  -d '{
    "title": "Printer not working in Meeting Room 3",
    "ticket_type_id": "INCIDENT_TYPE_UUID",
    "status_id": "OPEN_STATUS_UUID",
    "priority_id": "MEDIUM_PRIORITY_UUID",
    "requester_id": "YOUR_USER_UUID",
    "description": "The printer in MR3 shows a paper jam error but the tray is empty.",
    "source": "api"
  }'
```

Response:
```json
{
  "id": "new-ticket-uuid",
  "ticket_number": "TICK-00043",
  "title": "Printer not working in Meeting Room 3",
  "created_at": "2026-03-03T10:15:00Z"
}
```

#### Add a Comment

```bash
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/rest/v1/ticket_comments' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "ticket_id": "TICKET_UUID",
    "author_id": "YOUR_USER_UUID",
    "body": "We have dispatched a technician. ETA 30 minutes.",
    "is_internal": false
  }'
```

#### Filter with Multiple Conditions

PostgREST supports powerful query operators:

```bash
# Tickets assigned to me, open or in progress, created in last 7 days
curl 'https://YOUR_PROJECT_ID.supabase.co/rest/v1/tickets?select=*&assignee_id=eq.MY_USER_UUID&created_at=gte.2026-02-24T00:00:00Z&order=priority_id.asc' \
  -H 'apikey: YOUR_ANON_KEY' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

Common operators: `eq` (equals), `neq` (not equals), `gt` (greater than), `gte` (≥), `lt` (less than), `lte` (≤), `like` (pattern match), `in` (list match), `is` (null check)

---

## Webhook Payload Format

Every webhook POST request contains this JSON body:

```json
{
  "event": "ticket.created",
  "timestamp": "2026-03-03T10:00:00.000Z",
  "ticket": {
    "id": "uuid-string",
    "ticket_number": "TICK-00042",
    "title": "Network outage — Floor 3",
    "description": "All workstations on floor 3 cannot reach the internet.",
    "priority": "critical",
    "status": "open",
    "type": "incident",
    "category": "Network",
    "source": "web",
    "is_escalated": false,
    "created_at": "2026-03-03T10:00:00.000Z"
  },
  "actor": {
    "id": "uuid-string",
    "full_name": "Alice Smith",
    "email": "alice@yourcompany.com",
    "role": "agent"
  }
}
```

### HMAC-SHA256 Signature Verification

If you set a webhook secret, the system sends an `X-Signature` header with every request. Verify it in your receiving server:

```python
import hmac
import hashlib

def verify_signature(payload_body: bytes, secret: str, signature_header: str) -> bool:
    expected = hmac.new(
        key=secret.encode('utf-8'),
        msg=payload_body,
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature_header)
```

```javascript
const crypto = require('crypto');

function verifySignature(payloadBody, secret, signatureHeader) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payloadBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signatureHeader)
  );
}
```

---

## Security Considerations

1. **API keys are shown only once.** Copy the full key immediately after generation. If lost, revoke and generate a new key.

2. **Use scoped permissions.** Grant each API key only the permissions it actually needs. A monitoring system that reads ticket counts does not need `tickets:write`.

3. **Verify webhook signatures.** Always validate the `X-Signature` header before processing a webhook payload. This prevents spoofed requests from malicious actors.

4. **RLS still applies to API requests.** The Supabase REST API enforces Row-Level Security for every request. An API key authenticating as an `end_user` role will only see that user's own tickets, regardless of which endpoint is called.

5. **Rotate keys periodically.** Revoke and regenerate API keys on a regular schedule (e.g., every 90 days) or immediately when a team member with access to a key leaves the organization.

6. **Use HTTPS endpoints for webhooks.** The system will only deliver webhook payloads to `https://` URLs in production.
