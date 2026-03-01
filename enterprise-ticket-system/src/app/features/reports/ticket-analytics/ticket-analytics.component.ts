import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface TicketStat {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  bgClass: string;
}

interface CategoryBreakdown {
  name: string;
  count: number;
  percentage: number;
}

interface PriorityBreakdown {
  name: string;
  color: string;
  count: number;
  percentage: number;
}

@Component({
  selector: 'app-ticket-analytics',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, DropdownModule, SkeletonModule,
    TableModule, TagModule, PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="Ticket Analytics"
      subtitle="Overview of ticket volume, distribution, and trends"
      [breadcrumbs]="['Home', 'Reports', 'Ticket Analytics']"
    >
      <p-dropdown [(ngModel)]="selectedPeriod" [options]="periodOptions" optionLabel="label"
        optionValue="value" (onChange)="load()" class="w-40" />
      <p-button label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true"
        size="small" (onClick)="exportCsv()" />
    </app-page-header>

    <!-- Stats Cards -->
    @if (isLoading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        @for (i of [1,2,3,4]; track i) {
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <p-skeleton width="60%" height="0.75rem" class="mb-3" />
            <p-skeleton width="40%" height="1.75rem" />
          </div>
        }
      </div>
    }

    @if (!isLoading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        @for (stat of stats(); track stat.label) {
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-medium text-surface-500">{{ stat.label }}</p>
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" [class]="stat.bgClass">
                <i [class]="stat.icon + ' text-sm ' + stat.colorClass"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-surface-900">{{ stat.value }}</p>
          </div>
        }
      </div>
    }

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- By Category -->
      <div class="bg-white rounded-xl border border-surface-200 p-5">
        <h3 class="font-semibold text-surface-900 mb-4">By Category</h3>
        @if (isLoading()) {
          <div class="space-y-2">
            @for (i of [1,2,3,4]; track i) {
              <div class="flex items-center gap-3">
                <p-skeleton width="120px" height="0.875rem" />
                <p-skeleton width="100%" height="0.5rem" />
                <p-skeleton width="40px" height="0.875rem" />
              </div>
            }
          </div>
        }
        @if (!isLoading() && categoryBreakdown().length === 0) {
          <p class="text-surface-400 text-sm italic">No data available.</p>
        }
        @if (!isLoading() && categoryBreakdown().length > 0) {
          <div class="space-y-3">
            @for (item of categoryBreakdown(); track item.name) {
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-surface-700">{{ item.name }}</span>
                  <span class="text-sm font-semibold text-surface-900">{{ item.count }}</span>
                </div>
                <div class="w-full bg-surface-100 rounded-full h-1.5">
                  <div class="h-1.5 rounded-full bg-primary-500" [style.width.%]="item.percentage"></div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- By Priority -->
      <div class="bg-white rounded-xl border border-surface-200 p-5">
        <h3 class="font-semibold text-surface-900 mb-4">By Priority</h3>
        @if (isLoading()) {
          <div class="space-y-2">
            @for (i of [1,2,3,4]; track i) {
              <div class="flex items-center gap-3">
                <p-skeleton width="100px" height="0.875rem" />
                <p-skeleton width="100%" height="0.5rem" />
                <p-skeleton width="40px" height="0.875rem" />
              </div>
            }
          </div>
        }
        @if (!isLoading() && priorityBreakdown().length === 0) {
          <p class="text-surface-400 text-sm italic">No data available.</p>
        }
        @if (!isLoading() && priorityBreakdown().length > 0) {
          <div class="space-y-3">
            @for (item of priorityBreakdown(); track item.name) {
              <div>
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" [style.background-color]="item.color"></span>
                    <span class="text-sm text-surface-700">{{ item.name }}</span>
                  </div>
                  <span class="text-sm font-semibold text-surface-900">{{ item.count }}</span>
                </div>
                <div class="w-full bg-surface-100 rounded-full h-1.5">
                  <div class="h-1.5 rounded-full" [style.background-color]="item.color" [style.width.%]="item.percentage"></div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Recent Tickets Table -->
      <div class="bg-white rounded-xl border border-surface-200 overflow-hidden lg:col-span-2">
        <div class="p-4 border-b border-surface-100">
          <h3 class="font-semibold text-surface-900">Recent Tickets</h3>
        </div>
        @if (!isLoading() && recentTickets().length > 0) {
          <p-table [value]="recentTickets()" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Ticket #</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-ticket>
              <tr>
                <td class="font-mono text-xs text-primary-700">{{ ticket.ticket_number }}</td>
                <td class="text-surface-900 text-sm max-w-xs truncate">{{ ticket.title }}</td>
                <td>
                  @if (ticket.priority) {
                    <span class="px-2 py-0.5 rounded text-xs font-semibold text-white"
                      [style.background-color]="ticket.priority.color">{{ ticket.priority.name }}</span>
                  }
                </td>
                <td>
                  @if (ticket.status) {
                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                      [style.background-color]="ticket.status.color">{{ ticket.status.name }}</span>
                  }
                </td>
                <td class="text-surface-500 text-sm">{{ ticket.created_at | date:'mediumDate' }}</td>
              </tr>
            </ng-template>
          </p-table>
        }
        @if (!isLoading() && recentTickets().length === 0) {
          <div class="p-8 text-center text-surface-400 text-sm italic">No tickets in selected period.</div>
        }
      </div>
    </div>
  `,
})
export class TicketAnalyticsComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly stats = signal<TicketStat[]>([]);
  readonly categoryBreakdown = signal<CategoryBreakdown[]>([]);
  readonly priorityBreakdown = signal<PriorityBreakdown[]>([]);
  readonly recentTickets = signal<unknown[]>([]);

  protected selectedPeriod = '30';
  protected periodOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 90 days', value: '90' },
    { label: 'All time', value: '0' },
  ];

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const since = this.selectedPeriod !== '0'
        ? new Date(Date.now() - parseInt(this.selectedPeriod) * 86400000).toISOString()
        : null;

      let query = this.supabase.from('tickets').select(
        'id, ticket_number, title, created_at, status:statuses!status_id(name, color), priority:priorities!priority_id(name, color), category:categories!category_id(name)'
      ).order('created_at', { ascending: false });
      if (since) query = query.gte('created_at', since);

      const { data, error } = await query;
      if (error) throw error;

      const tickets = (data ?? []) as Array<{
        id: string; ticket_number: string; title: string; created_at: string;
        status: unknown; priority: unknown; category: unknown;
      }>;

      const normalize = (x: unknown): unknown => Array.isArray(x) ? x[0] : x;
      const normalized = tickets.map(t => ({
        ...t,
        status: normalize(t.status),
        priority: normalize(t.priority),
        category: normalize(t.category),
      }));

      // Stats
      const openStatuses = ['open', 'in_progress', 'pending'];
      const total = normalized.length;
      const open = normalized.filter(t => {
        const s = t.status as { slug?: string } | null;
        return s && openStatuses.some(slug => s.slug === slug);
      }).length;
      const resolved = normalized.filter(t => {
        const s = t.status as { slug?: string } | null;
        return s && (s.slug === 'resolved' || s.slug === 'closed');
      }).length;
      const escalated = 0; // Would need is_escalated field

      this.stats.set([
        { label: 'Total Tickets', value: total, icon: 'pi pi-ticket', colorClass: 'text-blue-600', bgClass: 'bg-blue-50' },
        { label: 'Open', value: open, icon: 'pi pi-inbox', colorClass: 'text-orange-600', bgClass: 'bg-orange-50' },
        { label: 'Resolved', value: resolved, icon: 'pi pi-check-circle', colorClass: 'text-green-600', bgClass: 'bg-green-50' },
        { label: 'Escalated', value: escalated, icon: 'pi pi-exclamation-triangle', colorClass: 'text-red-600', bgClass: 'bg-red-50' },
      ]);

      // Category breakdown
      const catMap: Record<string, number> = {};
      normalized.forEach(t => {
        const cat = t.category as { name?: string } | null;
        const name = cat?.name ?? 'Uncategorized';
        catMap[name] = (catMap[name] ?? 0) + 1;
      });
      const catBreakdown: CategoryBreakdown[] = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([name, count]) => ({ name, count, percentage: total > 0 ? Math.round(count / total * 100) : 0 }));
      this.categoryBreakdown.set(catBreakdown);

      // Priority breakdown
      const priMap: Record<string, { count: number; color: string }> = {};
      normalized.forEach(t => {
        const pri = t.priority as { name?: string; color?: string } | null;
        if (!pri?.name) return;
        if (!priMap[pri.name]) priMap[pri.name] = { count: 0, color: pri.color ?? '#94a3b8' };
        priMap[pri.name].count++;
      });
      const priBreakdown: PriorityBreakdown[] = Object.entries(priMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, v]) => ({ name, color: v.color, count: v.count, percentage: total > 0 ? Math.round(v.count / total * 100) : 0 }));
      this.priorityBreakdown.set(priBreakdown);

      this.recentTickets.set(normalized.slice(0, 20));
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load analytics');
    } finally {
      this.isLoading.set(false);
    }
  }

  exportCsv(): void {
    const tickets = this.recentTickets() as Array<Record<string, unknown>>;
    if (!tickets.length) { this.toastService.error('No data to export.'); return; }
    const headers = ['ticket_number', 'title', 'status', 'priority', 'created_at'];
    const rows = tickets.map(t => [
      t['ticket_number'], t['title'],
      (t['status'] as { name?: string } | null)?.name ?? '',
      (t['priority'] as { name?: string } | null)?.name ?? '',
      t['created_at'],
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ticket-analytics.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}
