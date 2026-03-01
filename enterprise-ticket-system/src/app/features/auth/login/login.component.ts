import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    MessageModule,
    ToastModule,
  ],
  template: `
    <p-toast />
    <div class="min-h-screen bg-gradient-to-br from-surface-900 via-surface-800 to-primary-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">

        <!-- Logo / Brand -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg">
            <i class="pi pi-ticket text-white text-3xl"></i>
          </div>
          <h1 class="text-2xl font-bold text-white">Enterprise Ticket System</h1>
          <p class="text-surface-400 text-sm mt-1">Sign in to your account</p>
        </div>

        <!-- Login Card -->
        <div class="bg-white rounded-2xl shadow-2xl p-8">
          <h2 class="text-xl font-semibold text-surface-900 mb-6">Welcome back</h2>

          <!-- Error banner -->
          @if (errorMessage()) {
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex items-start gap-3">
              <i class="pi pi-exclamation-triangle text-red-500 mt-0.5"></i>
              <p class="text-red-700 text-sm">{{ errorMessage() }}</p>
            </div>
          }

          <!-- Login Form -->
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate class="space-y-5">

            <!-- Email field -->
            <div class="flex flex-col gap-1.5">
              <label for="email" class="text-sm font-medium text-surface-700">Email Address</label>
              <input
                id="email"
                type="email"
                pInputText
                formControlName="email"
                placeholder="you@company.com"
                autocomplete="email"
                class="w-full"
                [class.ng-invalid]="isInvalid('email')"
              />
              @if (isInvalid('email')) {
                <span class="text-xs text-red-600">
                  @if (loginForm.get('email')?.hasError('required')) {
                    Email address is required.
                  } @else if (loginForm.get('email')?.hasError('email')) {
                    Please enter a valid email address.
                  }
                </span>
              }
            </div>

            <!-- Password field -->
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <label for="password" class="text-sm font-medium text-surface-700">Password</label>
                <a routerLink="/auth/forgot-password" class="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Forgot password?
                </a>
              </div>
              <p-password
                inputId="password"
                formControlName="password"
                placeholder="Enter your password"
                [feedback]="false"
                [toggleMask]="true"
                autocomplete="current-password"
                styleClass="w-full"
                inputStyleClass="w-full"
                [class.ng-invalid]="isInvalid('password')"
              />
              @if (isInvalid('password')) {
                <span class="text-xs text-red-600">
                  @if (loginForm.get('password')?.hasError('required')) {
                    Password is required.
                  } @else if (loginForm.get('password')?.hasError('minlength')) {
                    Password must be at least 6 characters.
                  }
                </span>
              }
            </div>

            <!-- Submit button -->
            <p-button
              type="submit"
              label="Sign In"
              icon="pi pi-sign-in"
              [loading]="isLoading()"
              [disabled]="isLoading()"
              styleClass="w-full"
              size="large"
            />
          </form>

          <!-- Footer note -->
          <p class="text-center text-xs text-surface-400 mt-6">
            Having trouble? Contact your system administrator.
          </p>
        </div>

        <!-- Version -->
        <p class="text-center text-xs text-surface-500 mt-6">
          Enterprise Ticket System v1.0.0
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastService = inject(ToastService);

  protected loginForm!: FormGroup;
  protected isLoading = signal(false);
  protected errorMessage = signal<string | null>(null);

  private returnUrl = '/dashboard';

  ngOnInit(): void {
    // If already authenticated, redirect to dashboard
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    const result = await this.authService.signIn(email.trim(), password);

    if (result.success) {
      this.toastService.success('Welcome back!');
      this.router.navigate([this.returnUrl]);
    } else {
      this.errorMessage.set(result.message);
    }

    this.isLoading.set(false);
  }

  isInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}
