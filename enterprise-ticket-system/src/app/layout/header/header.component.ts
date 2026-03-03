import { Component, computed, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/auth/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    BadgeModule,
    MenuModule,
    NotificationPanelComponent,
  ],
  template: `
    <header class="bg-white border-b border-surface-200 px-4 sm:px-6 py-3 flex items-center gap-4 flex-shrink-0">
      <!-- Toggle sidebar button -->
      <p-button
        icon="pi pi-bars"
        severity="secondary"
        [text]="true"
        [rounded]="true"
        (onClick)="toggleSidebar.emit()"
        pTooltip="Toggle sidebar"
        tooltipPosition="right"
      />

      <!-- Breadcrumb / Page title area -->
      <div class="flex-1"></div>

      <!-- Right actions -->
      <div class="flex items-center gap-2">
        <!-- Notifications bell -->
        <div class="relative">
          <p-button
            icon="pi pi-bell"
            severity="secondary"
            [text]="true"
            [rounded]="true"
            (onClick)="notificationPanelOpen.set(!notificationPanelOpen())"
            pTooltip="Notifications"
          />
          @if (unreadCount() > 0) {
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {{ unreadCount() > 9 ? '9+' : unreadCount() }}
            </span>
          }
        </div>

        <!-- User menu — grayed out + pointer blocked while signing out -->
        <div
          class="flex items-center gap-2 cursor-pointer transition-opacity"
          [class.opacity-60]="isSigningOut()"
          [class.pointer-events-none]="isSigningOut()"
          (click)="userMenu.toggle($event)"
        >
          <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <span class="text-xs font-bold text-white">
              {{ currentUser()?.full_name?.charAt(0)?.toUpperCase() || 'U' }}
            </span>
          </div>
          <div class="hidden sm:block">
            <p class="text-sm font-medium text-surface-800 leading-tight">{{ currentUser()?.full_name || 'User' }}</p>
            <p class="text-xs text-surface-500">{{ currentUser()?.role?.name || '' }}</p>
          </div>
          <i class="pi pi-chevron-down text-xs text-surface-400"></i>
        </div>

        <!-- userMenuItems() — computed signal so disabled state reacts to isSigningOut.
             appendTo="body" prevents clipping on mobile where trigger is near viewport edge. -->
        <p-menu #userMenu [popup]="true" [model]="userMenuItems()" appendTo="body" />
      </div>
    </header>

    <!-- Notification slide-over panel -->
    @if (notificationPanelOpen()) {
      <app-notification-panel (close)="notificationPanelOpen.set(false)" />
    }
  `,
})
export class HeaderComponent implements OnInit {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<void>();

  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);

  protected currentUser = this.authService.currentUser;
  protected notificationPanelOpen = signal(false);
  protected unreadCount = signal(0);
  protected isSigningOut = signal(false);

  // computed so that `disabled` and `label`/`icon` react to isSigningOut() changes
  protected userMenuItems = computed<MenuItem[]>(() => [
    {
      label: 'My Profile',
      icon: 'pi pi-user',
      routerLink: '/profile',
      disabled: this.isSigningOut(),
    },
    { separator: true },
    {
      label: this.isSigningOut() ? 'Signing out...' : 'Sign Out',
      icon: this.isSigningOut() ? 'pi pi-spin pi-spinner' : 'pi pi-sign-out',
      disabled: this.isSigningOut(),
      command: () => this.handleSignOut(),
    },
  ]);

  ngOnInit(): void {
    // unreadCount updated by notification panel on open
  }

  protected async handleSignOut(): Promise<void> {
    // Guard: ignore re-entrant calls (e.g. rapid menu clicks)
    if (this.isSigningOut()) return;

    this.isSigningOut.set(true);
    this.loadingService.show('Signing out...');

    try {
      await this.authService.signOut();
      // On success: authService.signOut() navigates to /auth/login.
      // AppComponent's NavigationEnd subscription will call loadingService.hide().
    } catch {
      // If Supabase signOut fails, force redirect to login
      window.location.href = '/auth/login';
    } finally {
      // Runs on error path (success path: component is destroyed by navigation)
      this.isSigningOut.set(false);
      this.loadingService.hide();
    }
  }
}
