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

interface AgentStat {
  agent_id: string;
  full_name: string;
  email: string;
  assigned: number;
  resolved: number;
  open: number;
  avg_resolution_hours: number;
  sla_met: number;
  sla_breached: number;
}

@Component({
  selector: 'app-agent-productivity',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, DropdownModule, SkeletonModule,
    TableModule, TagModule, PageHeaderComponent,
  ],
  template: `
    <app-page-header
      title="Agent Productivity"
      subtitle="Track ticket handling performance across agents"
      [breadcrumbs]="['Home', 'Reports', 'Agent Productivity']"
    >
      <p-dropdown [(ngModel)]="selectedPeriod" [options]="periodOptions" optionLabel="label"
        optionValue="value" (onChange)="load()" class="w-40" />
      <p-button label="Export CSV" icon="pi pi-download" severity="secondary" [outlined]="true"
        size="small" (onClick)="exportCsv()" />
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton shape="circle" width="2.5rem" height="2.5rem" />
              <p-skeleton width="180px" height="1rem" />
              <p-skeleton width="60px" height="1rem" />
              <p-skeleton width="60px" height="1rem" />
              <p-skeleton width="60px" height="1rem" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && agentStats().length === 0) {
        <div class="p-8 text-center text-surface-400 text-sm italic">
          No agent assignment data available for the selected period.
        </div>
      }

      @if (!isLoading() && agentStats().length > 0) {
        <p-table [value]="agentStats()" [paginator]="agentStats().length > 20" [rows]="20"
          sortField="assigned" [sortOrder]="-1" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Agent</th>
              <th pSortableColumn="assigned" class="text-center">Assigned <p-sortIcon field="assigned" /></th>
              <th pSortableColumn="resolved" class="text-center">Resolved <p-sortIcon field="resolved" /></th>
              <th pSortableColumn="open" class="text-center">Open <p-sortIcon field="open" /></th>
              <th pSortableColumn="avg_resolution_hours" class="text-center">Avg Resolution <p-sortIcon field="avg_resolution_hours" /></th>
              <th class="text-center">SLA Met</th>
              <th class="text-center">SLA Breached</th>
              <th class="text-center">Resolution Rate</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-agent>
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-bold text-primary-700">{{ getInitials(agent.full_name) }}</span>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-surface-900">{{ agent.full_name }}</p>
                    <p class="text-xs text-surface-400">{{ agent.email }}</p>
                  </div>
                </div>
              </td>
              <td class="text-center font-semibold text-surface-900">{{ agent.assigned }}</td>
              <td class="text-center">
                <span class="text-green-700 font-semibold">{{ agent.resolved }}</span>
              </td>
              <td class="text-center">
                <span class="text-orange-700 font-semibold">{{ agent.open }}</span>
              </td>
              <td class="text-center text-surface-600 text-sm">
                {{ agent.avg_resolution_hours > 0 ? (agent.avg_resolution_hours + 'h') : '—' }}
              </td>
              <td class="text-center">
                @if (agent.sla_met > 0) {
                  <span class="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-semibold">{{ agent.sla_met }}</span>
                } @else {
                  <span class="text-surface-400 text-sm">0</span>
                }
              </td>
              <td class="text-center">
                @if (agent.sla_breached > 0) {
                  <span class="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-semibold">{{ agent.sla_breached }}</span>
                } @else {
                  <span class="text-surface-400 text-sm">0</span>
                }
              </td>
              <td class="text-center">
                <div class="flex items-center justify-center gap-1">
                  <div class="w-16 bg-surface-100 rounded-full h-1.5">
                    <div class="h-1.5 rounded-full bg-green-500" [style.width.%]="getResolutionRate(agent)"></div>
                  </div>
                  <span class="text-xs text-surface-600">{{ getResolutionRate(agent) }}%</span>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class AgentProductivityComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly agentStats = signal<AgentStat[]>([]);

  protected selectedPeriod = '30';
  protected periodOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 90 days', value: '90' },
    { label: 'All time', value: '0' },
  ];

  ngOnInit(): void { this.load(); }

  protected getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  protected getResolutionRate(agent: AgentStat): number {
    if (!agent.assigned) return 0;
    return Math.round(agent.resolved / agent.assigned * 100);
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const since = this.selectedPeriod !== '0'
        ? new Date(Date.now() - parseInt(this.selectedPeriod) * 86400000).toISOString()
        : null;

      let query = this.supabase.from('tickets')
        .select('assignee_id, status:statuses!status_id(slug, is_closed), sla_resolve_met, resolved_at, created_at, assignee:profiles!assignee_id(id, full_name, email)')
        .not('assignee_id', 'is', null);
      if (since) query = query.gte('created_at', since);

      const { data, error } = await query;
      if (error) throw error;

      const agentMap: Record<string, AgentStat> = {};

      ((data ?? []) as unknown[]).forEach((d: unknown) => {
        const t = d as Record<string, unknown>;
        const assignee = Array.isArray(t['assignee']) ? t['assignee'][0] : t['assignee'];
        const a = assignee as { id?: string; full_name?: string; email?: string } | null;
        if (!a?.id) return;

        if (!agentMap[a.id]) {
          agentMap[a.id] = {
            agent_id: a.id,
            full_name: a.full_name ?? '',
            email: a.email ?? '',
            assigned: 0, resolved: 0, open: 0,
            avg_resolution_hours: 0, sla_met: 0, sla_breached: 0,
          };
        }
        const stat = agentMap[a.id];
        stat.assigned++;

        const status = Array.isArray(t['status']) ? t['status'][0] : t['status'];
        const s = status as { slug?: string; is_closed?: boolean } | null;
        if (s?.is_closed || s?.slug === 'resolved') {
          stat.resolved++;
          if (t['resolved_at'] && t['created_at']) {
            const hrs = (new Date(t['resolved_at'] as string).getTime() - new Date(t['created_at'] as string).getTime()) / 3600000;
            stat.avg_resolution_hours = stat.avg_resolution_hours === 0 ? Math.round(hrs) : Math.round((stat.avg_resolution_hours + hrs) / 2);
          }
        } else {
          stat.open++;
        }

        if (t['sla_resolve_met'] === true) stat.sla_met++;
        if (t['sla_resolve_met'] === false) stat.sla_breached++;
      });

      this.agentStats.set(Object.values(agentMap).sort((a, b) => b.assigned - a.assigned));
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load agent productivity');
    } finally {
      this.isLoading.set(false);
    }
  }

  exportCsv(): void {
    const agents = this.agentStats();
    if (!agents.length) { this.toastService.error('No data to export.'); return; }
    const headers = ['name', 'email', 'assigned', 'resolved', 'open', 'avg_resolution_hours', 'sla_met', 'sla_breached', 'resolution_rate'];
    const rows = agents.map(a => [
      a.full_name, a.email, a.assigned, a.resolved, a.open,
      a.avg_resolution_hours, a.sla_met, a.sla_breached, this.getResolutionRate(a) + '%',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agent-productivity.csv'; a.click();
    URL.revokeObjectURL(url);
  }
}
