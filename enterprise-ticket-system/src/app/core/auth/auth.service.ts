import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, User } from '@supabase/supabase-js';
import { Profile, Role, RoleSlug } from '../../shared/models/user.model';
import { ApiResponse } from '../../shared/models/api-response.model';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService extends SupabaseService {
  private router = inject(Router);

  // Core state signals
  private _session = signal<Session | null>(null);
  private _currentUser = signal<Profile | null>(null);
  private _isInitializing = signal(true);
  private _profileLoadError = signal<string | null>(null);

  // Public readonly signals
  readonly session = this._session.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isInitializing = this._isInitializing.asReadonly();
  readonly profileLoadError = this._profileLoadError.asReadonly();

  // Computed signals
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly userRole = computed<RoleSlug | null>(() => {
    const role = this._currentUser()?.role?.slug;
    return (role as RoleSlug) ?? null;
  });

  // Permission computed signals
  readonly isSuperAdmin = computed(() => this.userRole() === 'super_admin');
  readonly isAdmin = computed(() => ['super_admin', 'admin'].includes(this.userRole() ?? ''));
  readonly isAgent = computed(() => ['super_admin', 'admin', 'agent'].includes(this.userRole() ?? ''));
  readonly isEndUser = computed(() => this.userRole() === 'end_user');

  readonly canManageSystem = computed(() => this.isSuperAdmin());
  readonly canManageMasters = computed(() => this.isAdmin());
  readonly canManageTickets = computed(() => this.isAgent());
  readonly canViewReports = computed(() => this.isAdmin());
  readonly canViewAuditLogs = computed(() => this.isAdmin());

  /**
   * Called once at app startup via APP_INITIALIZER.
   * Restores session from local storage and sets up auth state change listener.
   */
  async initialize(): Promise<void> {
    try {
      const { data: { session } } = await this.client.auth.getSession();
      this._session.set(session);

      if (session?.user) {
        await this.loadProfile(session.user.id);
      }

      // Listen for future auth changes (login, logout, token refresh)
      this.client.auth.onAuthStateChange(async (event, session) => {
        this._session.set(session);

        if (event === 'PASSWORD_RECOVERY') {
          // User clicked password reset link — send them to the reset form
          this.router.navigate(['/auth/reset-password']);
        } else if (event === 'SIGNED_IN' && session?.user) {
          await this.loadProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          this._currentUser.set(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user && !this._currentUser()) {
          await this.loadProfile(session.user.id);
        }
      });
    } catch (error) {
      console.error('[AuthService] Initialization error:', error);
    } finally {
      this._isInitializing.set(false);
    }
  }

  async signIn(email: string, password: string): Promise<ApiResponse<User | null>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        await this.loadProfile(data.user.id);
      }
      return this.success(data.user, 'Signed in successfully');
    } catch (error) {
      return this.handleError(error) as ApiResponse<null>;
    }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
    this._session.set(null);
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  async sendPasswordReset(email: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      return this.success(null, 'Password reset email sent. Please check your inbox.');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updatePassword(newPassword: string): Promise<ApiResponse<null>> {
    try {
      const { error } = await this.client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return this.success(null, 'Password updated successfully');
    } catch (error) {
      return this.handleError(error);
    }
  }

  async loadProfile(userId: string): Promise<void> {
    try {
      // Step 1: Fetch profile row — flat query, no embedded join
      const { data: profileData, error: profileError } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        this._profileLoadError.set(profileError.message);
        console.error('[AuthService] profiles query error:', profileError);
        return;
      }
      if (!profileData) {
        this._profileLoadError.set('profile_not_found');
        console.error('[AuthService] No profile row found — user may need setup SQL.');
        return;
      }

      // Step 2: Fetch role separately
      let role: Role | undefined;
      const roleId = (profileData as Record<string, unknown>)['role_id'] as string | undefined;
      if (roleId) {
        const { data: roleData, error: roleError } = await this.client
          .from('roles')
          .select('id, name, slug, description, permissions, is_system, is_active, created_at, updated_at')
          .eq('id', roleId)
          .maybeSingle();
        if (roleError) console.error('[AuthService] roles query error:', roleError);
        else role = roleData as Role;
      }

      // Step 3: Fetch department separately (optional)
      let department = undefined;
      const deptId = (profileData as Record<string, unknown>)['department_id'] as string | undefined;
      if (deptId) {
        const { data: deptData, error: deptError } = await this.client
          .from('departments')
          .select('id, name, code, description, head_id, parent_id, is_active, created_at, updated_at')
          .eq('id', deptId)
          .maybeSingle();
        if (deptError) console.error('[AuthService] departments query error:', deptError);
        else department = deptData ?? undefined;
      }

      const fullProfile: Profile = {
        ...(profileData as unknown as Profile),
        role,
        department,
      };

      this._profileLoadError.set(null);
      this._currentUser.set(fullProfile);
    } catch (err) {
      this._profileLoadError.set('unexpected_error');
      console.error('[AuthService] Unexpected error loading profile:', err);
    }
  }

  async refreshProfile(): Promise<void> {
    const userId = this._session()?.user?.id;
    if (userId) {
      await this.loadProfile(userId);
    }
  }
}
