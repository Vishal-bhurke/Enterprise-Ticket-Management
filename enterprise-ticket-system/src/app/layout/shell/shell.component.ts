import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationStart } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, ButtonModule],
  template: `
    <div class="flex h-screen bg-surface-50 overflow-hidden">

      <!-- Mobile backdrop (appears behind the open sidebar overlay) -->
      @if (mobileSidebarOpen()) {
        <div
          class="fixed inset-0 z-40 bg-black/50 md:hidden"
          (click)="mobileSidebarOpen.set(false)"
        ></div>
      }

      <!-- Sidebar wrapper
           • Mobile: CSS in styles.scss makes this a fixed overlay
           • Desktop: stays in the normal flex row -->
      <div class="app-sidebar-wrapper" [class.is-mobile-open]="mobileSidebarOpen()">
        <app-sidebar [collapsed]="mobileSidebarOpen() ? false : sidebarCollapsed()" />
      </div>

      <!-- Main content area -->
      <div class="flex flex-col flex-1 min-w-0 overflow-hidden">

        <!-- Top Header -->
        <app-header
          [sidebarCollapsed]="sidebarCollapsed()"
          (toggleSidebar)="onToggleSidebar()"
        />

        <!-- Profile Not Found Banner -->
        @if (showProfileError()) {
          <div class="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-3 flex items-center gap-3">
            <i class="pi pi-exclamation-triangle text-amber-500 flex-shrink-0"></i>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-amber-800">Profile not set up</p>
              <p class="text-xs text-amber-600 hidden sm:block">
                Your user profile has not been created in the database.
                Run the setup SQL in Supabase SQL Editor, then click Retry.
              </p>
            </div>
            <p-button
              label="Retry"
              icon="pi pi-refresh"
              severity="warn"
              size="small"
              [loading]="retrying()"
              (onClick)="retryProfileLoad()"
            />
            <p-button
              label="Sign Out"
              icon="pi pi-sign-out"
              severity="secondary"
              size="small"
              [text]="true"
              (onClick)="signOut()"
            />
          </div>
        }

        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto p-4 md:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  sidebarCollapsed = signal(false);
  mobileSidebarOpen = signal(false);
  retrying = signal(false);

  constructor() {
    // Auto-close mobile sidebar on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationStart),
      takeUntilDestroyed()
    ).subscribe(() => {
      this.mobileSidebarOpen.set(false);
    });
  }

  protected showProfileError = computed(() =>
    !this.authService.isInitializing() &&
    this.authService.profileLoadError() === 'profile_not_found'
  );

  onToggleSidebar(): void {
    if (window.innerWidth < 768) {
      // Mobile: toggle the overlay sidebar
      this.mobileSidebarOpen.set(!this.mobileSidebarOpen());
    } else {
      // Desktop: collapse / expand the sidebar
      this.sidebarCollapsed.set(!this.sidebarCollapsed());
      this.mobileSidebarOpen.set(false);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    // When the viewport grows past the mobile breakpoint, always close the overlay
    if (window.innerWidth >= 768) {
      this.mobileSidebarOpen.set(false);
    }
  }

  async retryProfileLoad(): Promise<void> {
    this.retrying.set(true);
    try {
      await this.authService.refreshProfile();
    } finally {
      this.retrying.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.authService.signOut().catch(() => {
      window.location.href = '/auth/login';
    });
  }
}
