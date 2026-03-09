import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('SupabaseClient');

export function createSupabaseClient(): SupabaseClient {
  return createClient(environment.supabase.url, environment.supabase.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// Admin client — uses service role key, bypasses RLS.
// Used ONLY for admin user management operations (creating auth users).
// Falls back to anon key when serviceKey is not configured so the app
// never crashes on startup; admin operations will return an RLS error instead.
export const ADMIN_SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('AdminSupabaseClient');

export function createAdminSupabaseClient(): SupabaseClient {
  const key = environment.supabase.serviceKey || environment.supabase.anonKey;
  return createClient(environment.supabase.url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
