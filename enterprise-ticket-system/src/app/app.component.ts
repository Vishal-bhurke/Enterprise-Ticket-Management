import { Component, inject } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/auth/auth.service';
import { LoadingService } from './core/services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastModule, ConfirmDialogModule, ProgressSpinnerModule],
  template: `
    <p-toast position="top-right" />
    <p-confirmDialog />

    <!-- Phase 1: App initialization (auth session restore + profile load)
         Shown while AuthService.initialize() runs via APP_INITIALIZER.
         Prevents flash of login page before session is confirmed. -->
    @if (isInitializing()) {
      <div class="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999] gap-5">
        <!-- Brand mark -->
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <i class="pi pi-ticket text-white text-xl"></i>
          </div>
          <div class="leading-tight">
            <p class="font-bold text-surface-900 text-lg leading-none">Enterprise Ticket</p>
            <p class="text-primary-500 text-sm font-medium">System</p>
          </div>
        </div>

        <!-- Spinner -->
        <p-progressSpinner
          strokeWidth="4"
          animationDuration="0.75s"
          styleClass="w-10 h-10"
        />

        <p class="text-surface-400 text-sm">Loading your workspace&hellip;</p>
      </div>
    } @else {
      <router-outlet />

      <!-- Phase 2: Global blocking overlay
           Shows during route navigation (lazy chunk loading) and explicit
           operations like sign out. z-[10000] sits above PrimeNG dialogs
           (z-1100) and menus (z-1000). Semi-transparent so the user retains
           context of what they were doing. -->
      @if (isLoading()) {
        <div
          class="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-4"
          style="background: rgba(255,255,255,0.75); backdrop-filter: blur(2px);"
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <p-progressSpinner
            strokeWidth="4"
            animationDuration="0.75s"
            styleClass="w-12 h-12"
          />
          <p class="text-surface-600 text-sm font-medium select-none">
            {{ loadingMessage() }}
          </p>
        </div>
      }
    }
  `,
})
export class AppComponent {
  protected isInitializing = inject(AuthService).isInitializing;

  private loadingService = inject(LoadingService);
  private router = inject(Router);

  protected isLoading = this.loadingService.isLoading;
  protected loadingMessage = this.loadingService.message;

  constructor() {
    // Listen to router navigation events to show the global overlay during
    // lazy chunk fetching and route guard resolution.
    // takeUntilDestroyed() auto-unsubscribes when this component is destroyed.
    this.router.events
      .pipe(takeUntilDestroyed())
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          this.loadingService.show('Navigating...');
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          this.loadingService.hide();
        }
      });
  }
}
