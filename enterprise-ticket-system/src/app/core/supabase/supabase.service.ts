import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { ApiResponse } from '../../shared/models/api-response.model';
import { SUPABASE_CLIENT } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  protected readonly client: SupabaseClient = inject(SUPABASE_CLIENT);

  protected success<T>(data: T, message = 'Success'): ApiResponse<T> {
    return { success: true, message, data };
  }

  protected handleError(error: unknown): ApiResponse<null> {
    let message = 'An unexpected error occurred';

    if (error && typeof error === 'object') {
      if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
        message = (error as { message: string }).message;
      } else if ('error_description' in error && typeof (error as { error_description: unknown }).error_description === 'string') {
        message = (error as { error_description: string }).error_description;
      }
    }

    console.error('[SupabaseService Error]', error);
    return { success: false, message, data: null };
  }

  protected async getCurrentUserId(): Promise<string | null> {
    const { data } = await this.client.auth.getUser();
    return data.user?.id ?? null;
  }
}
