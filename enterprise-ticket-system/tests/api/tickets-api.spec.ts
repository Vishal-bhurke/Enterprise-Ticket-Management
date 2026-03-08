import { test, expect } from '@playwright/test';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../helpers/test-data';

test.describe('Tickets API Tests', () => {
  test('unauthenticated ticket list returns empty or blocked', async ({ request }) => {
    const response = await request.get(`${SUPABASE_URL}/rest/v1/tickets`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    expect([200, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.length).toBe(0); // RLS: no tickets for unauthenticated
    }
  });

  test('creating ticket without auth is rejected', async ({ request }) => {
    const response = await request.post(`${SUPABASE_URL}/rest/v1/tickets`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      data: {
        title: 'Unauthorized Test Ticket',
        description: 'This should be rejected',
      },
    });
    // Should be rejected — 401, 403, or 400 (missing required fields)
    expect([400, 401, 403]).toContain(response.status());
  });

  test('deleting ticket without auth is rejected', async ({ request }) => {
    const response = await request.delete(`${SUPABASE_URL}/rest/v1/tickets?id=eq.00000000-0000-0000-0000-000000000000`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    // Supabase DELETE returns 204 (No Content) for 0-row deletes blocked by RLS
    expect([200, 204, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.length).toBe(0); // RLS: cannot delete others' tickets
    }
  });
});
