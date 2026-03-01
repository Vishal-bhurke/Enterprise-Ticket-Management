import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { DialogModule } from 'primeng/dialog';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  actor?: { full_name: string; email: string } | null;
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule, DropdownModule,
    TableModule, TagModule, TooltipModule, SkeletonModule, DialogModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Audit Logs"
      subtitle="Complete history of system and data changes"
      [breadcrumbs]="['Home', 'Audit Logs']"
    />

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-surface-200 p-4 mb-4 flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-48 max-w-xs">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
        <input pInputText placeholder="Search entity ID or actor..." [(ngModel)]="searchQuery"
          (ngModelChange)="filterItems()" class="w-full pl-9" />
      </div>
      <p-dropdown [(ngModel)]="selectedEntityType" [options]="entityTypeOptions" optionLabel="label"
        optionValue="value" placeholder="All entities" [showClear]="true" class="w-44"
        (onChange)="filterItems()" />
      <p-dropdown [(ngModel)]="selectedAction" [options]="actionOptions" optionLabel="label"
        optionValue="value" placeholder="All actions" [showClear]="true" class="w-36"
        (onChange)="filterItems()" />
      <span class="text-sm text-surface-500 ml-auto">{{ filteredItems().length }} entries</span>
    </div>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="80px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="140px" height="1rem" />
              <p-skeleton width="100px" height="1rem" />
              <p-skeleton width="160px" height="0.875rem" />
              <p-skeleton width="100px" height="0.875rem" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-list" title="No audit logs"
          [description]="searchQuery || selectedEntityType || selectedAction ? 'No logs match your filters.' : 'Audit logs will appear here as changes are made.'" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 50" [rows]="50" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Actor</th>
              <th pSortableColumn="created_at">Timestamp <p-sortIcon field="created_at" /></th>
              <th class="w-20 text-center">Changes</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-log>
            <tr>
              <td>
                <p-tag [value]="log.action.toUpperCase()" [severity]="getActionSeverity(log.action)" />
              </td>
              <td>
                <span class="px-2 py-0.5 bg-surface-100 text-surface-600 rounded text-xs font-medium capitalize">
                  {{ formatEntity(log.entity_type) }}
                </span>
              </td>
              <td class="font-mono text-xs text-surface-500">{{ log.entity_id.slice(0, 8) }}...</td>
              <td>
                @if (log.actor) {
                  <div>
                    <p class="text-sm font-medium text-surface-900">{{ log.actor.full_name }}</p>
                    <p class="text-xs text-surface-400">{{ log.actor.email }}</p>
                  </div>
                } @else {
                  <span class="text-surface-400 text-sm">System</span>
                }
              </td>
              <td class="text-surface-500 text-sm">{{ log.created_at | date:'medium' }}</td>
              <td class="text-center">
                @if (log.old_values || log.new_values) {
                  <p-button icon="pi pi-eye" [rounded]="true" [text]="true" severity="secondary"
                    size="small" pTooltip="View changes" (onClick)="viewDiff(log)" />
                } @else {
                  <span class="text-surface-300 text-xs">—</span>
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <!-- Diff Dialog -->
    <p-dialog [(visible)]="diffDialogVisible" header="Change Details"
      [modal]="true" [style]="{ width: '680px' }" [draggable]="false" [resizable]="false">
      @if (selectedLog) {
        <div class="py-2">
          <div class="flex items-center gap-3 mb-4 pb-4 border-b border-surface-100">
            <p-tag [value]="selectedLog.action.toUpperCase()" [severity]="getActionSeverity(selectedLog.action)" />
            <span class="font-mono text-sm text-surface-600">{{ selectedLog.entity_type }} / {{ selectedLog.entity_id }}</span>
            <span class="ml-auto text-xs text-surface-400">{{ selectedLog.created_at | date:'medium' }}</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            @if (selectedLog.old_values) {
              <div>
                <h4 class="text-sm font-semibold text-surface-700 mb-2">Before</h4>
                <pre class="text-xs bg-red-50 border border-red-100 rounded p-3 overflow-auto max-h-72 text-surface-800">{{ selectedLog.old_values | json }}</pre>
              </div>
            }
            @if (selectedLog.new_values) {
              <div [class]="selectedLog.old_values ? '' : 'col-span-2'">
                <h4 class="text-sm font-semibold text-surface-700 mb-2">After</h4>
                <pre class="text-xs bg-green-50 border border-green-100 rounded p-3 overflow-auto max-h-72 text-surface-800">{{ selectedLog.new_values | json }}</pre>
              </div>
            }
          </div>
        </div>
      }
      <ng-template pTemplate="footer">
        <p-button label="Close" severity="secondary" [outlined]="true" (onClick)="diffDialogVisible = false" />
      </ng-template>
    </p-dialog>
  `,
})
export class AuditLogComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);

  readonly isLoading = signal(false);
  readonly items = signal<AuditLog[]>([]);
  readonly filteredItems = signal<AuditLog[]>([]);

  protected searchQuery = '';
  protected selectedEntityType = '';
  protected selectedAction = '';
  protected diffDialogVisible = false;
  protected selectedLog: AuditLog | null = null;

  readonly entityTypeOptions = [
    { label: 'Tickets', value: 'ticket' },
    { label: 'Comments', value: 'ticket_comment' },
    { label: 'Users', value: 'profile' },
    { label: 'Statuses', value: 'status' },
    { label: 'Priorities', value: 'priority' },
    { label: 'Workflows', value: 'workflow_definition' },
    { label: 'Automation Rules', value: 'automation_rule' },
  ];

  readonly actionOptions = [
    { label: 'INSERT', value: 'INSERT' },
    { label: 'UPDATE', value: 'UPDATE' },
    { label: 'DELETE', value: 'DELETE' },
  ];

  ngOnInit(): void { this.load(); }

  protected getActionSeverity(action: string): 'success' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'warn' | 'danger' | 'secondary'> = {
      INSERT: 'success', UPDATE: 'warn', DELETE: 'danger',
    };
    return map[action.toUpperCase()] ?? 'secondary';
  }

  protected formatEntity(type: string): string {
    return type.split('_').join(' ');
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(this.items().filter(log => {
      const matchQuery = !q || log.entity_id.toLowerCase().includes(q) ||
        (log.actor?.full_name?.toLowerCase().includes(q) ?? false) ||
        (log.actor?.email?.toLowerCase().includes(q) ?? false);
      const matchEntity = !this.selectedEntityType || log.entity_type === this.selectedEntityType;
      const matchAction = !this.selectedAction || log.action.toUpperCase() === this.selectedAction;
      return matchQuery && matchEntity && matchAction;
    }));
  }

  viewDiff(log: AuditLog): void {
    this.selectedLog = log;
    this.diffDialogVisible = true;
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('audit_logs')
        .select('id, entity_type, entity_id, action, actor_id, old_values, new_values, created_at, actor:profiles!actor_id(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;

      const logs = ((data ?? []) as unknown[]).map((d: unknown) => {
        const item = d as Record<string, unknown>;
        const actor = Array.isArray(item['actor']) ? item['actor'][0] : item['actor'];
        return { ...item, actor } as AuditLog;
      });

      this.items.set(logs);
      this.filteredItems.set(logs);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load audit logs');
    } finally {
      this.isLoading.set(false);
    }
  }
}
