import { test, expect } from '@playwright/test';
import { getAdminClient, rowExists } from '../helpers/supabase.helper';

test.describe('Database Constraints', () => {
  test('profiles table exists and has required columns', async () => {
    if (!process.env['SUPABASE_SERVICE_KEY']) {
      test.skip();
      return;
    }
    const client = getAdminClient();
    const { data, error } = await client
      .from('profiles')
      .select('id, email, full_name, role_id, is_active, session_token')
      .limit(1);

    // Table exists and has expected columns (even if empty)
    expect(error).toBeNull();
  });

  test('tickets table exists and has required columns', async () => {
    if (!process.env['SUPABASE_SERVICE_KEY']) {
      test.skip();
      return;
    }
    const client = getAdminClient();
    const { data, error } = await client
      .from('tickets')
      .select('id, title, status_id, created_by, created_at')
      .limit(1);

    expect(error).toBeNull();
  });

  test('statuses table has a default status (is_default = true)', async () => {
    if (!process.env['SUPABASE_SERVICE_KEY']) {
      test.skip();
      return;
    }
    const client = getAdminClient();
    const { data, error } = await client
      .from('statuses')
      .select('id, name')
      .eq('is_default', true);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect((data as Array<unknown>).length).toBeGreaterThan(0);
  });

  test('roles table has expected system roles', async () => {
    if (!process.env['SUPABASE_SERVICE_KEY']) {
      test.skip();
      return;
    }
    const client = getAdminClient();
    const { data, error } = await client
      .from('roles')
      .select('slug')
      .in('slug', ['super_admin', 'admin', 'agent', 'end_user']);

    expect(error).toBeNull();
    expect((data as Array<unknown>).length).toBe(4);
  });

  test('inserting ticket without status_id fails', async () => {
    if (!process.env['SUPABASE_SERVICE_KEY']) {
      test.skip();
      return;
    }
    const client = getAdminClient();
    const { error } = await client.from('tickets').insert({
      title: 'Constraint Test Ticket',
      description: 'Should fail — no status_id',
      created_by: '00000000-0000-0000-0000-000000000001',
      // status_id intentionally omitted
    });

    expect(error).not.toBeNull();
    // Should be a not_null_violation (23502) or FK violation (23503)
    expect(['23502', '23503', '23505'].some(code =>
      error!.code === code || error!.message.includes('status_id') || error!.message.includes('violates')
    )).toBe(true);
  });

  test('duplicate email in profiles fails', async () => {
    if (!process.env['SUPABASE_SERVICE_KEY']) {
      test.skip();
      return;
    }
    const client = getAdminClient();
    // First, find an existing profile to get its email
    const { data: existing } = await client.from('profiles').select('email').limit(1).single();
    if (!existing) {
      test.skip();
      return;
    }

    const { error } = await client.from('profiles').insert({
      id: '00000000-0000-0000-0000-000000000099',
      email: (existing as { email: string }).email, // duplicate
      full_name: 'Duplicate Test',
    });

    expect(error).not.toBeNull();
    // unique_violation = 23505
    expect(error!.code).toBe('23505');
  });
});
