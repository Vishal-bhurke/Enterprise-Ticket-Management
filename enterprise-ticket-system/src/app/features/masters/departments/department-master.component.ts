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

interface ProfileOption {
  id: string;
  full_name: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  head_id: string | null;
  parent_id: string | null;
  created_at: string;
  head: ProfileOption | null;
  parent: DepartmentOption | null;
}

interface DepartmentForm {
  name: string;
  code: string;
  head_id: string | null;
  parent_id: string | null;
}

@Component({
  selector: 'app-department-master',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TableModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Departments"
      subtitle="Manage organizational departments, heads, and hierarchy"
      [breadcrumbs]="['Home', 'Masters', 'Departments']"
    >
      @if (isAdmin()) {
        <p-button label="Add Department" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <!-- Search bar -->
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <span class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10"></i>
          <input
            pInputText
            placeholder="Search departments..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()"
            class="w-full pl-9"
          />
        </span>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} of {{ items().length }} departments</span>
      </div>

      <!-- Skeleton loading -->
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of skeletonRows; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="150px" height="1rem" />
              <p-skeleton width="80px" height="1rem" />
              <p-skeleton width="120px" height="1rem" />
              <p-skeleton width="120px" height="1rem" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state
          icon="pi pi-building"
          title="No departments found"
          [description]="searchQuery ? 'No departments match your search.' : 'No departments have been created yet.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Department' : undefined"
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
              <th>Head</th>
              <th>Parent Department</th>
              <th pSortableColumn="created_at">Created <p-sortIcon field="created_at" /></th>
              @if (isAdmin()) {
                <th class="w-24 text-center">Actions</th>
              }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-dept>
            <tr>
              <td class="font-medium text-surface-900">{{ dept.name }}</td>
              <td>
                <code class="text-xs bg-surface-100 px-2 py-0.5 rounded font-mono uppercase">{{ dept.code }}</code>
              </td>
              <td class="text-surface-600">{{ dept.head?.full_name || '—' }}</td>
              <td class="text-surface-600">{{ dept.parent?.name || '—' }}</td>
              <td class="text-surface-500 text-sm">{{ dept.created_at | date:'mediumDate' }}</td>
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
                      (onClick)="openEdit(dept)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      severity="danger"
                      size="small"
                      pTooltip="Delete"
                      (onClick)="confirmDelete(dept)"
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
      [header]="editingItem ? 'Edit Department' : 'Add Department'"
      [modal]="true"
      [style]="{ width: '500px' }"
      [draggable]="false"
      [resizable]="false"
    >
      <div class="flex flex-col gap-4 py-2">
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Information Technology" class="w-full" />
        </div>

        <!-- Code -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Code <span class="text-red-500">*</span></label>
          <input
            pInputText
            [(ngModel)]="form.code"
            placeholder="e.g. IT"
            class="w-full uppercase"
            (ngModelChange)="form.code = form.code.toUpperCase()"
          />
          <span class="text-xs text-surface-400">Department code (uppercase).</span>
        </div>

        <!-- Head -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Department Head</label>
          <p-dropdown
            [(ngModel)]="form.head_id"
            [options]="profiles()"
            optionLabel="full_name"
            optionValue="id"
            placeholder="Select head"
            [showClear]="true"
            [filter]="true"
            filterPlaceholder="Search users..."
            class="w-full"
          />
        </div>

        <!-- Parent Department -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Parent Department</label>
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
export class DepartmentMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<Department[]>([]);
  readonly filteredItems = signal<Department[]>([]);
  readonly profiles = signal<ProfileOption[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: Department | null = null;
  protected form: DepartmentForm = this.defaultForm();
  readonly skeletonRows = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.load();
    this.loadProfiles();
  }

  private defaultForm(): DepartmentForm {
    return { name: '', code: '', head_id: null, parent_id: null };
  }

  protected parentOptions(): DepartmentOption[] {
    if (!this.editingItem) return this.items().map(d => ({ id: d.id, name: d.name }));
    return this.items()
      .filter(d => d.id !== this.editingItem!.id)
      .map(d => ({ id: d.id, name: d.name }));
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredItems.set(this.items());
      return;
    }
    this.filteredItems.set(
      this.items().filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.head?.full_name?.toLowerCase().includes(q)
      )
    );
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .select('*, head:profiles!head_id(id, full_name), parent:departments!parent_id(id, name)')
        .order('name');
      if (error) throw error;
      this.items.set(data as Department[]);
      this.filteredItems.set(data as Department[]);
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to load departments');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadProfiles(): Promise<void> {
    const { data } = await this.supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    if (data) this.profiles.set(data as ProfileOption[]);
  }

  openCreate(): void {
    this.editingItem = null;
    this.form = this.defaultForm();
    this.dialogVisible = true;
  }

  openEdit(item: Department): void {
    this.editingItem = item;
    this.form = {
      name: item.name,
      code: item.code,
      head_id: item.head_id,
      parent_id: item.parent_id,
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
        code: this.form.code.trim().toUpperCase(),
        head_id: this.form.head_id,
        parent_id: this.form.parent_id,
      };
      if (this.editingItem) {
        const { error } = await this.supabase.from('departments').update(payload).eq('id', this.editingItem.id);
        if (error) throw error;
        this.toastService.success('Department updated successfully.');
      } else {
        const { error } = await this.supabase.from('departments').insert(payload);
        if (error) throw error;
        this.toastService.success('Department created successfully.');
      }
      this.closeDialog();
      await this.load();
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to save department');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: Department): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete department <strong>${item.name}</strong>?`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('departments').delete().eq('id', item.id);
        if (!error) {
          this.toastService.success('Department deleted.');
          await this.load();
        } else {
          this.toastService.error(error.message);
        }
      },
    });
  }
}
