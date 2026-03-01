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

interface SlaMetric {
  label: string;
  value: string;
  subtext: string;
  icon: string;
  colorClass: string;
  bgClass: string;
}

interface SlaTicketRow {
  ticket_number: string;
  title: string;
  priority: string;
  priority_color: string;
  sla_response_due: string | null;
  sla_resolve_due: string | null;
  sla_response_met: boolean | null;
  sla_resolve_met: boolean | null;
  created_at: string;
}

@Component({
  selector: 'app-sla-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, DropdownModule, SkeletonModule,
    TableModule, TagModule, PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="SLA Performance"
      subtitle="Monitor response and resolution SLA compliance"
      [breadcrumbs]="['Home', 'Reports', 'SLA Performance']"
    >
      <p-dropdown [(ngModel)]="selectedPeriod" [options]="periodOptions" optionLabel="label"
        optionValue="value" (onChange)="load()" class="w-40" />
      <p-button label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true"
        size="small" (onClick)="exportCsv()" />
    </app-page-header>

    <!-- Metric Cards -->
    @if (isLoading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        @for (i of [1,2,3,4]; track i) {
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <p-skeleton width="60%" height="0.75rem" class="mb-3" />
            <p-skeleton width="50%" height="1.75rem" />
            <p-skeleton width="80%" height="0.75rem" class="mt-2" />
          </div>
        }
      </div>
    }

    @if (!isLoading()) {
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        @for (m of metrics(); track m.label) {
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-surface-500">{{ m.label }}</p>
              <div class="w-9 h-9 rounded-lg flex items-center justify-center" [class]="m.bgClass">
                <i [class]="m.icon + ' text-sm ' + m.colorClass"></i>
              </div>
            </div>
            <p class="text-2xl font-bold text-surface-900">{{ m.value }}</p>
            <p class="text-xs text-surface-400 mt-1">{{ m.subtext }}</p>
          </div>
        }
      </div>
    }

    <!-- SLA Tickets Table -->
    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100">
        <h3 class="font-semibold text-surface-900">SLA Status by Ticket</h3>
      </div>
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="100px" height="1rem" />
              <p-skeleton width="200px" height="1rem" />
              <p-skeleton width="80px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="80px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }
      @if (!isLoading() && slaTickets().length === 0) {
        <div class="p-8 text-center text-surface-400 text-sm italic">No tickets with SLA policies in selected period.</div>
      }
      @if (!isLoading() && slaTickets().length > 0) {
        <p-table [value]="slaTickets()" [paginator]="slaTickets().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Ticket #</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Response SLA</th>
              <th>Resolution SLA</th>
              <th>Response Due</th>
              <th>Resolve Due</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td class="font-mono text-xs text-primary-700">{{ row.ticket_number }}</td>
              <td class="text-surface-900 text-sm max-w-xs truncate">{{ row.title }}</td>
              <td>
                <span class="px-2 py-0.5 rounded text-xs font-semibold text-white"
                  [style.background-color]="row.priority_color">{{ row.priority }}</span>
              </td>
              <td>
                @if (row.sla_response_met === true) {
                  <p-tag value="Met" severity="success" />
                } @else if (row.sla_response_met === false) {
                  <p-tag value="Breached" severity="danger" />
                } @else {
                  <p-tag value="Pending" severity="secondary" />
                }
              </td>
              <td>
                @if (row.sla_resolve_met === true) {
                  <p-tag value="Met" severity="success" />
                } @else if (row.sla_resolve_met === false) {
                  <p-tag value="Breached" severity="danger" />
                } @else {
                  <p-tag value="Pending" severity="secondary" />
                }
              </td>
              <td class="text-surface-500 text-sm">
                {{ row.sla_response_due ? (row.sla_response_due | date:'medium') : '—' }}
              </td>
              <td class="text-surface-500 text-sm">
                {{ row.sla_resolve_due ? (row.sla_resolve_due | date:'medium') : '—' }}
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class SlaReportComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly metrics = signal<SlaMetric[]>([]);
  readonly slaTickets = signal<SlaTicketRow[]>([]);

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

      let query = this.supabase.from('tickets')
        .select('ticket_number, title, sla_response_due, sla_resolve_due, sla_response_met, sla_resolve_met, priority:priorities!priority_id(name, color)')
        .not('sla_policy_id', 'is', null)
        .order('created_at', { ascending: false });
      if (since) query = query.gte('created_at', since);

      const { data, error } = await query;
      if (error) throw error;

      const rows: SlaTicketRow[] = ((data ?? []) as unknown[]).map((d: unknown) => {
        const t = d as Record<string, unknown>;
        const pri = Array.isArray(t['priority']) ? t['priority'][0] : t['priority'];
        const p = pri as { name?: string; color?: string } | null;
        return {
          ticket_number: t['ticket_number'] as string,
          title: t['title'] as string,
          priority: p?.name ?? 'Unknown',
          priority_color: p?.color ?? '#94a3b8',
          sla_response_due: t['sla_response_due'] as string | null,
          sla_resolve_due: t['sla_resolve_due'] as string | null,
          sla_response_met: t['sla_response_met'] as boolean | null,
          sla_resolve_met: t['sla_resolve_met'] as boolean | null,
          created_at: t['created_at'] as string,
        };
      });

      const total = rows.length;
      const responseMet = rows.filter(r => r.sla_response_met === true).length;
      const responseBreached = rows.filter(r => r.sla_response_met === false).length;
      const resolveMet = rows.filter(r => r.sla_resolve_met === true).length;
      const resolveBreached = rows.filter(r => r.sla_resolve_met === false).length;

      const responseRate = total > 0 ? Math.round(responseMet / (responseMet + responseBreached || 1) * 100) : 0;
      const resolveRate = total > 0 ? Math.round(resolveMet / (resolveMet + resolveBreached || 1) * 100) : 0;

      this.metrics.set([
        { label: 'Total w/ SLA', value: String(total), subtext: 'tickets with SLA policy', icon: 'pi pi-clock', colorClass: 'text-blue-600', bgClass: 'bg-blue-50' },
        { label: 'Response SLA', value: `${responseRate}%`, subtext: `${responseMet} met, ${responseBreached} breached`, icon: 'pi pi-reply', colorClass: responseRate >= 90 ? 'text-green-600' : 'text-red-600', bgClass: responseRate >= 90 ? 'bg-green-50' : 'bg-red-50' },
        { label: 'Resolution SLA', value: `${resolveRate}%`, subtext: `${resolveMet} met, ${resolveBreached} breached`, icon: 'pi pi-check-circle', colorClass: resolveRate >= 90 ? 'text-green-600' : 'text-red-600', bgClass: resolveRate >= 90 ? 'bg-green-50' : 'bg-red-50' },
        { label: 'Breaches', value: String(responseBreached + resolveBreached), subtext: 'total SLA breaches', icon: 'pi pi-exclamation-triangle', colorClass: 'text-red-600', bgClass: 'bg-red-50' },
      ]);

      this.slaTickets.set(rows);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load SLA report');
    } finally {
      this.isLoading.set(false);
    }
  }

  exportCsv(): void {
    const rows = this.slaTickets();
    if (!rows.length) { this.toastService.error('No data to export.'); return; }
    const headers = ['ticket_number', 'title', 'priority', 'sla_response_met', 'sla_resolve_met', 'response_due', 'resolve_due'];
    const csvRows = rows.map(r => [
      r.ticket_number, r.title, r.priority,
      r.sla_response_met === true ? 'Met' : r.sla_response_met === false ? 'Breached' : 'Pending',
      r.sla_resolve_met === true ? 'Met' : r.sla_resolve_met === false ? 'Breached' : 'Pending',
      r.sla_response_due ?? '', r.sla_resolve_due ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sla-report.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}
