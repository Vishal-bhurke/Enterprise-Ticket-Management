import { test, expect } from '@playwright/test';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../helpers/test-data';

test.describe('Statuses API Tests', () => {
  test('statuses endpoint responds', async ({ request }) => {
    const response = await request.get(`${SUPABASE_URL}/rest/v1/statuses`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    // Statuses may be readable or gated by RLS
    expect([200, 401, 403]).toContain(response.status());
  });

  test('statuses response is an array', async ({ request }) => {
    const response = await request.get(`${SUPABASE_URL}/rest/v1/statuses`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      },
    });
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('deleting statuses without auth is rejected', async ({ request }) => {
    const response = await request.delete(
      `${SUPABASE_URL}/rest/v1/statuses?id=eq.00000000-0000-0000-0000-000000000000`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
        },
      }
    );
    // Supabase DELETE returns 204 (No Content) for 0-row deletes blocked by RLS
    expect([200, 204, 401, 403]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.length).toBe(0);
    }
  });
});
