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
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface StatusItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string;
  is_default: boolean;
  is_closed: boolean;
  sort_order: number;
  is_active: boolean;
}

interface StatusForm {
  name: string;
  slug: string;
  category: string;
  color: string;
  is_default: boolean;
  is_closed: boolean;
  sort_order: number;
  is_active: boolean;
}

@Component({
  selector: 'app-status-master',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule,
    ToggleSwitchModule, CheckboxModule, InputNumberModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Statuses"
      subtitle="Define ticket lifecycle statuses and categories"
      [breadcrumbs]="['Home', 'Masters', 'Statuses']"
    >
      @if (isAdmin()) {
        <p-button label="Add Status" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search statuses..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} statuses</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="120px" height="1rem" />
              <p-skeleton width="100px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="80px" height="1rem" />
              <p-skeleton width="60px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-circle" title="No statuses found"
          [description]="searchQuery ? 'No statuses match your search.' : 'Add your first status.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Status' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Category</th>
              <th>Color</th>
              <th pSortableColumn="sort_order">Order <p-sortIcon field="sort_order" /></th>
              <th>Closed?</th>
              <th>Default?</th>
              <th>Status</th>
              @if (isAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full flex-shrink-0" [style.background]="item.color"></span>
                  <span class="font-medium text-surface-900">{{ item.name }}</span>
                  <span class="text-xs text-surface-400 font-mono">{{ item.slug }}</span>
                </div>
              </td>
              <td>
                <span class="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                  [class]="getCategoryClass(item.category)">{{ item.category | titlecase }}</span>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded border border-surface-200" [style.background]="item.color"></span>
                  <span class="text-xs font-mono text-surface-500">{{ item.color }}</span>
                </div>
              </td>
              <td class="text-surface-600 text-center">{{ item.sort_order }}</td>
              <td><p-tag [value]="item.is_closed ? 'Yes' : 'No'" [severity]="item.is_closed ? 'danger' : 'secondary'" /></td>
              <td><p-tag [value]="item.is_default ? 'Yes' : 'No'" [severity]="item.is_default ? 'success' : 'secondary'" /></td>
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

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Status' : 'Add Status'"
      [modal]="true" [style]="{ width: '500px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="Status name"
            (ngModelChange)="autoSlug()" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Slug</label>
          <input pInputText [(ngModel)]="form.slug" placeholder="status_slug" class="w-full font-mono text-sm" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Category <span class="text-red-500">*</span></label>
          <p-dropdown [(ngModel)]="form.category" [options]="categoryOptions" optionLabel="label"
            optionValue="value" placeholder="Select category" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Color (hex)</label>
          <div class="flex items-center gap-2">
            <input pInputText [(ngModel)]="form.color" placeholder="#3B82F6" class="flex-1 font-mono" />
            <span class="w-10 h-10 rounded border border-surface-200 flex-shrink-0" [style.background]="form.color"></span>
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Sort Order</label>
          <p-inputnumber [(ngModel)]="form.sort_order" [min]="0" [max]="999" />
        </div>
        <div class="flex flex-wrap gap-6">
          <label class="flex items-center gap-2 cursor-pointer">
            <p-checkbox [(ngModel)]="form.is_closed" [binary]="true" />
            <span class="text-sm text-surface-700">Is Closed status</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <p-checkbox [(ngModel)]="form.is_default" [binary]="true" />
            <span class="text-sm text-surface-700">Is Default</span>
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
            [disabled]="!form.name || !form.category" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class StatusMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<StatusItem[]>([]);
  readonly filteredItems = signal<StatusItem[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: StatusItem | null = null;
  protected form: StatusForm = this.defaultForm();

  readonly categoryOptions = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Pending', value: 'pending' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
  ];

  ngOnInit(): void { this.load(); }

  private defaultForm(): StatusForm {
    return { name: '', slug: '', category: '', color: '#6B7280', is_default: false, is_closed: false, sort_order: 0, is_active: true };
  }

  protected getCategoryClass(cat: string): string {
    const map: Record<string, string> = {
      open: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      pending: 'bg-amber-100 text-amber-700',
      resolved: 'bg-emerald-100 text-emerald-700',
      closed: 'bg-surface-100 text-surface-600',
    };
    return map[cat] ?? 'bg-surface-100 text-surface-600';
  }

  protected autoSlug(): void {
    this.form.slug = this.form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i =>
      i.name.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
    ) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('statuses').select('*').order('sort_order');
      if (error) throw error;
      this.items.set((data ?? []) as StatusItem[]);
      this.filteredItems.set((data ?? []) as StatusItem[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load statuses');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: StatusItem): void {
    this.editingItem = item;
    this.form = { name: item.name, slug: item.slug, category: item.category, color: item.color,
      is_default: item.is_default, is_closed: item.is_closed, sort_order: item.sort_order, is_active: item.is_active };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim() || !this.form.category) { this.toastService.error('Name and category are required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = { ...this.form, slug: this.form.slug || this.form.name.toLowerCase().replace(/\s+/g, '_') };
      const { error } = this.editingItem
        ? await this.supabase.from('statuses').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('statuses').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Status updated.' : 'Status created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: StatusItem): void {
    this.confirmationService.confirm({
      message: `Delete status <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('statuses').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Status deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
