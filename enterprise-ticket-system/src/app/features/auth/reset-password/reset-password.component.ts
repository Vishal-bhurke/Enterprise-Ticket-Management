import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ButtonModule, PasswordModule],
  template: `
    <div class="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div class="w-full max-w-md">

        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <i class="pi pi-lock text-white text-2xl"></i>
          </div>
          <h1 class="text-2xl font-bold text-surface-900">Set New Password</h1>
          <p class="text-surface-500 text-sm mt-1">Enter a strong new password for your account</p>
        </div>

        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-surface-200 p-8">

          @if (isExpired()) {
            <!-- Link expired state -->
            <div class="text-center">
              <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="pi pi-times-circle text-red-500 text-2xl"></i>
              </div>
              <h3 class="font-semibold text-surface-800 text-lg mb-2">Link Expired</h3>
              <p class="text-surface-500 text-sm mb-6">
                This password reset link has expired or is invalid. Please request a new one.
              </p>
              <a routerLink="/auth/forgot-password"
                class="inline-flex items-center gap-2 text-primary-600 font-medium text-sm hover:text-primary-700">
                <i class="pi pi-arrow-left text-xs"></i>
                Request new reset link
              </a>
            </div>
          } @else if (isSuccess()) {
            <!-- Success state -->
            <div class="text-center">
              <div class="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="pi pi-check-circle text-emerald-500 text-2xl"></i>
              </div>
              <h3 class="font-semibold text-surface-800 text-lg mb-2">Password Updated!</h3>
              <p class="text-surface-500 text-sm mb-6">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <p-button
                label="Go to Login"
                icon="pi pi-sign-in"
                (onClick)="goToLogin()"
                styleClass="w-full"
              />
            </div>
          } @else {
            <!-- Reset form -->
            <form (ngSubmit)="submit()" class="space-y-5">

              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-surface-700">
                  New Password <span class="text-red-500">*</span>
                </label>
                <p-password
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  placeholder="At least 8 characters"
                  [feedback]="true"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                />
                @if (newPassword.length > 0 && newPassword.length < 8) {
                  <p class="text-xs text-red-500">Password must be at least 8 characters</p>
                }
              </div>

              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-surface-700">
                  Confirm Password <span class="text-red-500">*</span>
                </label>
                <p-password
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter your new password"
                  [feedback]="false"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                />
                @if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
                  <p class="text-xs text-red-500">Passwords do not match</p>
                }
              </div>

              @if (errorMessage()) {
                <div class="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <i class="pi pi-exclamation-circle text-red-500"></i>
                  {{ errorMessage() }}
                </div>
              }

              <p-button
                type="submit"
                label="Update Password"
                icon="pi pi-lock"
                [loading]="isLoading()"
                [disabled]="isLoading() || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8"
                styleClass="w-full"
              />

            </form>
          }

        </div>

        <!-- Back to login -->
        @if (!isSuccess() && !isExpired()) {
          <p class="text-center text-sm text-surface-500 mt-6">
            Remember your password?
            <a routerLink="/auth/login" class="text-primary-600 font-medium hover:text-primary-700 ml-1">
              Sign in
            </a>
          </p>
        }

      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  protected newPassword = '';
  protected confirmPassword = '';
  protected isLoading = signal(false);
  protected isSuccess = signal(false);
  protected isExpired = signal(false);
  protected errorMessage = signal('');

  ngOnInit(): void {
    // Supabase puts the access_token in the URL hash after redirect
    // The Supabase client automatically picks this up via detectSessionInUrl: true
    // We just need to verify there IS a valid session from the reset link
    const hash = window.location.hash;
    if (!hash || (!hash.includes('access_token') && !hash.includes('type=recovery'))) {
      // No recovery token in URL — check if there's already a session
      const session = this.authService.session();
      if (!session) {
        this.isExpired.set(true);
      }
    }
  }

  protected async submit(): Promise<void> {
    if (this.newPassword.length < 8) {
      this.errorMessage.set('Password must be at least 8 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const result = await this.authService.updatePassword(this.newPassword);
      if (result.success) {
        this.isSuccess.set(true);
        this.toastService.success('Password updated successfully!');
      } else {
        if (result.message?.toLowerCase().includes('expired') || result.message?.toLowerCase().includes('invalid')) {
          this.isExpired.set(true);
        } else {
          this.errorMessage.set(result.message || 'Failed to update password. The link may have expired.');
        }
      }
    } catch {
      this.errorMessage.set('An unexpected error occurred. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
