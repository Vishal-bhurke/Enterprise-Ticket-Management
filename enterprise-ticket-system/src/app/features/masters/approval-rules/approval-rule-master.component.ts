import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface ApprovalRuleItem {
  id: string;
  name: string;
  approval_type: string;
  approver_roles: string[] | null;
  created_at: string;
}

interface ApprovalRuleForm {
  name: string;
  approval_type: string;
  approver_roles: string[];
}

@Component({
  selector: 'app-approval-rule-master',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Approval Rules"
      subtitle="Define approval workflows for ticket transitions"
      [breadcrumbs]="['Home', 'Masters', 'Approval Rules']"
    >
      @if (isAdmin()) {
        <p-button label="Add Rule" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search approval rules..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} rules</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="180px" height="1rem" />
              <p-skeleton width="120px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="200px" height="1rem" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-check-circle" title="No approval rules"
          [description]="searchQuery ? 'No rules match your search.' : 'Add your first approval rule.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Rule' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Approval Type</th>
              <th>Approver Roles</th>
              <th pSortableColumn="created_at">Created <p-sortIcon field="created_at" /></th>
              @if (isAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td>
                <span class="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                  [class]="getTypeClass(item.approval_type)">{{ formatSlug(item.approval_type) }}</span>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @for (role of (item.approver_roles || []); track role) {
                    <span class="px-2 py-0.5 bg-surface-100 text-surface-600 rounded text-xs capitalize">
                      {{ formatSlug(role) }}
                    </span>
                  }
                  @if (!item.approver_roles?.length) {
                    <span class="text-surface-400 text-sm">—</span>
                  }
                </div>
              </td>
              <td class="text-surface-500 text-sm">{{ item.created_at | date:'mediumDate' }}</td>
              @if (isAdmin()) {
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary"
                      size="small" pTooltip="Edit" (onClick)="openEdit(item)" />
                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                      size="small" pTooltip="Delete" (onClick)="confirmDelete(item)" />
                  </div>
                </td>
              }
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Approval Rule' : 'Add Approval Rule'"
      [modal]="true" [style]="{ width: '480px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Rule Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Manager Approval" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Approval Type <span class="text-red-500">*</span></label>
          <p-dropdown [(ngModel)]="form.approval_type" [options]="approvalTypeOptions" optionLabel="label"
            optionValue="value" placeholder="Select type" class="w-full" />
          @if (form.approval_type) {
            <span class="text-xs text-surface-400">{{ getTypeDescription(form.approval_type) }}</span>
          }
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Approver Roles</label>
          <div class="space-y-2">
            @for (role of availableRoles; track role.value) {
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [checked]="form.approver_roles.includes(role.value)"
                  (change)="toggleRole(role.value)" class="rounded" />
                <span class="text-sm text-surface-700">{{ role.label }}</span>
              </label>
            }
          </div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button [label]="editingItem ? 'Update' : 'Create'" [loading]="isSaving()"
            [disabled]="!form.name || !form.approval_type" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ApprovalRuleMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<ApprovalRuleItem[]>([]);
  readonly filteredItems = signal<ApprovalRuleItem[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: ApprovalRuleItem | null = null;
  protected form: ApprovalRuleForm = this.defaultForm();

  readonly approvalTypeOptions = [
    { label: 'Sequential (all must approve in order)', value: 'sequential' },
    { label: 'Parallel (all must approve)', value: 'parallel' },
    { label: 'Any One (first approval wins)', value: 'any_one' },
  ];

  readonly availableRoles = [
    { label: 'Admin', value: 'admin' },
    { label: 'Super Admin', value: 'super_admin' },
    { label: 'Agent', value: 'agent' },
  ];

  ngOnInit(): void { this.load(); }

  private defaultForm(): ApprovalRuleForm { return { name: '', approval_type: '', approver_roles: [] }; }

  protected getTypeClass(type: string): string {
    const map: Record<string, string> = {
      sequential: 'bg-blue-100 text-blue-700',
      parallel: 'bg-purple-100 text-purple-700',
      any_one: 'bg-emerald-100 text-emerald-700',
    };
    return map[type] ?? 'bg-surface-100 text-surface-600';
  }

  protected getTypeDescription(type: string): string {
    const map: Record<string, string> = {
      sequential: 'All approvers must approve one by one in order.',
      parallel: 'All approvers must approve simultaneously.',
      any_one: 'Approval completes when any one approver approves.',
    };
    return map[type] ?? '';
  }

  protected formatSlug(slug: string): string {
    return slug.split('_').join(' ');
  }

  protected toggleRole(role: string): void {
    const current = this.form.approver_roles;
    if (current.includes(role)) {
      this.form.approver_roles = current.filter(r => r !== role);
    } else {
      this.form.approver_roles = [...current, role];
    }
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i =>
      i.name.toLowerCase().includes(q) || i.approval_type.includes(q)
    ) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('approval_rules').select('*').order('name');
      if (error) throw error;
      this.items.set((data ?? []) as ApprovalRuleItem[]);
      this.filteredItems.set((data ?? []) as ApprovalRuleItem[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: ApprovalRuleItem): void {
    this.editingItem = item;
    this.form = { name: item.name, approval_type: item.approval_type, approver_roles: [...(item.approver_roles ?? [])] };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim() || !this.form.approval_type) { this.toastService.error('Name and type are required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = { name: this.form.name.trim(), approval_type: this.form.approval_type,
        approver_roles: this.form.approver_roles.length ? this.form.approver_roles : null };
      const { error } = this.editingItem
        ? await this.supabase.from('approval_rules').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('approval_rules').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Rule updated.' : 'Rule created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: ApprovalRuleItem): void {
    this.confirmationService.confirm({
      message: `Delete approval rule <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('approval_rules').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Rule deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
