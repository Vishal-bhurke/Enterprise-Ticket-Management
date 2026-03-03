import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { RealtimeChannel, Session, User } from '@supabase/supabase-js';
import { Profile, Role, RoleSlug } from '../../shared/models/user.model';
import { ApiResponse } from '../../shared/models/api-response.model';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthService extends SupabaseService {
  private router = inject(Router);

  // ── Core state signals ────────────────────────────────────────────────────
  private _session = signal<Session | null>(null);
  private _currentUser = signal<Profile | null>(null);
  private _isInitializing = signal(true);
  private _profileLoadError = signal<string | null>(null);

  // ── Single Active Session — internal state ────────────────────────────────
  // Tracks the current device's session token (mirrors the value in localStorage).
  // Used by the Realtime subscription to detect when another device has logged in.
  private _sessionToken = signal<string | null>(null);
  private sessionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  // Guard against double-invocation (Realtime + polling firing simultaneously)
  private _isInvalidating = false;
  // Timestamp of last validateSessionToken DB call — throttle to max 1 per 30s
  private _lastSessionCheck = 0;
  private readonly SESSION_CHECK_THROTTLE_MS = 30_000;

  // ── Public readonly signals ───────────────────────────────────────────────
  readonly session = this._session.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isInitializing = this._isInitializing.asReadonly();
  readonly profileLoadError = this._profileLoadError.asReadonly();

  // ── Computed signals ──────────────────────────────────────────────────────
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

  // ── Single Active Session: helpers ────────────────────────────────────────

  /**
   * Returns the localStorage key for this user's session token.
   * User-specific to avoid conflicts when multiple accounts are used on one device.
   */
  private sessionKey(userId: string): string {
    return `ets_session_${userId}`;
  }

  /**
   * Validates whether the locally stored session token matches the DB.
   * Returns false if:
   *   - No token is stored (first deploy or localStorage was cleared)
   *   - The DB token differs (another device has logged in)
   *   - The DB query fails
   */
  private async validateSessionToken(userId: string): Promise<boolean> {
    const storedToken = localStorage.getItem(this.sessionKey(userId));
    if (!storedToken) return false;

    const { data, error } = await this.client
      .from('profiles')
      .select('session_token')
      .eq('id', userId)
      .single();

    if (error || !data) return false;
    return (data as { session_token: string | null }).session_token === storedToken;
  }

  /**
   * Called when the session is detected as invalidated by another device.
   * Clears all local state, stops monitoring, and does a FULL PAGE RELOAD to /auth/login.
   *
   * Why window.location.href instead of router.navigate():
   *   - router.navigate() is SPA navigation — the Supabase client's internal state
   *     (GoTrueClient, WebSocket, in-memory session) is NOT reset.
   *   - window.location.href triggers a full browser reload, which:
   *       1. Destroys all JS state (Angular signals, Supabase client, WebSocket)
   *       2. Runs initialize() fresh → clean Supabase client
   *       3. Guarantees re-login works without requiring a manual hard refresh
   *
   * The _isInvalidating guard prevents double-invocation when Realtime + polling
   * both detect the mismatch in the same event loop cycle.
   */
  private async handleSessionInvalidated(): Promise<void> {
    if (this._isInvalidating) return;
    this._isInvalidating = true;

    const userId = this._session()?.user?.id;
    if (userId) localStorage.removeItem(this.sessionKey(userId));

    this.stopSessionMonitoring();
    this._session.set(null);
    this._currentUser.set(null);
    this._sessionToken.set(null);

    // scope:'local' clears this device's Supabase JWT from storage only.
    // It does NOT revoke the new (legitimate) device's token on the server.
    await this.client.auth.signOut({ scope: 'local' });

    // Full page reload — intentional. See method comment above.
    window.location.href = '/auth/login?reason=session_invalidated';
  }

  /**
   * Public throttled session validation — called by authGuard and NavigationEnd subscription.
   * Hits the DB at most once per 30 seconds to avoid flooding.
   * Returns true if valid or throttled; false only when DB confirms a mismatch.
   */
  async checkSessionValidity(): Promise<boolean> {
    const session = this._session();
    if (!session?.user || this._isInvalidating) return true;

    const now = Date.now();
    if (now - this._lastSessionCheck < this.SESSION_CHECK_THROTTLE_MS) return true;
    this._lastSessionCheck = now;

    const isValid = await this.validateSessionToken(session.user.id);
    if (!isValid) {
      this.handleSessionInvalidated();
      return false;
    }
    return true;
  }

  /**
   * Starts three-layer session monitoring:
   *   Layer 1 — Supabase Realtime: fires within ~1 second of another device logging in
   *   Layer 2 — Polling (15s): fallback when Realtime WebSocket is unavailable
   *   Layer 3 — visibilitychange + window.focus: validates when user returns to this tab/window
   */
  private startSessionMonitoring(userId: string): void {
    this.stopSessionMonitoring(); // clean up any prior listeners before starting fresh

    // Layer 1: Supabase Realtime subscription
    // Subscribes to UPDATE events on the profiles row for this user.
    // When another device logs in, the session_token column changes →
    // this callback fires and compares against our locally stored token.
    this.realtimeChannel = this.client
      .channel(`profile-session-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const newToken = (payload.new as Record<string, unknown>)['session_token'] as string | null;
          if (newToken !== this._sessionToken()) {
            this.handleSessionInvalidated();
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[AuthService] Realtime session monitor: SUBSCRIBED');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[AuthService] Realtime session monitor failed:', status, err);
        }
      });

    // Layer 2: Polling fallback every 15 seconds
    // Ensures detection within 15s even if the Realtime WebSocket disconnects.
    this.sessionCheckInterval = setInterval(async () => {
      const session = this._session();
      if (!session?.user) return;
      const isValid = await this.validateSessionToken(session.user.id);
      if (!isValid) this.handleSessionInvalidated();
    }, 15_000);

    // Layer 3: visibilitychange + window.focus — validate when user returns to this tab/window
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('focus', this.onVisibilityChange);
  }

  /**
   * Cleans up all session monitoring resources.
   * Must be called before starting new monitoring and on sign-out.
   */
  private stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
    if (this.realtimeChannel) {
      this.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('focus', this.onVisibilityChange);
  }

  /**
   * Arrow function so `this` is correctly bound when used as an event listener,
   * allowing `removeEventListener` to reference the exact same function instance.
   */
  private onVisibilityChange = async (): Promise<void> => {
    if (document.visibilityState !== 'visible') return;
    const session = this._session();
    if (!session?.user) return;
    const isValid = await this.validateSessionToken(session.user.id);
    if (!isValid) this.handleSessionInvalidated();
  };

  // ── Auth lifecycle ─────────────────────────────────────────────────────────

  /**
   * Called once at app startup via APP_INITIALIZER.
   * Restores session from local storage, enforces the Single Active Session
   * policy, loads the user profile, and sets up ongoing auth state monitoring.
   */
  async initialize(): Promise<void> {
    try {
      const { data: { session } } = await this.client.auth.getSession();

      if (session?.user) {
        // ── Single Active Session: validate before restoring ──────────────
        const isValid = await this.validateSessionToken(session.user.id);

        if (!isValid) {
          // Another device has logged in since this session was saved locally.
          // Full reload to login — same reasoning as handleSessionInvalidated().
          localStorage.removeItem(this.sessionKey(session.user.id));
          await this.client.auth.signOut({ scope: 'local' });
          this._isInitializing.set(false);
          window.location.href = '/auth/login?reason=session_invalidated';
          return;
        }

        // ── Session is valid — restore full state ─────────────────────────
        this._session.set(session);
        this._sessionToken.set(localStorage.getItem(this.sessionKey(session.user.id)));
        await this.loadProfile(session.user.id);
        this.startSessionMonitoring(session.user.id);
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
          this._sessionToken.set(null);
          this.stopSessionMonitoring();
        } else if (event === 'TOKEN_REFRESHED' && session?.user && !this._currentUser()) {
          await this.loadProfile(session.user.id);
        }
      });

      // NavigationEnd trigger: validate session on every Angular route change.
      // This is the most reliable catch-all: any click in the app that causes
      // navigation immediately runs a throttled DB check (max 1 per 30s).
      // Fixes the "only page refresh detects session invalidation" issue.
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.checkSessionValidity();
        }
      });
    } catch (error) {
      console.error('[AuthService] Initialization error:', error);
    } finally {
      this._isInitializing.set(false);
    }
  }

  /**
   * Signs the user in with email + password.
   * Generates a new session token and writes it to the DB — this atomically
   * invalidates all other devices' stored tokens (Single Active Session).
   */
  async signIn(email: string, password: string): Promise<ApiResponse<User | null>> {
    try {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        // Generate a new cryptographically-secure UUID for this session.
        // Writing it to the DB overwrites any existing token from other devices.
        const newToken = crypto.randomUUID();

        const { error: tokenError } = await this.client
          .from('profiles')
          .update({ session_token: newToken })
          .eq('id', data.user.id);

        if (tokenError) {
          console.error('[AuthService] Failed to write session token to DB:', tokenError);
        }

        // Store locally so future validation calls can compare against it.
        localStorage.setItem(this.sessionKey(data.user.id), newToken);
        this._sessionToken.set(newToken);

        await this.loadProfile(data.user.id);
        this.startSessionMonitoring(data.user.id);
      }

      return this.success(data.user, 'Signed in successfully');
    } catch (error) {
      return this.handleError(error) as ApiResponse<null>;
    }
  }

  /**
   * Signs the user out — clears session token from both localStorage and the DB,
   * stops all monitoring, and navigates to the login page.
   */
  async signOut(): Promise<void> {
    const userId = this._session()?.user?.id;

    this.stopSessionMonitoring();

    if (userId) {
      localStorage.removeItem(this.sessionKey(userId));
      // Set DB token to NULL so no stale localStorage value can match it later.
      // Wrapped in try/catch so a DB error never blocks the sign-out flow.
      try {
        await this.client
          .from('profiles')
          .update({ session_token: null })
          .eq('id', userId);
      } catch { /* ignore — sign-out must always complete */ }
    }

    await this.client.auth.signOut();
    this._session.set(null);
    this._currentUser.set(null);
    this._sessionToken.set(null);
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
