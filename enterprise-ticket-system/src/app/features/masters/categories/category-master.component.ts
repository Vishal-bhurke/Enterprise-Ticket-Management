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
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface CategoryOption {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  parent: CategoryOption | null;
}

interface CategoryForm {
  name: string;
  code: string;
  description: string;
  parent_id: string | null;
  is_active: boolean;
}

@Component({
  selector: 'app-category-master',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    DropdownModule,
    TableModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Categories"
      subtitle="Organize tickets into categories and sub-categories"
      [breadcrumbs]="['Home', 'Masters', 'Categories']"
    >
      @if (isAdmin()) {
        <p-button label="Add Category" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <!-- Search bar -->
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <span class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10"></i>
          <input
            pInputText
            placeholder="Search categories..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()"
            class="w-full pl-9"
          />
        </span>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} of {{ items().length }} categories</span>
      </div>

      <!-- Skeleton loading -->
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of skeletonRows; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="140px" height="1rem" />
              <p-skeleton width="80px" height="1rem" />
              <p-skeleton width="120px" height="1rem" />
              <p-skeleton width="60px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state
          icon="pi pi-tag"
          title="No categories found"
          [description]="searchQuery ? 'No categories match your search.' : 'No categories have been created yet.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Category' : undefined"
          (action)="openCreate()"
        />
      }

      <!-- Table -->
      @if (!isLoading() && filteredItems().length > 0) {
        <p-table
          [value]="filteredItems()"
          [paginator]="filteredItems().length > 20"
          [rows]="20"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th pSortableColumn="code">Code <p-sortIcon field="code" /></th>
              <th>Parent</th>
              <th pSortableColumn="is_active">Status <p-sortIcon field="is_active" /></th>
              <th pSortableColumn="created_at">Created <p-sortIcon field="created_at" /></th>
              @if (isAdmin()) {
                <th class="w-24 text-center">Actions</th>
              }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-cat>
            <tr>
              <td class="font-medium text-surface-900">{{ cat.name }}</td>
              <td>
                <code class="text-xs bg-surface-100 px-2 py-0.5 rounded font-mono">{{ cat.code }}</code>
              </td>
              <td class="text-surface-600">{{ cat.parent?.name || '—' }}</td>
              <td>
                <p-tag
                  [value]="cat.is_active ? 'Active' : 'Inactive'"
                  [severity]="cat.is_active ? 'success' : 'danger'"
                />
              </td>
              <td class="text-surface-500 text-sm">{{ cat.created_at | date:'mediumDate' }}</td>
              @if (isAdmin()) {
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <p-button
                      icon="pi pi-pencil"
                      [rounded]="true"
                      [text]="true"
                      severity="secondary"
                      size="small"
                      pTooltip="Edit"
                      (onClick)="openEdit(cat)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      severity="danger"
                      size="small"
                      pTooltip="Delete"
                      (onClick)="confirmDelete(cat)"
                    />
                  </div>
                </td>
              }
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <!-- Create/Edit Dialog -->
    <p-dialog
      [(visible)]="dialogVisible"
      [header]="editingItem ? 'Edit Category' : 'Add Category'"
      [modal]="true"
      [style]="{ width: '500px' }"
      [draggable]="false"
      [resizable]="false"
    >
      <div class="flex flex-col gap-4 py-2">
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Hardware" class="w-full" />
        </div>

        <!-- Code -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Code <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.code" placeholder="e.g. HW" class="w-full" />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Description</label>
          <textarea
            pTextarea
            [(ngModel)]="form.description"
            placeholder="Optional description"
            rows="3"
            class="w-full"
          ></textarea>
        </div>

        <!-- Parent Category -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Parent Category</label>
          <p-dropdown
            [(ngModel)]="form.parent_id"
            [options]="parentOptions()"
            optionLabel="name"
            optionValue="id"
            placeholder="None (top-level)"
            [showClear]="true"
            class="w-full"
          />
        </div>

        <!-- Active -->
        <div class="flex items-center gap-3">
          <p-toggleswitch [(ngModel)]="form.is_active" />
          <label class="text-sm font-medium text-surface-700">Active</label>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button
            [label]="editingItem ? 'Update' : 'Create'"
            [loading]="isSaving()"
            [disabled]="!form.name || !form.code"
            (onClick)="save()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class CategoryMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<Category[]>([]);
  readonly filteredItems = signal<Category[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: Category | null = null;
  protected form: CategoryForm = this.defaultForm();
  readonly skeletonRows = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.load();
  }

  private defaultForm(): CategoryForm {
    return { name: '', code: '', description: '', parent_id: null, is_active: true };
  }

  protected parentOptions(): CategoryOption[] {
    if (!this.editingItem) return this.items().map(c => ({ id: c.id, name: c.name }));
    return this.items()
      .filter(c => c.id !== this.editingItem!.id)
      .map(c => ({ id: c.id, name: c.name }));
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredItems.set(this.items());
      return;
    }
    this.filteredItems.set(
      this.items().filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.parent?.name?.toLowerCase().includes(q)
      )
    );
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('categories')
        .select('*, parent:categories!parent_id(id, name)')
        .order('name');
      if (error) throw error;
      this.items.set(data as Category[]);
      this.filteredItems.set(data as Category[]);
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to load categories');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void {
    this.editingItem = null;
    this.form = this.defaultForm();
    this.dialogVisible = true;
  }

  openEdit(item: Category): void {
    this.editingItem = item;
    this.form = {
      name: item.name,
      code: item.code,
      description: item.description ?? '',
      parent_id: item.parent_id,
      is_active: item.is_active,
    };
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.editingItem = null;
  }

  async save(): Promise<void> {
    if (!this.form.name.trim() || !this.form.code.trim()) {
      this.toastService.error('Name and code are required.');
      return;
    }
    this.isSaving.set(true);
    try {
      const payload = {
        name: this.form.name.trim(),
        code: this.form.code.trim(),
        description: this.form.description?.trim() || null,
        parent_id: this.form.parent_id,
        is_active: this.form.is_active,
      };
      if (this.editingItem) {
        const { error } = await this.supabase.from('categories').update(payload).eq('id', this.editingItem.id);
        if (error) throw error;
        this.toastService.success('Category updated successfully.');
      } else {
        const { error } = await this.supabase.from('categories').insert(payload);
        if (error) throw error;
        this.toastService.success('Category created successfully.');
      }
      this.closeDialog();
      await this.load();
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to save category');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: Category): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete category <strong>${item.name}</strong>?`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('categories').delete().eq('id', item.id);
        if (!error) {
          this.toastService.success('Category deleted.');
          await this.load();
        } else {
          this.toastService.error(error.message);
        }
      },
    });
  }
}
