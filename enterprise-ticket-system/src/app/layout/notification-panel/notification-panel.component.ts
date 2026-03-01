import { Component, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { AuthService } from '../../core/auth/auth.service';
import { Notification } from '../../shared/models/notification.model';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    RouterLink,
    TimeAgoPipe,
    LoadingOverlayComponent,
    EmptyStateComponent,
  ],
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/20 z-40"
      (click)="close.emit()"
    ></div>

    <!-- Panel -->
    <div class="fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-surface-200">
        <h2 class="font-semibold text-surface-900">Notifications</h2>
        <div class="flex items-center gap-2">
          @if (hasUnread()) {
            <button
              class="text-xs text-primary-600 hover:text-primary-700 font-medium"
              (click)="markAllRead()"
            >
              Mark all read
            </button>
          }
          <p-button icon="pi pi-times" severity="secondary" [text]="true" [rounded]="true" size="small" (onClick)="close.emit()" />
        </div>
      </div>

      <!-- Notification list -->
      <div class="flex-1 overflow-y-auto">
        @if (isLoading()) {
          <app-loading-overlay message="Loading notifications..." />
        } @else if (notifications().length === 0) {
          <app-empty-state
            icon="pi pi-bell"
            title="No notifications"
            description="You are all caught up!"
          />
        } @else {
          @for (notification of notifications(); track notification.id) {
            <div
              class="flex gap-3 px-5 py-4 border-b border-surface-100 hover:bg-surface-50 cursor-pointer transition-colors"
              [class.bg-blue-50]="!notification.is_read"
              (click)="handleNotificationClick(notification)"
            >
              <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                [class]="getNotificationIconClass(notification.type)">
                <i [class]="getNotificationIcon(notification.type) + ' text-sm'"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-surface-800 leading-snug">{{ notification.title }}</p>
                <p class="text-xs text-surface-500 mt-0.5 line-clamp-2">{{ notification.body }}</p>
                <p class="text-xs text-surface-400 mt-1">{{ notification.created_at | timeAgo }}</p>
              </div>
              @if (!notification.is_read) {
                <div class="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2"></div>
              }
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <div class="border-t border-surface-200 p-4">
        <a routerLink="/notifications" (click)="close.emit()"
          class="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-1">
          View all notifications
        </a>
      </div>
    </div>
  `,
})
export class NotificationPanelComponent extends SupabaseService implements OnInit {
  @Output() close = new EventEmitter<void>();

  private authService = inject(AuthService);

  protected notifications = signal<Notification[]>([]);
  protected isLoading = signal(true);
  protected hasUnread = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadNotifications();
  }

  private async loadNotifications(): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) { this.isLoading.set(false); return; }
    this.isLoading.set(true);
    try {
      const { data, error } = await this.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      this.notifications.set(data as Notification[]);
      this.hasUnread.set(data.some((n: Notification) => !n.is_read));
    } catch (error) {
      console.error('[NotificationPanel] Load error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async markAllRead(): Promise<void> {
    await this.client
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false);

    this.notifications.update(list => list.map(n => ({ ...n, is_read: true })));
    this.hasUnread.set(false);
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.is_read) {
      this.client
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notification.id)
        .then(() => {
          this.notifications.update(list =>
            list.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
          );
          this.hasUnread.set(this.notifications().some(n => !n.is_read));
        });
    }
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      ticket_update: 'pi pi-pencil',
      assignment: 'pi pi-user-plus',
      sla_breach: 'pi pi-exclamation-triangle',
      mention: 'pi pi-at',
      system: 'pi pi-info-circle',
      escalation: 'pi pi-arrow-up',
      approval: 'pi pi-check-circle',
    };
    return icons[type] ?? 'pi pi-bell';
  }

  getNotificationIconClass(type: string): string {
    const classes: Record<string, string> = {
      ticket_update: 'bg-blue-100 text-blue-600',
      assignment: 'bg-green-100 text-green-600',
      sla_breach: 'bg-red-100 text-red-600',
      mention: 'bg-purple-100 text-purple-600',
      system: 'bg-gray-100 text-gray-600',
      escalation: 'bg-orange-100 text-orange-600',
      approval: 'bg-teal-100 text-teal-600',
    };
    return classes[type] ?? 'bg-gray-100 text-gray-600';
  }
}
