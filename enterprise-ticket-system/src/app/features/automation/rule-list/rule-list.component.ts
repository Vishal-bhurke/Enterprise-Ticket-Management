import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface AutomationRule {
  id: string;
  name: string;
  trigger_event: string;
  conditions: unknown;
  actions: unknown;
  run_order: number;
  stop_on_match: boolean;
  is_active: boolean;
  created_at: string;
}

@Component({
  selector: 'app-rule-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, InputTextModule,
    TagModule, TooltipModule, SkeletonModule, ToggleSwitchModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Automation Rules"
      subtitle="Automate ticket assignment, status changes, and notifications"
      [breadcrumbs]="['Home', 'Automation Rules']"
    >
      @if (isSuperAdmin()) {
        <p-button label="Create Rule" icon="pi pi-plus" size="small" (onClick)="createNew()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search rules..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} rules</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="200px" height="1rem" />
              <p-skeleton width="120px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="80px" height="1rem" />
              <p-skeleton width="60px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-bolt" title="No automation rules"
          [description]="searchQuery ? 'No rules match your search.' : 'Create your first automation rule.'"
          [actionLabel]="!searchQuery && isSuperAdmin() ? 'Create Rule' : undefined"
          (action)="createNew()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th class="w-12">Order</th>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Trigger</th>
              <th>Conditions</th>
              <th>Actions</th>
              <th>Stop on Match</th>
              <th>Status</th>
              @if (isSuperAdmin()) { <th class="w-32 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-rule>
            <tr class="cursor-pointer hover:bg-surface-50" (click)="editRule(rule)">
              <td class="text-surface-400 text-sm font-mono">{{ rule.run_order }}</td>
              <td class="font-medium text-surface-900">{{ rule.name }}</td>
              <td>
                <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold capitalize">
                  {{ formatEvent(rule.trigger_event) }}
                </span>
              </td>
              <td class="text-surface-500 text-sm">
                {{ getConditionsCount(rule.conditions) }} condition(s)
              </td>
              <td class="text-surface-500 text-sm">
                {{ getActionsCount(rule.actions) }} action(s)
              </td>
              <td>
                @if (rule.stop_on_match) {
                  <p-tag value="Yes" severity="warn" />
                } @else {
                  <p-tag value="No" severity="secondary" />
                }
              </td>
              <td>
                <p-tag [value]="rule.is_active ? 'Active' : 'Inactive'"
                  [severity]="rule.is_active ? 'success' : 'danger'" />
              </td>
              @if (isSuperAdmin()) {
                <td class="text-center" (click)="$event.stopPropagation()">
                  <div class="flex items-center justify-center gap-1">
                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary"
                      size="small" pTooltip="Edit" (onClick)="editRule(rule)" />
                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                      size="small" pTooltip="Delete" (onClick)="confirmDelete(rule)" />
                  </div>
                </td>
              }
            </tr>
          </ng-template>
        </p-table>
      }
    </div>
  `,
})
export class RuleListComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  protected isSuperAdmin = inject(AuthService).isSuperAdmin;

  readonly isLoading = signal(false);
  readonly items = signal<AutomationRule[]>([]);
  readonly filteredItems = signal<AutomationRule[]>([]);

  protected searchQuery = '';

  ngOnInit(): void { this.load(); }

  protected formatEvent(event: string): string {
    return event.split('_').join(' ');
  }

  protected getConditionsCount(conditions: unknown): number {
    if (!conditions) return 0;
    const cond = conditions as { rules?: unknown[] };
    return Array.isArray(cond?.rules) ? cond.rules.length : 0;
  }

  protected getActionsCount(actions: unknown): number {
    return Array.isArray(actions) ? (actions as unknown[]).length : 0;
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q
      ? this.items().filter(i => i.name.toLowerCase().includes(q) || i.trigger_event.includes(q))
      : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('automation_rules')
        .select('*').order('run_order');
      if (error) throw error;
      this.items.set((data ?? []) as AutomationRule[]);
      this.filteredItems.set((data ?? []) as AutomationRule[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  createNew(): void { this.router.navigate(['/automation', 'new']); }
  editRule(rule: AutomationRule): void { this.router.navigate(['/automation', rule.id]); }

  confirmDelete(rule: AutomationRule): void {
    this.confirmationService.confirm({
      message: `Delete rule <strong>${rule.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('automation_rules').delete().eq('id', rule.id);
        if (!error) { this.toastService.success('Rule deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
