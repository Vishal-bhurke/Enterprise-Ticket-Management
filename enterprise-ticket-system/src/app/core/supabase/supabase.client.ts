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
export const ADMIN_SUPABASE_CLIENT = new InjectionToken<SupabaseClient>('AdminSupabaseClient');

export function createAdminSupabaseClient(): SupabaseClient {
  return createClient(environment.supabase.url, environment.supabase.serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
