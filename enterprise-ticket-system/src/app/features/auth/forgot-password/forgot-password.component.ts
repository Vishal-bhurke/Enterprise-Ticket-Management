import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, ToastModule],
  template: `
    <p-toast />
    <div class="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
            <i class="pi pi-lock text-white text-3xl"></i>
          </div>
          <h1 class="text-2xl font-bold text-white">Reset Password</h1>
          <p class="text-surface-400 text-sm mt-1">Enter your email to receive a reset link</p>
        </div>

        <div class="bg-white rounded-2xl shadow-2xl p-8">
          @if (emailSent()) {
            <div class="text-center py-4">
              <i class="pi pi-envelope-open text-5xl text-green-500 mb-4 block"></i>
              <h3 class="text-lg font-semibold text-surface-800 mb-2">Check your inbox</h3>
              <p class="text-surface-500 text-sm mb-6">
                We sent a password reset link to <strong>{{ sentEmail() }}</strong>.
                Please check your email and follow the instructions.
              </p>
              <a routerLink="/auth/login" class="text-primary-600 hover:text-primary-700 text-sm font-medium">
                Back to sign in
              </a>
            </div>
          } @else {
            <h2 class="text-xl font-semibold text-surface-900 mb-2">Forgot your password?</h2>
            <p class="text-surface-500 text-sm mb-6">
              Enter your registered email address and we'll send you a link to reset your password.
            </p>

            @if (errorMessage()) {
              <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex gap-3">
                <i class="pi pi-exclamation-triangle text-red-500"></i>
                <p class="text-red-700 text-sm">{{ errorMessage() }}</p>
              </div>
            }

            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
              <div class="flex flex-col gap-1.5">
                <label class="text-sm font-medium text-surface-700">Email Address</label>
                <input
                  type="email"
                  pInputText
                  formControlName="email"
                  placeholder="you@company.com"
                  class="w-full"
                />
                @if (form.get('email')?.invalid && form.get('email')?.touched) {
                  <span class="text-xs text-red-600">Please enter a valid email address.</span>
                }
              </div>

              <p-button
                type="submit"
                label="Send Reset Link"
                icon="pi pi-send"
                [loading]="isLoading()"
                styleClass="w-full"
              />
            </form>

            <div class="text-center mt-5">
              <a routerLink="/auth/login" class="text-sm text-surface-500 hover:text-surface-700">
                <i class="pi pi-arrow-left mr-1"></i> Back to sign in
              </a>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  protected form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  protected isLoading = signal(false);
  protected emailSent = signal(false);
  protected sentEmail = signal('');
  protected errorMessage = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const email = this.form.value.email.trim();

    const result = await this.authService.sendPasswordReset(email);

    if (result.success) {
      this.sentEmail.set(email);
      this.emailSent.set(true);
    } else {
      this.errorMessage.set(result.message);
    }

    this.isLoading.set(false);
  }
}
