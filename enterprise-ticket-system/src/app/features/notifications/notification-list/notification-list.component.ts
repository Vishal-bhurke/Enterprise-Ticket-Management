import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  ticket_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    CommonModule, ButtonModule, TagModule, SkeletonModule, TooltipModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="My Notifications"
      subtitle="Stay updated on ticket activity and system alerts"
      [breadcrumbs]="['Home', 'Notifications']"
    >
      @if (unreadCount() > 0) {
        <p-button label="Mark All Read" icon="pi pi-check-circle" severity="secondary"
          [outlined]="true" size="small" (onClick)="markAllRead()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            [class]="activeFilter === 'all' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-surface-600 hover:bg-surface-50'"
            (click)="setFilter('all')">All ({{ items().length }})</button>
          <button class="px-3 py-1.5 text-sm rounded-lg transition-colors"
            [class]="activeFilter === 'unread' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-surface-600 hover:bg-surface-50'"
            (click)="setFilter('unread')">Unread ({{ unreadCount() }})</button>
        </div>
      </div>

      @if (isLoading()) {
        <div class="divide-y divide-surface-100">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="p-4 flex items-start gap-3">
              <p-skeleton shape="circle" size="2.5rem" />
              <div class="flex-1 space-y-2">
                <p-skeleton width="60%" height="1rem" />
                <p-skeleton width="90%" height="0.875rem" />
                <p-skeleton width="30%" height="0.75rem" />
              </div>
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-bell" title="No notifications"
          [description]="activeFilter === 'unread' ? 'All caught up! No unread notifications.' : 'You have no notifications yet.'" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <div class="divide-y divide-surface-100">
          @for (notif of filteredItems(); track notif.id) {
            <div class="p-4 flex items-start gap-3 transition-colors cursor-pointer"
              [class]="notif.is_read ? 'bg-white hover:bg-surface-50' : 'bg-blue-50/40 hover:bg-blue-50/60'"
              (click)="handleClick(notif)">
              <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                [class]="getTypeIconBg(notif.type)">
                <i class="text-sm" [class]="getTypeIcon(notif.type)"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium text-surface-900 text-sm" [class]="notif.is_read ? '' : 'font-semibold'">
                    {{ notif.title }}
                  </p>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    @if (!notif.is_read) {
                      <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                    }
                    <span class="text-xs text-surface-400">{{ formatTime(notif.created_at) }}</span>
                  </div>
                </div>
                <p class="text-sm text-surface-500 mt-0.5 line-clamp-2">{{ notif.body }}</p>
                <div class="flex items-center gap-2 mt-1">
                  <span class="px-1.5 py-0.5 rounded text-xs bg-surface-100 text-surface-500 capitalize">
                    {{ formatType(notif.type) }}
                  </span>
                  @if (!notif.is_read) {
                    <button class="text-xs text-blue-600 hover:text-blue-800"
                      (click)="markRead(notif, $event)">Mark read</button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class NotificationListComponent implements OnInit, OnDestroy {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly isLoading = signal(false);
  readonly items = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.items().filter(n => !n.is_read).length);
  readonly filteredItems = computed(() =>
    this.activeFilter === 'unread' ? this.items().filter(n => !n.is_read) : this.items()
  );

  protected activeFilter: 'all' | 'unread' = 'all';
  private realtimeSub: ReturnType<typeof this.supabase.channel> | null = null;

  ngOnInit(): void {
    this.load();
    this.subscribeRealtime();
  }

  ngOnDestroy(): void {
    if (this.realtimeSub) this.supabase.removeChannel(this.realtimeSub);
  }

  private subscribeRealtime(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;
    this.realtimeSub = this.supabase
      .channel('notifications-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => this.load())
      .subscribe();
  }

  protected setFilter(f: 'all' | 'unread'): void { this.activeFilter = f; }

  protected getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      ticket_created: 'pi pi-ticket text-blue-600',
      ticket_updated: 'pi pi-refresh text-orange-600',
      sla_breach: 'pi pi-exclamation-triangle text-red-600',
      mention: 'pi pi-at text-purple-600',
      assignment: 'pi pi-user text-green-600',
      escalation: 'pi pi-sort-amount-up text-red-600',
      approval: 'pi pi-check-circle text-emerald-600',
    };
    return map[type] ?? 'pi pi-bell text-surface-500';
  }

  protected getTypeIconBg(type: string): string {
    const map: Record<string, string> = {
      ticket_created: 'bg-blue-100',
      ticket_updated: 'bg-orange-100',
      sla_breach: 'bg-red-100',
      mention: 'bg-purple-100',
      assignment: 'bg-green-100',
      escalation: 'bg-red-100',
      approval: 'bg-emerald-100',
    };
    return map[type] ?? 'bg-surface-100';
  }

  protected formatType(type: string): string { return type.split('_').join(' '); }

  protected formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  async load(): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) { this.isLoading.set(false); return; }
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      this.items.set((data ?? []) as AppNotification[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load notifications');
    } finally {
      this.isLoading.set(false);
    }
  }

  async markRead(notif: AppNotification, event: Event): Promise<void> {
    event.stopPropagation();
    const { error } = await this.supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() }).eq('id', notif.id);
    if (!error) {
      this.items.update(items => items.map(n => n.id === notif.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    }
  }

  async markAllRead(): Promise<void> {
    const { error } = await this.supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() }).eq('is_read', false);
    if (!error) {
      this.items.update(items => items.map(n => ({ ...n, is_read: true })));
      this.toastService.success('All notifications marked as read.');
    }
  }

  handleClick(notif: AppNotification): void {
    if (!notif.is_read) this.markRead(notif, new Event('click'));
    if (notif.ticket_id) this.router.navigate(['/tickets', notif.ticket_id]);
  }
}
