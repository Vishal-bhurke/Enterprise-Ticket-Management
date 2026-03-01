import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface CustomFieldItem {
  id: string;
  name: string;
  key: string;
  field_type: string;
  required: boolean;
  is_active: boolean;
  applies_to: string[] | null;
  created_at: string;
}

interface CustomFieldForm {
  name: string;
  key: string;
  field_type: string;
  required: boolean;
  is_active: boolean;
}

@Component({
  selector: 'app-custom-field-master',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TextareaModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule,
    ToggleSwitchModule, CheckboxModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Custom Fields"
      subtitle="Create additional fields to capture ticket metadata"
      [breadcrumbs]="['Home', 'Masters', 'Custom Fields']"
    >
      @if (isAdmin()) {
        <p-button label="Add Field" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search custom fields..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} fields</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="160px" height="1rem" />
              <p-skeleton width="120px" height="1rem" />
              <p-skeleton width="100px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="60px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-sliders-h" title="No custom fields"
          [description]="searchQuery ? 'No fields match your search.' : 'Add your first custom field.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Field' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Key</th>
              <th>Type</th>
              <th>Required</th>
              <th>Status</th>
              @if (isAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td class="font-mono text-xs text-surface-500">{{ item.key }}</td>
              <td>
                <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-medium capitalize">
                  {{ item.field_type }}
                </span>
              </td>
              <td><p-tag [value]="item.required ? 'Required' : 'Optional'" [severity]="item.required ? 'warn' : 'secondary'" /></td>
              <td><p-tag [value]="item.is_active ? 'Active' : 'Inactive'" [severity]="item.is_active ? 'success' : 'danger'" /></td>
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

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Custom Field' : 'Add Custom Field'"
      [modal]="true" [style]="{ width: '480px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Label <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Customer Ref Number"
            (ngModelChange)="autoKey()" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Field Key</label>
          <input pInputText [(ngModel)]="form.key" placeholder="customer_ref_number" class="w-full font-mono text-sm" />
          <span class="text-xs text-surface-400">Unique key used in API responses. Snake_case.</span>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Field Type <span class="text-red-500">*</span></label>
          <p-dropdown [(ngModel)]="form.field_type" [options]="fieldTypeOptions" optionLabel="label"
            optionValue="value" placeholder="Select type" class="w-full" />
        </div>
        <div class="flex flex-wrap gap-6">
          <label class="flex items-center gap-2 cursor-pointer">
            <p-checkbox [(ngModel)]="form.required" [binary]="true" />
            <span class="text-sm text-surface-700">Required field</span>
          </label>
        </div>
        <div class="flex items-center gap-3">
          <p-toggleswitch [(ngModel)]="form.is_active" />
          <label class="text-sm font-medium text-surface-700">Active</label>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button [label]="editingItem ? 'Update' : 'Create'" [loading]="isSaving()"
            [disabled]="!form.name || !form.field_type" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class CustomFieldMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<CustomFieldItem[]>([]);
  readonly filteredItems = signal<CustomFieldItem[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: CustomFieldItem | null = null;
  protected form: CustomFieldForm = this.defaultForm();

  readonly fieldTypeOptions = [
    { label: 'Text', value: 'text' },
    { label: 'Number', value: 'number' },
    { label: 'Date', value: 'date' },
    { label: 'Date & Time', value: 'datetime' },
    { label: 'Boolean (Yes/No)', value: 'boolean' },
    { label: 'Select (single)', value: 'select' },
    { label: 'Multi Select', value: 'multi_select' },
    { label: 'User lookup', value: 'user' },
  ];

  ngOnInit(): void { this.load(); }

  private defaultForm(): CustomFieldForm {
    return { name: '', key: '', field_type: 'text', required: false, is_active: true };
  }

  protected autoKey(): void {
    this.form.key = this.form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i =>
      i.name.toLowerCase().includes(q) || i.key.toLowerCase().includes(q) || i.field_type.includes(q)
    ) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('custom_fields').select('*').order('name');
      if (error) throw error;
      this.items.set((data ?? []) as CustomFieldItem[]);
      this.filteredItems.set((data ?? []) as CustomFieldItem[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: CustomFieldItem): void {
    this.editingItem = item;
    this.form = { name: item.name, key: item.key, field_type: item.field_type, required: item.required, is_active: item.is_active };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim() || !this.form.field_type) { this.toastService.error('Name and type are required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = { name: this.form.name.trim(),
        key: this.form.key || this.form.name.toLowerCase().replace(/\s+/g, '_'),
        field_type: this.form.field_type, required: this.form.required, is_active: this.form.is_active };
      const { error } = this.editingItem
        ? await this.supabase.from('custom_fields').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('custom_fields').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Field updated.' : 'Field created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: CustomFieldItem): void {
    this.confirmationService.confirm({
      message: `Delete field <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('custom_fields').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Field deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
