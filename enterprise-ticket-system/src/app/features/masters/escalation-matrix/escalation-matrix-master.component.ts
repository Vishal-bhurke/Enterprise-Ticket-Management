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
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface EscalationRule {
  id: string;
  level: number;
  trigger_after_mins: number;
  escalate_to_role: string;
  action: string;
}

interface MatrixItem {
  id: string;
  name: string;
  created_at: string;
  rules?: EscalationRule[];
}

interface MatrixForm {
  name: string;
}

interface RuleForm {
  level: number;
  trigger_after_mins: number;
  escalate_to_role: string;
  action: string;
}

@Component({
  selector: 'app-escalation-matrix-master',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule, InputNumberModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Escalation Matrix"
      subtitle="Configure escalation rules for unresolved tickets"
      [breadcrumbs]="['Home', 'Masters', 'Escalation Matrix']"
    >
      @if (isAdmin()) {
        <p-button label="Add Matrix" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search matrices..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} matrices</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="200px" height="1rem" />
              <p-skeleton width="100px" height="1rem" />
              <p-skeleton width="80px" height="1rem" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-sort-amount-up" title="No escalation matrices"
          [description]="searchQuery ? 'No matrices match your search.' : 'Add your first escalation matrix.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Matrix' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <div class="divide-y divide-surface-100">
          @for (matrix of filteredItems(); track matrix.id) {
            <div class="p-5">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="font-semibold text-surface-900">{{ matrix.name }}</h3>
                  <p class="text-xs text-surface-400 mt-0.5">Created {{ matrix.created_at | date:'mediumDate' }}</p>
                </div>
                @if (isAdmin()) {
                  <div class="flex items-center gap-1">
                    <p-button icon="pi pi-plus" [rounded]="true" [text]="true" severity="secondary"
                      size="small" pTooltip="Add Rule" (onClick)="openAddRule(matrix)" />
                    <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" severity="secondary"
                      size="small" pTooltip="Edit Matrix" (onClick)="openEdit(matrix)" />
                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                      size="small" pTooltip="Delete Matrix" (onClick)="confirmDelete(matrix)" />
                  </div>
                }
              </div>

              @if (matrix.rules && matrix.rules.length > 0) {
                <div class="space-y-2">
                  @for (rule of matrix.rules; track rule.id) {
                    <div class="flex items-center gap-3 p-3 bg-surface-50 rounded-lg text-sm">
                      <span class="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
                        {{ rule.level }}
                      </span>
                      <span class="text-surface-600">After <strong>{{ rule.trigger_after_mins }}min</strong></span>
                      <span class="text-surface-400">→</span>
                      <span class="text-surface-700 capitalize">{{ formatSlug(rule.action) }}</span>
                      <span class="text-surface-400">to</span>
                      <span class="font-medium text-surface-700 capitalize">{{ formatSlug(rule.escalate_to_role) }}</span>
                      @if (isAdmin()) {
                        <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                          size="small" class="ml-auto" (onClick)="deleteRule(rule.id, matrix)" />
                      }
                    </div>
                  }
                </div>
              } @else {
                <p class="text-sm text-surface-400 italic">No escalation rules defined.</p>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Matrix Dialog -->
    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Matrix' : 'Add Escalation Matrix'"
      [modal]="true" [style]="{ width: '420px' }" [draggable]="false" [resizable]="false">
      <div class="py-2">
        <label class="text-sm font-medium text-surface-700 mb-1 block">Matrix Name <span class="text-red-500">*</span></label>
        <input pInputText [(ngModel)]="form.name" placeholder="e.g. Standard Escalation" class="w-full" />
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button [label]="editingItem ? 'Update' : 'Create'" [loading]="isSaving()"
            [disabled]="!form.name" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Rule Dialog -->
    <p-dialog [(visible)]="ruleDialogVisible" header="Add Escalation Rule"
      [modal]="true" [style]="{ width: '460px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Level</label>
          <p-inputnumber [(ngModel)]="ruleForm.level" [min]="1" [max]="10" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Trigger After (minutes) <span class="text-red-500">*</span></label>
          <p-inputnumber [(ngModel)]="ruleForm.trigger_after_mins" [min]="1" placeholder="e.g. 60" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Escalate To Role</label>
          <p-dropdown [(ngModel)]="ruleForm.escalate_to_role" [options]="roleOptions" optionLabel="label"
            optionValue="value" placeholder="Select role" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Action</label>
          <p-dropdown [(ngModel)]="ruleForm.action" [options]="actionOptions" optionLabel="label"
            optionValue="value" placeholder="Select action" class="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="ruleDialogVisible = false" />
          <p-button label="Add Rule" [loading]="isSaving()"
            [disabled]="!ruleForm.trigger_after_mins" (onClick)="saveRule()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class EscalationMatrixMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<MatrixItem[]>([]);
  readonly filteredItems = signal<MatrixItem[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected ruleDialogVisible = false;
  protected editingItem: MatrixItem | null = null;
  protected activeMatrixForRule: MatrixItem | null = null;
  protected form: MatrixForm = { name: '' };
  protected ruleForm: RuleForm = this.defaultRuleForm();

  readonly roleOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Super Admin', value: 'super_admin' },
    { label: 'Agent', value: 'agent' },
  ];

  readonly actionOptions = [
    { label: 'Notify', value: 'notify' },
    { label: 'Reassign', value: 'reassign' },
    { label: 'Change Priority', value: 'change_priority' },
  ];

  ngOnInit(): void { this.load(); }

  private defaultRuleForm(): RuleForm {
    return { level: 1, trigger_after_mins: 60, escalate_to_role: 'admin', action: 'notify' };
  }

  protected formatSlug(slug: string): string {
    return slug.split('_').join(' ');
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i => i.name.toLowerCase().includes(q)) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data: matrices, error } = await this.supabase.from('escalation_matrices').select('id, name, created_at').order('name');
      if (error) throw error;

      const { data: rules } = await this.supabase.from('escalation_rules')
        .select('id, matrix_id, level, trigger_after_mins, escalate_to_role, action').order('level');

      const items = (matrices ?? []).map((m: unknown) => {
        const matrix = m as MatrixItem;
        matrix.rules = ((rules ?? []) as Array<EscalationRule & { matrix_id: string }>)
          .filter(r => r.matrix_id === matrix.id);
        return matrix;
      });

      this.items.set(items);
      this.filteredItems.set(items);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void { this.editingItem = null; this.form = { name: '' }; this.dialogVisible = true; }

  openEdit(item: MatrixItem): void {
    this.editingItem = item;
    this.form = { name: item.name };
    this.dialogVisible = true;
  }

  openAddRule(matrix: MatrixItem): void {
    this.activeMatrixForRule = matrix;
    this.ruleForm = this.defaultRuleForm();
    this.ruleForm.level = (matrix.rules?.length ?? 0) + 1;
    this.ruleDialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim()) { this.toastService.error('Name is required.'); return; }
    this.isSaving.set(true);
    try {
      const { error } = this.editingItem
        ? await this.supabase.from('escalation_matrices').update({ name: this.form.name.trim() }).eq('id', this.editingItem.id)
        : await this.supabase.from('escalation_matrices').insert({ name: this.form.name.trim() });
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Matrix updated.' : 'Matrix created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  async saveRule(): Promise<void> {
    if (!this.activeMatrixForRule || !this.ruleForm.trigger_after_mins) return;
    this.isSaving.set(true);
    try {
      const { error } = await this.supabase.from('escalation_rules').insert({
        matrix_id: this.activeMatrixForRule.id,
        level: this.ruleForm.level,
        trigger_after_mins: this.ruleForm.trigger_after_mins,
        escalate_to_role: this.ruleForm.escalate_to_role,
        action: this.ruleForm.action,
      });
      if (error) throw error;
      this.toastService.success('Rule added.');
      this.ruleDialogVisible = false;
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to add rule');
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteRule(ruleId: string, matrix: MatrixItem): Promise<void> {
    const { error } = await this.supabase.from('escalation_rules').delete().eq('id', ruleId);
    if (!error) { this.toastService.success('Rule removed.'); await this.load(); }
    else this.toastService.error(error.message);
  }

  confirmDelete(item: MatrixItem): void {
    this.confirmationService.confirm({
      message: `Delete matrix <strong>${item.name}</strong> and all its rules?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('escalation_matrices').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Matrix deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
