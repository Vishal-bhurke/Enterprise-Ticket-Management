import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.client';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

const TIMEZONES = [
  'UTC', 'Asia/Kolkata', 'Asia/Colombo', 'Asia/Dhaka', 'Asia/Karachi',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Toronto',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland',
];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    TagModule,
    SkeletonModule,
    DividerModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="My Profile"
      subtitle="Manage your account settings and preferences"
      [breadcrumbs]="['Home', 'Profile']"
    />

    <div class="space-y-6">

      <!-- ─── Profile Hero Card ─── -->
      <div class="bg-white rounded-xl border border-surface-200 p-6 shadow-sm">
        <div class="flex items-start gap-5">

          <!-- Avatar -->
          <div class="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 text-2xl font-bold text-white shadow-md"
            [style.background]="avatarColor()">
            {{ getInitial() }}
          </div>

          <!-- Info block -->
          <div class="flex-1 min-w-0">
            @if (isLoading()) {
              <p-skeleton width="200px" height="26px" styleClass="mb-2" />
              <p-skeleton width="170px" height="16px" styleClass="mb-3" />
              <p-skeleton width="90px" height="22px" />
            } @else if (user()) {
              <h2 class="text-xl font-bold text-surface-900 truncate">{{ user()!.full_name }}</h2>
              <div class="flex items-center gap-2 mt-0.5">
                <p class="text-sm text-surface-500 truncate">{{ user()!.email }}</p>
                @if (emailVerified()) {
                  <span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <i class="pi pi-verified text-xs"></i> Verified
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <i class="pi pi-exclamation-triangle text-xs"></i> Not Verified
                  </span>
                }
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <p-tag [value]="user()!.role?.name || 'No Role'" severity="info" />
                @if (user()!.department?.name) {
                  <span class="inline-flex items-center gap-1 text-xs text-surface-500 bg-surface-100 px-2 py-1 rounded-full">
                    <i class="pi pi-building text-xs"></i>{{ user()!.department!.name }}
                  </span>
                }
                @if (user()!.employee_id) {
                  <span class="inline-flex items-center gap-1 text-xs text-surface-500 bg-surface-100 px-2 py-1 rounded-full">
                    <i class="pi pi-id-card text-xs"></i>{{ user()!.employee_id }}
                  </span>
                }
              </div>
            } @else {
              <p class="text-surface-500 text-sm">Profile not loaded. Please refresh the page.</p>
            }
          </div>

          <!-- Status badge -->
          @if (!isLoading() && user()) {
            <div class="flex-shrink-0">
              <p-tag
                [value]="user()!.is_active ? 'Active' : 'Inactive'"
                [severity]="user()!.is_active ? 'success' : 'danger'"
              />
            </div>
          }
        </div>

        <!-- Account meta row -->
        @if (!isLoading() && user()) {
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 pt-5 border-t border-surface-100">
            <div>
              <p class="text-xs text-surface-400 uppercase tracking-wide font-medium">Role</p>
              <p class="text-sm font-semibold text-surface-800 mt-1">{{ user()!.role?.name || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-surface-400 uppercase tracking-wide font-medium">Department</p>
              <p class="text-sm font-semibold text-surface-800 mt-1">{{ user()!.department?.name || '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-surface-400 uppercase tracking-wide font-medium">Timezone</p>
              <p class="text-sm font-semibold text-surface-800 mt-1">{{ user()!.timezone || 'UTC' }}</p>
            </div>
            <div>
              <p class="text-xs text-surface-400 uppercase tracking-wide font-medium">Member Since</p>
              <p class="text-sm font-semibold text-surface-800 mt-1">{{ user()!.created_at | date:'mediumDate' }}</p>
            </div>
          </div>
        }
      </div>

      <!-- ─── Personal Information ─── -->
      <div class="bg-white rounded-xl border border-surface-200 shadow-sm">
        <div class="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-surface-800">Personal Information</h3>
            <p class="text-xs text-surface-500 mt-0.5">Update your display name, phone number, and timezone</p>
          </div>
          <i class="pi pi-user text-surface-400 text-lg"></i>
        </div>
        <div class="p-6">
          @if (isLoading()) {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              @for (i of [1,2,3]; track i) {
                <div>
                  <p-skeleton width="100px" height="13px" styleClass="mb-2" />
                  <p-skeleton height="40px" />
                </div>
              }
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

              <!-- Full Name -->
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-surface-700">
                  Full Name <span class="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  pInputText
                  [(ngModel)]="editForm.full_name"
                  placeholder="Enter your full name"
                  class="w-full"
                />
              </div>

              <!-- Phone -->
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-surface-700">Phone Number</label>
                <div class="relative">
                  <input
                    type="tel"
                    pInputText
                    [(ngModel)]="editForm.phone"
                    placeholder="+91 9876543210"
                    class="w-full pr-20"
                  />
                  @if (editForm.phone) {
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-surface-400 bg-surface-100 px-2 py-0.5 rounded">
                      Stored
                    </span>
                  }
                </div>
                <p class="text-xs text-surface-400">
                  <i class="pi pi-info-circle text-xs mr-1"></i>
                  Phone is stored for reference. SMS verification requires Twilio setup.
                </p>
              </div>

              <!-- Timezone -->
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-surface-700">Timezone</label>
                <select
                  [(ngModel)]="editForm.timezone"
                  class="w-full h-10 px-3 border border-surface-300 rounded-md text-sm text-surface-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                >
                  @for (tz of timezones; track tz) {
                    <option [value]="tz">{{ tz }}</option>
                  }
                </select>
              </div>

            </div>

            <!-- Save Profile -->
            <div class="flex justify-end mt-6 pt-4 border-t border-surface-100">
              <p-button
                label="Save Changes"
                icon="pi pi-save"
                [loading]="isSaving()"
                [disabled]="isSaving()"
                (onClick)="saveProfile()"
              />
            </div>
          }
        </div>
      </div>

      <!-- ─── Email Verification & Change ─── -->
      <div class="bg-white rounded-xl border border-surface-200 shadow-sm">
        <div class="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-surface-800">Email Address</h3>
            <p class="text-xs text-surface-500 mt-0.5">Verify your email or update to a new address</p>
          </div>
          <i class="pi pi-envelope text-surface-400 text-lg"></i>
        </div>
        <div class="p-6 space-y-5">

          <!-- Current Email Status -->
          <div class="flex items-center justify-between p-4 rounded-lg border"
            [class]="emailVerified() ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full flex items-center justify-center"
                [class]="emailVerified() ? 'bg-emerald-100' : 'bg-amber-100'">
                <i [class]="(emailVerified() ? 'pi pi-check text-emerald-600' : 'pi pi-exclamation-triangle text-amber-600') + ' text-sm'"></i>
              </div>
              <div>
                <p class="text-sm font-semibold text-surface-800">{{ user()?.email || '—' }}</p>
                <p class="text-xs mt-0.5"
                  [class]="emailVerified() ? 'text-emerald-600' : 'text-amber-600'">
                  {{ emailVerified() ? 'Email verified — your account is fully active' : 'Email not verified — please verify to activate all features' }}
                </p>
              </div>
            </div>
            @if (!emailVerified()) {
              <p-button
                label="Resend Verification"
                icon="pi pi-send"
                severity="warn"
                size="small"
                [outlined]="true"
                [loading]="isResendingVerification()"
                [disabled]="resendCooldown() > 0"
                (onClick)="resendVerificationEmail()"
              />
            }
          </div>

          <!-- Cooldown notice -->
          @if (resendCooldown() > 0) {
            <p class="text-xs text-surface-500 text-center">
              <i class="pi pi-clock text-xs mr-1"></i>
              You can resend again in {{ resendCooldown() }} seconds
            </p>
          }

          <!-- Resend success notice -->
          @if (verificationEmailSent()) {
            <div class="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <i class="pi pi-check-circle text-emerald-500"></i>
              Verification email sent! Check your inbox and click the link to verify.
            </div>
          }

          <p-divider />

          <!-- Change Email -->
          <div>
            <p class="text-sm font-medium text-surface-700 mb-1">Change Email Address</p>
            <p class="text-xs text-surface-500 mb-4">
              A confirmation link will be sent to your new email. Your email will not change until you click the link.
            </p>
            <div class="flex gap-3">
              <input
                type="email"
                pInputText
                [(ngModel)]="newEmail"
                placeholder="Enter new email address"
                class="flex-1"
              />
              <p-button
                label="Send Confirmation"
                icon="pi pi-envelope"
                severity="secondary"
                [loading]="isChangingEmail()"
                [disabled]="!newEmail.trim() || isChangingEmail()"
                (onClick)="changeEmail()"
              />
            </div>
            @if (emailChangeMessage()) {
              <div class="flex items-start gap-2 mt-3 text-sm rounded-lg px-4 py-3"
                [class]="emailChangeSuccess() ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-red-700 bg-red-50 border border-red-200'">
                <i [class]="(emailChangeSuccess() ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-red-500') + ' mt-0.5'"></i>
                <span>{{ emailChangeMessage() }}</span>
              </div>
            }
          </div>

        </div>
      </div>

      <!-- ─── Change Password ─── -->
      <div class="bg-white rounded-xl border border-surface-200 shadow-sm">
        <div class="px-6 py-4 border-b border-surface-200 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-surface-800">Change Password</h3>
            <p class="text-xs text-surface-500 mt-0.5">Use a strong password with at least 8 characters</p>
          </div>
          <i class="pi pi-lock text-surface-400 text-lg"></i>
        </div>
        <div class="p-6">
          <div class="max-w-lg space-y-5">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-surface-700">
                New Password <span class="text-red-500">*</span>
              </label>
              <p-password
                [(ngModel)]="passwordForm.newPassword"
                placeholder="Enter new password (min 8 characters)"
                [feedback]="true"
                [toggleMask]="true"
                styleClass="w-full"
                inputStyleClass="w-full"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium text-surface-700">
                Confirm New Password <span class="text-red-500">*</span>
              </label>
              <p-password
                [(ngModel)]="passwordForm.confirmPassword"
                placeholder="Re-enter new password"
                [feedback]="false"
                [toggleMask]="true"
                styleClass="w-full"
                inputStyleClass="w-full"
              />
              @if (passwordMismatch()) {
                <div class="flex items-center gap-1.5 text-red-600 text-xs">
                  <i class="pi pi-exclamation-circle"></i>
                  Passwords do not match
                </div>
              }
            </div>
          </div>

          <div class="flex justify-end mt-6 pt-4 border-t border-surface-100">
            <p-button
              label="Update Password"
              icon="pi pi-lock"
              severity="secondary"
              [loading]="isChangingPassword()"
              [disabled]="isChangingPassword()"
              (onClick)="changePassword()"
            />
          </div>
        </div>
      </div>

      <!-- ─── Session / Sign Out ─── -->
      <div class="bg-white rounded-xl border border-red-200 shadow-sm">
        <div class="px-6 py-4 border-b border-red-100 flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-red-700">Session</h3>
            <p class="text-xs text-surface-500 mt-0.5">Sign out of your account on this device</p>
          </div>
          <i class="pi pi-sign-out text-red-400 text-lg"></i>
        </div>
        <div class="p-6 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-surface-800">Sign Out</p>
            <p class="text-xs text-surface-500 mt-0.5">You will be redirected to the login page</p>
          </div>
          <p-button
            label="Sign Out"
            icon="pi pi-sign-out"
            severity="danger"
            [outlined]="true"
            (onClick)="signOut()"
          />
        </div>
      </div>

    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private supabase = inject(SUPABASE_CLIENT);

  protected user = this.authService.currentUser;
  protected isLoading = signal(false);
  protected isSaving = signal(false);
  protected isChangingPassword = signal(false);
  protected passwordMismatch = signal(false);

  // Email verification state
  protected isResendingVerification = signal(false);
  protected verificationEmailSent = signal(false);
  protected resendCooldown = signal(0);
  protected isChangingEmail = signal(false);
  protected newEmail = '';
  protected emailChangeMessage = signal('');
  protected emailChangeSuccess = signal(false);

  protected readonly timezones = TIMEZONES;

  protected editForm = {
    full_name: '',
    phone: '',
    timezone: 'UTC',
  };

  protected passwordForm = {
    newPassword: '',
    confirmPassword: '',
  };

  protected emailVerified = computed(() => {
    const session = this.authService.session();
    return !!session?.user?.email_confirmed_at;
  });

  protected avatarColor = computed(() => {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];
    const name = this.user()?.full_name ?? '';
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx] ?? '#3B82F6';
  });

  ngOnInit(): void {
    const u = this.user();
    if (u) {
      this.editForm.full_name = u.full_name ?? '';
      this.editForm.phone = u.phone ?? '';
      this.editForm.timezone = u.timezone ?? 'UTC';
    }
  }

  protected getInitial(): string {
    const name = this.user()?.full_name;
    return name ? name.charAt(0).toUpperCase() : 'U';
  }

  protected async saveProfile(): Promise<void> {
    if (!this.editForm.full_name.trim()) {
      this.toastService.error('Full name is required.');
      return;
    }
    const userId = this.user()?.id;
    if (!userId) { this.toastService.error('Session expired. Please log in again.'); return; }

    this.isSaving.set(true);
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          full_name: this.editForm.full_name.trim(),
          phone: this.editForm.phone.trim() || null,
          timezone: this.editForm.timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      await this.authService.refreshProfile();
      this.toastService.success('Profile updated successfully.');
    } catch {
      this.toastService.error('Failed to save profile. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async resendVerificationEmail(): Promise<void> {
    const email = this.user()?.email;
    if (!email) return;

    this.isResendingVerification.set(true);
    this.verificationEmailSent.set(false);
    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: window.location.origin + '/auth/login' },
      });
      if (error) throw error;
      this.verificationEmailSent.set(true);
      this.toastService.success('Verification email sent! Check your inbox.');
      this.startResendCooldown(60);
    } catch {
      this.toastService.error('Could not send verification email. Please try again.');
    } finally {
      this.isResendingVerification.set(false);
    }
  }

  private startResendCooldown(seconds: number): void {
    this.resendCooldown.set(seconds);
    const interval = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        clearInterval(interval);
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  protected async changeEmail(): Promise<void> {
    const trimmed = this.newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      this.toastService.error('Enter a valid email address.');
      return;
    }
    if (trimmed === this.user()?.email?.toLowerCase()) {
      this.toastService.error('New email must be different from your current email.');
      return;
    }

    this.isChangingEmail.set(true);
    this.emailChangeMessage.set('');
    try {
      const { error } = await this.supabase.auth.updateUser(
        { email: trimmed },
        { emailRedirectTo: window.location.origin + '/auth/login' }
      );
      if (error) throw error;
      this.emailChangeSuccess.set(true);
      this.emailChangeMessage.set(
        'Confirmation link sent to ' + trimmed + '. Click it to complete the email change. Your current email remains active until then.'
      );
      this.newEmail = '';
    } catch (err: unknown) {
      this.emailChangeSuccess.set(false);
      const msg = err && typeof err === 'object' && 'message' in err
        ? (err as { message: string }).message
        : 'Failed to send confirmation email. Please try again.';
      this.emailChangeMessage.set(msg);
    } finally {
      this.isChangingEmail.set(false);
    }
  }

  protected async changePassword(): Promise<void> {
    const { newPassword, confirmPassword } = this.passwordForm;
    if (!newPassword || newPassword.length < 8) {
      this.toastService.error('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordMismatch.set(true);
      return;
    }
    this.passwordMismatch.set(false);
    this.isChangingPassword.set(true);
    try {
      const result = await this.authService.updatePassword(newPassword);
      if (result.success) {
        this.toastService.success('Password changed successfully.');
        this.passwordForm.newPassword = '';
        this.passwordForm.confirmPassword = '';
      } else {
        this.toastService.error(result.message || 'Failed to change password.');
      }
    } catch {
      this.toastService.error('An unexpected error occurred. Please try again.');
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch {
      this.toastService.error('Sign out failed. Please try again.');
    }
  }
}
