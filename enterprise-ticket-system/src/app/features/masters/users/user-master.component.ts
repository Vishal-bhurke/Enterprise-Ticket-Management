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
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT, ADMIN_SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface Role {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  employee_id: string | null;
  role_id: string | null;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
  role: Role | null;
  department: Department | null;
}

interface UserForm {
  full_name: string;
  email: string;
  employee_id: string;
  role_id: string | null;
  department_id: string | null;
  is_active: boolean;
}

@Component({
  selector: 'app-user-master',
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
    ToggleSwitchModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="User Management"
      subtitle="Manage user profiles, roles, and department assignments"
      [breadcrumbs]="['Home', 'Masters', 'Users']"
    >
      @if (isAdmin()) {
        <p-button label="Add User" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <!-- Search bar -->
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <span class="p-input-icon-left flex-1 max-w-xs relative">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10"></i>
          <input
            pInputText
            placeholder="Search users..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()"
            class="w-full pl-9"
          />
        </span>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} of {{ items().length }} users</span>
      </div>

      <!-- Skeleton loading -->
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of skeletonRows; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="2rem" height="2rem" shape="circle" />
              <p-skeleton width="160px" height="1rem" />
              <p-skeleton width="200px" height="1rem" />
              <p-skeleton width="100px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="120px" height="1rem" />
              <p-skeleton width="80px" height="1rem" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state
          icon="pi pi-users"
          title="No users found"
          [description]="searchQuery ? 'No users match your search criteria.' : 'No users have been added yet.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add User' : undefined"
          (action)="openCreate()"
        />
      }

      <!-- Table -->
      @if (!isLoading() && filteredItems().length > 0) {
        <p-table
          [value]="filteredItems()"
          [paginator]="filteredItems().length > 20"
          [rows]="20"
          [rowsPerPageOptions]="[20, 50, 100]"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="full_name">Full Name <p-sortIcon field="full_name" /></th>
              <th pSortableColumn="email">Email <p-sortIcon field="email" /></th>
              <th>Role</th>
              <th>Department</th>
              <th>Employee ID</th>
              <th pSortableColumn="is_active">Status <p-sortIcon field="is_active" /></th>
              <th pSortableColumn="created_at">Created <p-sortIcon field="created_at" /></th>
              @if (isAdmin()) {
                <th class="w-24 text-center">Actions</th>
              }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-user>
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-semibold text-primary-700">{{ getInitials(user.full_name) }}</span>
                  </div>
                  <span class="font-medium text-surface-900">{{ user.full_name || '—' }}</span>
                </div>
              </td>
              <td class="text-surface-600">{{ user.email }}</td>
              <td>
                @if (user.role) {
                  <p-tag [value]="user.role.name" severity="info" />
                } @else {
                  <span class="text-surface-400 text-sm">—</span>
                }
              </td>
              <td class="text-surface-600">{{ user.department?.name || '—' }}</td>
              <td class="text-surface-600">{{ user.employee_id || '—' }}</td>
              <td>
                <p-tag
                  [value]="user.is_active ? 'Active' : 'Inactive'"
                  [severity]="user.is_active ? 'success' : 'danger'"
                />
              </td>
              <td class="text-surface-500 text-sm">{{ user.created_at | date:'mediumDate' }}</td>
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
                      (onClick)="openEdit(user)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      severity="danger"
                      size="small"
                      pTooltip="Delete"
                      (onClick)="confirmDelete(user)"
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
      [header]="editingItem ? 'Edit User' : 'Add User'"
      [modal]="true"
      [style]="{ width: '520px' }"
      [draggable]="false"
      [resizable]="false"
    >
      <div class="flex flex-col gap-4 py-2">
        <!-- Full Name -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Full Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.full_name" placeholder="Enter full name" class="w-full" />
        </div>

        <!-- Email -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Email <span class="text-red-500">*</span></label>
          <input
            pInputText
            [(ngModel)]="form.email"
            placeholder="Enter email address"
            type="email"
            [readonly]="!!editingItem"
            [class]="'w-full ' + (editingItem ? 'opacity-60 cursor-not-allowed' : '')"
          />
          @if (editingItem) {
            <span class="text-xs text-surface-400">Email cannot be changed after creation.</span>
          }
        </div>

        <!-- Employee ID -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Employee ID</label>
          <input pInputText [(ngModel)]="form.employee_id" placeholder="e.g. EMP-001" class="w-full" />
        </div>

        <!-- Role -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Role</label>
          <p-dropdown
            [(ngModel)]="form.role_id"
            [options]="roles()"
            optionLabel="name"
            optionValue="id"
            placeholder="Select role"
            [showClear]="true"
            appendTo="body"
            class="w-full"
          />
        </div>

        <!-- Department -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Department</label>
          <p-dropdown
            [(ngModel)]="form.department_id"
            [options]="departments()"
            optionLabel="name"
            optionValue="id"
            placeholder="Select department"
            [showClear]="true"
            appendTo="body"
            class="w-full"
          />
        </div>

        <!-- Active status -->
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
            [disabled]="!form.full_name || !form.email"
            (onClick)="save()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class UserMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private adminSupabase = inject(ADMIN_SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<UserProfile[]>([]);
  readonly filteredItems = signal<UserProfile[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly departments = signal<Department[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: UserProfile | null = null;
  protected form: UserForm = this.defaultForm();
  readonly skeletonRows = [1, 2, 3, 4, 5];

  ngOnInit(): void {
    this.load();
    this.loadRoles();
    this.loadDepartments();
  }

  private defaultForm(): UserForm {
    return {
      full_name: '',
      email: '',
      employee_id: '',
      role_id: null,
      department_id: null,
      is_active: true,
    };
  }

  protected getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) {
      this.filteredItems.set(this.items());
      return;
    }
    this.filteredItems.set(
      this.items().filter(u =>
        (u.full_name?.toLowerCase().includes(q)) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.employee_id?.toLowerCase().includes(q)) ||
        (u.role?.name?.toLowerCase().includes(q)) ||
        (u.department?.name?.toLowerCase().includes(q))
      )
    );
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*, role:roles!role_id(id, name), department:departments!department_id(id, name)')
        .order('full_name');
      if (error) throw error;
      this.items.set(data as UserProfile[]);
      this.filteredItems.set(data as UserProfile[]);
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to load users');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRoles(): Promise<void> {
    const { data } = await this.supabase.from('roles').select('id, name').order('name');
    if (data) this.roles.set(data as Role[]);
  }

  private async loadDepartments(): Promise<void> {
    const { data } = await this.supabase.from('departments').select('id, name').order('name');
    if (data) this.departments.set(data as Department[]);
  }

  openCreate(): void {
    this.editingItem = null;
    this.form = this.defaultForm();
    this.dialogVisible = true;
  }

  openEdit(item: UserProfile): void {
    this.editingItem = item;
    this.form = {
      full_name: item.full_name ?? '',
      email: item.email ?? '',
      employee_id: item.employee_id ?? '',
      role_id: item.role_id,
      department_id: item.department_id,
      is_active: item.is_active,
    };
    this.dialogVisible = true;
  }

  closeDialog(): void {
    this.dialogVisible = false;
    this.editingItem = null;
  }

  async save(): Promise<void> {
    if (!this.form.full_name.trim() || !this.form.email.trim()) {
      this.toastService.error('Full name and email are required.');
      return;
    }

    this.isSaving.set(true);
    try {
      const payload = {
        full_name: this.form.full_name.trim(),
        employee_id: this.form.employee_id?.trim() || null,
        role_id: this.form.role_id,
        department_id: this.form.department_id,
        is_active: this.form.is_active,
      };

      if (this.editingItem) {
        const { error } = await this.supabase.from('profiles').update(payload).eq('id', this.editingItem.id);
        if (error) throw error;
        this.toastService.success('User updated successfully.');
      } else {
        // Step 1: Create the auth.users record via Admin API (requires service role key).
        // Direct profiles INSERT is impossible — profiles.id is a FK to auth.users.id.
        const { data: authData, error: authError } = await this.adminSupabase.auth.admin.createUser({
          email: this.form.email.trim(),
          email_confirm: true,           // Admin creates user directly — no email verification step
          password: crypto.randomUUID(), // Cryptographically random temp password
          user_metadata: { full_name: this.form.full_name.trim() },
        });
        if (authError) throw authError;

        // Step 2: The `handle_new_user` DB trigger fires automatically after auth.users INSERT,
        // creating a profiles row with role=end_user. Now UPDATE it with the form values.
        const { error: profileError } = await this.adminSupabase
          .from('profiles')
          .update({
            role_id: this.form.role_id,
            department_id: this.form.department_id || null,
            employee_id: this.form.employee_id?.trim() || null,
            is_active: this.form.is_active,
          })
          .eq('id', authData.user.id);
        if (profileError) throw profileError;

        this.toastService.success('User created successfully. Ask them to use "Forgot Password" to set their password.');
      }
      this.closeDialog();
      await this.load();
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to save user');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: UserProfile): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${item.full_name}</strong>?`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('profiles').delete().eq('id', item.id);
        if (!error) {
          this.toastService.success('User deleted.');
          await this.load();
        } else {
          this.toastService.error(error.message);
        }
      },
    });
  }
}
