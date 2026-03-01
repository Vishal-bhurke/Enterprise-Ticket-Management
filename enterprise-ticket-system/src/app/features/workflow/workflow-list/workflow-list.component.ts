import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
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

interface WorkflowItem {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  transition_count?: number;
}

interface WorkflowForm {
  name: string;
  is_default: boolean;
}

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
    TableModule, TagModule, TooltipModule, SkeletonModule, ToggleSwitchModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Workflow Definitions"
      subtitle="Define ticket lifecycle workflows and status transitions"
      [breadcrumbs]="['Home', 'Workflow Builder']"
    >
      @if (isSuperAdmin()) {
        <p-button label="Add Workflow" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search workflows..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} workflows</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="200px" height="1rem" />
              <p-skeleton width="80px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="120px" height="1rem" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-sitemap" title="No workflows defined"
          [description]="searchQuery ? 'No workflows match your search.' : 'Add your first workflow definition.'"
          [actionLabel]="!searchQuery && isSuperAdmin() ? 'Add Workflow' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Transitions</th>
              <th>Default</th>
              <th pSortableColumn="created_at">Created <p-sortIcon field="created_at" /></th>
              <th class="w-32 text-center">Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr class="cursor-pointer hover:bg-surface-50" (click)="goToDetail(item)">
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td>
                <span class="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-semibold">
                  {{ item.transition_count ?? 0 }} transitions
                </span>
              </td>
              <td>
                @if (item.is_default) {
                  <p-tag value="Default" severity="success" />
                } @else {
                  <p-tag value="Custom" severity="secondary" />
                }
              </td>
              <td class="text-surface-500 text-sm">{{ item.created_at | date:'mediumDate' }}</td>
              <td class="text-center" (click)="$event.stopPropagation()">
                <div class="flex items-center justify-center gap-1">
                  <p-button icon="pi pi-arrow-right" [rounded]="true" [text]="true" severity="secondary"
                    size="small" pTooltip="View Transitions" (onClick)="goToDetail(item)" />
                  @if (isSuperAdmin()) {
                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary"
                      size="small" pTooltip="Edit" (onClick)="openEdit(item)" />
                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                      size="small" pTooltip="Delete" (onClick)="confirmDelete(item)" />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Workflow' : 'Add Workflow'"
      [modal]="true" [style]="{ width: '420px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Workflow Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Standard IT Workflow" class="w-full" />
        </div>
        <div class="flex items-center gap-3">
          <p-toggleswitch [(ngModel)]="form.is_default" />
          <label class="text-sm font-medium text-surface-700">Set as Default Workflow</label>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button [label]="editingItem ? 'Update' : 'Create'" [loading]="isSaving()"
            [disabled]="!form.name" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class WorkflowListComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  protected isSuperAdmin = inject(AuthService).isSuperAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<WorkflowItem[]>([]);
  readonly filteredItems = signal<WorkflowItem[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: WorkflowItem | null = null;
  protected form: WorkflowForm = this.defaultForm();

  ngOnInit(): void { this.load(); }

  private defaultForm(): WorkflowForm { return { name: '', is_default: false }; }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i => i.name.toLowerCase().includes(q)) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data: workflows, error } = await this.supabase
        .from('workflow_definitions').select('id, name, is_default, created_at').order('name');
      if (error) throw error;

      const { data: transCounts } = await this.supabase
        .from('workflow_transitions').select('workflow_id');

      const countMap: Record<string, number> = {};
      ((transCounts ?? []) as Array<{ workflow_id: string }>).forEach(t => {
        countMap[t.workflow_id] = (countMap[t.workflow_id] ?? 0) + 1;
      });

      const items = ((workflows ?? []) as WorkflowItem[]).map(w => ({
        ...w,
        transition_count: countMap[w.id] ?? 0,
      }));

      this.items.set(items);
      this.filteredItems.set(items);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  goToDetail(item: WorkflowItem): void {
    this.router.navigate(['/workflow', item.id]);
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: WorkflowItem): void {
    this.editingItem = item;
    this.form = { name: item.name, is_default: item.is_default };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim()) { this.toastService.error('Name is required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = { name: this.form.name.trim(), is_default: this.form.is_default };
      const { error } = this.editingItem
        ? await this.supabase.from('workflow_definitions').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('workflow_definitions').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Workflow updated.' : 'Workflow created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: WorkflowItem): void {
    this.confirmationService.confirm({
      message: `Delete workflow <strong>${item.name}</strong> and all its transitions?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('workflow_definitions').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Workflow deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
