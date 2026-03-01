import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
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

interface Role {
  id: string;
  name: string;
  slug: string;
  is_system: boolean;
  permissions: Record<string, any> | null;
  created_at: string;
}

interface RoleForm {
  name: string;
  slug: string;
}

@Component({
  selector: 'app-role-master',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Roles Management"
      subtitle="Manage system roles and access permissions"
      [breadcrumbs]="['Home', 'Masters', 'Roles']"
    >
      @if (isAdmin()) {
        <p-button label="Add Role" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <!-- Search bar -->
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <span class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10"></i>
          <input
            pInputText
            placeholder="Search roles..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()"
            class="w-full pl-9"
          />
        </span>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} of {{ items().length }} roles</span>
      </div>

      <!-- Skeleton loading -->
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of skeletonRows; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="120px" height="1rem" />
              <p-skeleton width="100px" height="1rem" />
              <p-skeleton width="80px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="60px" height="1rem" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state
          icon="pi pi-shield"
          title="No roles found"
          [description]="searchQuery ? 'No roles match your search.' : 'No roles have been configured yet.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Role' : undefined"
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
              <th pSortableColumn="slug">Slug <p-sortIcon field="slug" /></th>
              <th>Type</th>
              <th>Permissions</th>
              <th pSortableColumn="created_at">Created <p-sortIcon field="created_at" /></th>
              @if (isAdmin()) {
                <th class="w-24 text-center">Actions</th>
              }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-role>
            <tr>
              <td class="font-medium text-surface-900">{{ role.name }}</td>
              <td>
                <code class="text-xs bg-surface-100 px-2 py-0.5 rounded font-mono">{{ role.slug }}</code>
              </td>
              <td>
                <p-tag
                  [value]="role.is_system ? 'System' : 'Custom'"
                  [severity]="role.is_system ? 'warn' : 'secondary'"
                />
              </td>
              <td class="text-sm text-surface-600">
                {{ getPermissionCount(role.permissions) }} permission(s)
              </td>
              <td class="text-surface-500 text-sm">{{ role.created_at | date:'mediumDate' }}</td>
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
                      [disabled]="role.is_system"
                      (onClick)="openEdit(role)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      severity="danger"
                      size="small"
                      pTooltip="Delete"
                      [disabled]="role.is_system"
                      (onClick)="confirmDelete(role)"
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
      [header]="editingItem ? 'Edit Role' : 'Add Role'"
      [modal]="true"
      [style]="{ width: '480px' }"
      [draggable]="false"
      [resizable]="false"
    >
      <div class="flex flex-col gap-4 py-2">
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Name <span class="text-red-500">*</span></label>
          <input
            pInputText
            [(ngModel)]="form.name"
            placeholder="e.g. Support Agent"
            class="w-full"
            (ngModelChange)="onNameChange()"
          />
        </div>

        <!-- Slug -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Slug <span class="text-red-500">*</span></label>
          <input
            pInputText
            [(ngModel)]="form.slug"
            placeholder="e.g. support_agent"
            class="w-full font-mono"
          />
          <span class="text-xs text-surface-400">Auto-generated from name. Used internally as identifier.</span>
        </div>

        <!-- Permissions (readonly display when editing) -->
        @if (editingItem && editingItem.permissions) {
          <div class="rounded-lg bg-surface-50 border border-surface-200 p-3">
            <p class="text-xs font-semibold text-surface-700 mb-2">Permissions (read-only)</p>
            <div class="flex flex-wrap gap-1">
              @for (key of getPermissionKeys(editingItem.permissions); track key) {
                <span class="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-mono">{{ key }}</span>
              }
              @if (getPermissionKeys(editingItem.permissions).length === 0) {
                <span class="text-xs text-surface-400">No permissions defined</span>
              }
            </div>
          </div>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button
            [label]="editingItem ? 'Update' : 'Create'"
            [loading]="isSaving()"
            [disabled]="!form.name || !form.slug"
            (onClick)="save()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class RoleMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<Role[]>([]);
  readonly filteredItems = signal<Role[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: Role | null = null;
  protected form: RoleForm = this.defaultForm();
  readonly skeletonRows = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.load();
  }

  private defaultForm(): RoleForm {
    return { name: '', slug: '' };
  }

  protected getPermissionCount(permissions: Record<string, any> | null): number {
    if (!permissions) return 0;
    return Object.keys(permissions).length;
  }

  protected getPermissionKeys(permissions: Record<string, any> | null): string[] {
    if (!permissions) return [];
    return Object.keys(permissions);
  }

  protected onNameChange(): void {
    if (!this.editingItem) {
      this.form.slug = this.form.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    }
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredItems.set(this.items());
      return;
    }
    this.filteredItems.set(
      this.items().filter(r =>
        r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
      )
    );
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('roles').select('*').order('name');
      if (error) throw error;
      this.items.set(data as Role[]);
      this.filteredItems.set(data as Role[]);
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to load roles');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void {
    this.editingItem = null;
    this.form = this.defaultForm();
    this.dialogVisible = true;
  }

  openEdit(item: Role): void {
    if (item.is_system) return;
    this.editingItem = item;
    this.form = { name: item.name, slug: item.slug };
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.editingItem = null;
  }

  async save(): Promise<void> {
    if (!this.form.name.trim() || !this.form.slug.trim()) {
      this.toastService.error('Name and slug are required.');
      return;
    }
    this.isSaving.set(true);
    try {
      const payload = { name: this.form.name.trim(), slug: this.form.slug.trim() };
      if (this.editingItem) {
        const { error } = await this.supabase.from('roles').update(payload).eq('id', this.editingItem.id);
        if (error) throw error;
        this.toastService.success('Role updated successfully.');
      } else {
        const { error } = await this.supabase.from('roles').insert({ ...payload, is_system: false });
        if (error) throw error;
        this.toastService.success('Role created successfully.');
      }
      this.closeDialog();
      await this.load();
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to save role');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: Role): void {
    if (item.is_system) return;
    this.confirmationService.confirm({
      message: `Are you sure you want to delete role <strong>${item.name}</strong>?`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('roles').delete().eq('id', item.id);
        if (!error) {
          this.toastService.success('Role deleted.');
          await this.load();
        } else {
          this.toastService.error(error.message);
        }
      },
    });
  }
}
