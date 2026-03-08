import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from './test-data';

let _adminClient: SupabaseClient | null = null;

/**
 * Get a Supabase client with service role key (bypasses RLS).
 * Used for test setup, teardown, and DB assertions.
 */
export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _adminClient;
}

/**
 * Check if a row exists in a table matching the given filter.
 */
export async function rowExists(table: string, filter: Record<string, unknown>): Promise<boolean> {
  const client = getAdminClient();
  let query = client.from(table).select('id', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value as string);
  }
  const { count } = await query;
  return (count ?? 0) > 0;
}

/**
 * Get a single row from a table.
 */
export async function getRow<T = Record<string, unknown>>(
  table: string,
  filter: Record<string, unknown>
): Promise<T | null> {
  const client = getAdminClient();
  let query = client.from(table).select('*');
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value as string);
  }
  const { data } = await query.single();
  return data as T | null;
}

/**
 * Delete test data from a table.
 */
export async function cleanupRow(table: string, filter: Record<string, unknown>): Promise<void> {
  const client = getAdminClient();
  let query = client.from(table).delete();
  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value as string);
  }
  await query;
}

/**
 * Get the ID of the default status (is_default = true).
 */
export async function getDefaultStatusId(): Promise<string> {
  const client = getAdminClient();
  const { data } = await client.from('statuses').select('id').eq('is_default', true).single();
  if (!data) throw new Error('No default status found in DB');
  return (data as { id: string }).id;
}

/**
 * Get the ID of a role by its slug.
 */
export async function getRoleId(slug: string): Promise<string> {
  const client = getAdminClient();
  const { data } = await client.from('roles').select('id').eq('slug', slug).single();
  if (!data) throw new Error(`Role '${slug}' not found in DB`);
  return (data as { id: string }).id;
}
