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

    <div class="h-screen flex overflow-hidden">

      <!-- ═══════════════════════════════════════════
           LEFT PANEL  (desktop lg+, hidden on mobile)
           Uses absolute positioning for guaranteed centering:
           Brand pinned top · Hero absolutely centered · Trust pinned bottom
           ═══════════════════════════════════════════ -->
      <div class="hidden lg:flex lg:w-[45%] xl:w-1/2 h-screen relative overflow-hidden flex-shrink-0"
           style="background: linear-gradient(160deg, #020617 0%, #1e1b4b 55%, #0c0a1e 100%);">

        <!-- Decorative blobs -->
        <div class="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
             style="background: radial-gradient(circle, rgba(99,102,241,0.3), transparent 65%); filter: blur(80px);"></div>
        <div class="absolute top-1/2 -right-24 w-96 h-96 rounded-full"
             style="background: radial-gradient(circle, rgba(59,130,246,0.2), transparent 65%); filter: blur(80px);"></div>
        <div class="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full"
             style="background: radial-gradient(circle, rgba(139,92,246,0.25), transparent 65%); filter: blur(72px);"></div>

        <!-- Dot grid texture -->
        <div class="absolute inset-0 opacity-[0.04]"
             style="background-image: radial-gradient(circle, #ffffff 1px, transparent 1px); background-size: 24px 24px;"></div>

        <!-- Left edge glow accent -->
        <div class="absolute left-0 top-1/4 bottom-1/4 w-px"
             style="background: linear-gradient(180deg, transparent, #6366f1 50%, transparent);"></div>

        <!-- ── All content: one block, truly centered (mirrors right panel card) ── -->
        <div class="absolute inset-0 z-10 flex items-center justify-center p-10">
          <div class="w-full max-w-[360px]">

            <!-- Brand -->
            <div class="flex items-center gap-3 mb-10">
              <div class="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <i class="pi pi-ticket text-white text-lg"></i>
              </div>
              <div class="leading-tight">
                <p class="text-white font-bold text-sm leading-none">Enterprise Ticket</p>
                <p class="text-indigo-400 text-xs font-medium tracking-wider uppercase">System</p>
              </div>
            </div>

            <!-- Accent bar -->
            <div class="w-10 h-1 rounded-full mb-6"
                 style="background: linear-gradient(90deg, #6366f1, #3b82f6);"></div>

            <!-- Headline -->
            <h2 class="text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-5">
              Your team's<br>
              <span style="background: linear-gradient(90deg, #a5b4fc, #93c5fd);
                           -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                service desk,
              </span><br>
              reimagined.
            </h2>

            <!-- Subtitle -->
            <p class="text-slate-400 text-sm leading-relaxed mb-9">
              Manage, track and resolve every request — with the speed,
              clarity and automation your team deserves.
            </p>

            <!-- Feature checkmarks -->
            <div class="space-y-3.5 mb-10">
              @for (f of features; track f) {
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                       style="background: rgba(99,102,241,0.25); border: 1px solid rgba(99,102,241,0.4);">
                    <i class="pi pi-check text-indigo-400" style="font-size: 9px;"></i>
                  </div>
                  <span class="text-slate-300 text-sm">{{ f }}</span>
                </div>
              }
            </div>

            <!-- Trust line -->
            <div class="border-t border-white/10 pt-5">
              <p class="text-slate-600 text-xs tracking-wide">
                Enterprise-grade security &nbsp;·&nbsp; Role-based access &nbsp;·&nbsp; Audit-ready
              </p>
            </div>

          </div>
        </div>

      </div>

      <!-- ═══════════════════════════════════════
           RIGHT PANEL — form, vertically centered
           ═══════════════════════════════════════ -->
      <div class="flex-1 flex items-center justify-center bg-slate-50 p-6 sm:p-10">
        <div class="w-full max-w-[400px]">

          <!-- Card -->
          <div class="bg-white rounded-2xl shadow-md border border-slate-100 px-8 py-10 sm:px-10">

            <!-- Mobile-only brand -->
            <div class="flex flex-col items-center mb-8 lg:hidden">
              <div class="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                <i class="pi pi-ticket text-white text-2xl"></i>
              </div>
              <h1 class="text-lg font-bold text-slate-900">Enterprise Ticket System</h1>
              <p class="text-slate-500 text-sm mt-1">Sign in to your account</p>
            </div>

            <!-- Heading -->
            <div class="mb-8">
              <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p class="text-slate-500 text-sm mt-1.5">Sign in to continue to your workspace</p>
            </div>

            <!-- Error banner -->
            @if (errorMessage()) {
              <div class="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <i class="pi pi-exclamation-circle text-red-500 mt-0.5 flex-shrink-0"></i>
                <p class="text-red-700 text-sm leading-relaxed">{{ errorMessage() }}</p>
              </div>
            }

            <!-- Form -->
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate class="space-y-5">

              <!-- Email -->
              <div class="flex flex-col gap-2">
                <label for="email" class="text-sm font-semibold text-slate-700">Email Address</label>
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
                  <span class="text-xs text-red-600 flex items-center gap-1">
                    <i class="pi pi-exclamation-circle text-xs"></i>
                    @if (loginForm.get('email')?.hasError('required')) {
                      Email address is required.
                    } @else if (loginForm.get('email')?.hasError('email')) {
                      Please enter a valid email address.
                    }
                  </span>
                }
              </div>

              <!-- Password -->
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <label for="password" class="text-sm font-semibold text-slate-700">Password</label>
                  <a routerLink="/auth/forgot-password"
                     class="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
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
                  <span class="text-xs text-red-600 flex items-center gap-1">
                    <i class="pi pi-exclamation-circle text-xs"></i>
                    @if (loginForm.get('password')?.hasError('required')) {
                      Password is required.
                    } @else if (loginForm.get('password')?.hasError('minlength')) {
                      Password must be at least 6 characters.
                    }
                  </span>
                }
              </div>

              <!-- Submit -->
              <div class="pt-2">
                <p-button
                  type="submit"
                  label="Sign In"
                  icon="pi pi-sign-in"
                  [loading]="isLoading()"
                  [disabled]="isLoading()"
                  styleClass="w-full"
                  size="large"
                />
              </div>

            </form>

            <!-- Footer note -->
            <p class="text-center text-xs text-slate-400 mt-7 leading-relaxed">
              Having trouble? Contact your system administrator.
            </p>

          </div>

          <!-- Version below card -->
          <p class="text-center text-xs text-slate-400 mt-5">
            Enterprise Ticket System &nbsp;v1.0.0
          </p>

        </div>
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

  protected readonly features = [
    'Smart Ticket Management & Assignment',
    'Automated Workflow & SLA Enforcement',
    'Real-time Reports & Analytics',
    'Role-based Access & Audit Logs',
  ];

  private returnUrl = '/dashboard';

  ngOnInit(): void {
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
