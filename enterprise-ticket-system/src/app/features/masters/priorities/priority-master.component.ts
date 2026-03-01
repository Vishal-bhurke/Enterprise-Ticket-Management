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
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface Priority {
  id: string;
  name: string;
  slug: string;
  level: number;
  color: string;
  sla_multiplier: number;
  is_active: boolean;
  created_at: string;
}

interface PriorityForm {
  name: string;
  slug: string;
  level: number;
  color: string;
  sla_multiplier: number;
  is_active: boolean;
}

@Component({
  selector: 'app-priority-master',
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
    ColorPickerModule,
    InputNumberModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Priorities"
      subtitle="Configure ticket priority levels and SLA multipliers"
      [breadcrumbs]="['Home', 'Masters', 'Priorities']"
    >
      @if (isAdmin()) {
        <p-button label="Add Priority" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <!-- Search bar -->
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <span class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10"></i>
          <input
            pInputText
            placeholder="Search priorities..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()"
            class="w-full pl-9"
          />
        </span>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} of {{ items().length }} priorities</span>
      </div>

      <!-- Skeleton loading -->
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of skeletonRows; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="100px" height="1rem" />
              <p-skeleton width="80px" height="1rem" />
              <p-skeleton width="40px" height="1rem" />
              <p-skeleton width="60px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="80px" height="1rem" />
              <p-skeleton width="60px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state
          icon="pi pi-exclamation-triangle"
          title="No priorities found"
          [description]="searchQuery ? 'No priorities match your search.' : 'No priorities have been configured yet.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Priority' : undefined"
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
              <th pSortableColumn="level">Level <p-sortIcon field="level" /></th>
              <th>Color</th>
              <th pSortableColumn="sla_multiplier">SLA Multiplier <p-sortIcon field="sla_multiplier" /></th>
              <th pSortableColumn="is_active">Status <p-sortIcon field="is_active" /></th>
              @if (isAdmin()) {
                <th class="w-24 text-center">Actions</th>
              }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-priority>
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-3 h-3 rounded-full flex-shrink-0"
                    [style.background-color]="priority.color || '#6b7280'"
                  ></span>
                  <span class="font-medium text-surface-900">{{ priority.name }}</span>
                </div>
              </td>
              <td>
                <code class="text-xs bg-surface-100 px-2 py-0.5 rounded font-mono">{{ priority.slug }}</code>
              </td>
              <td>
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-100 text-sm font-bold text-surface-700">
                  {{ priority.level }}
                </span>
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block w-6 h-6 rounded border border-surface-200"
                    [style.background-color]="priority.color || '#6b7280'"
                  ></span>
                  <code class="text-xs text-surface-500">{{ priority.color }}</code>
                </div>
              </td>
              <td class="text-surface-700">{{ priority.sla_multiplier }}x</td>
              <td>
                <p-tag
                  [value]="priority.is_active ? 'Active' : 'Inactive'"
                  [severity]="priority.is_active ? 'success' : 'danger'"
                />
              </td>
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
                      (onClick)="openEdit(priority)"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      severity="danger"
                      size="small"
                      pTooltip="Delete"
                      (onClick)="confirmDelete(priority)"
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
      [header]="editingItem ? 'Edit Priority' : 'Add Priority'"
      [modal]="true"
      [style]="{ width: '500px' }"
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
            placeholder="e.g. Critical"
            class="w-full"
            (ngModelChange)="onNameChange()"
          />
        </div>

        <!-- Slug -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Slug <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.slug" placeholder="e.g. critical" class="w-full font-mono" />
        </div>

        <!-- Level -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Level <span class="text-red-500">*</span></label>
          <p-dropdown
            [(ngModel)]="form.level"
            [options]="levelOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select level"
            class="w-full"
          />
          <span class="text-xs text-surface-400">1 = highest priority, 4 = lowest</span>
        </div>

        <!-- Color -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Color</label>
          <div class="flex items-center gap-3">
            <p-colorPicker [(ngModel)]="form.color" [inline]="false" />
            <input
              pInputText
              [(ngModel)]="form.color"
              placeholder="#ef4444"
              class="w-full font-mono"
            />
          </div>
        </div>

        <!-- SLA Multiplier -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">SLA Multiplier</label>
          <p-inputNumber
            [(ngModel)]="form.sla_multiplier"
            [min]="0.1"
            [max]="10"
            [step]="0.1"
            [minFractionDigits]="1"
            [maxFractionDigits]="2"
            placeholder="1.0"
            class="w-full"
          />
          <span class="text-xs text-surface-400">Multiplier applied to base SLA time (e.g. 0.5 = half SLA time).</span>
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
            [disabled]="!form.name || !form.slug"
            (onClick)="save()"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class PriorityMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<Priority[]>([]);
  readonly filteredItems = signal<Priority[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: Priority | null = null;
  protected form: PriorityForm = this.defaultForm();
  readonly skeletonRows = [1, 2, 3, 4, 5];

  readonly levelOptions = [
    { label: '1 - Critical', value: 1 },
    { label: '2 - High', value: 2 },
    { label: '3 - Medium', value: 3 },
    { label: '4 - Low', value: 4 },
  ];

  ngOnInit(): void {
    this.load();
  }

  private defaultForm(): PriorityForm {
    return { name: '', slug: '', level: 3, color: '#6b7280', sla_multiplier: 1.0, is_active: true };
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
      this.items().filter(p =>
        p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      )
    );
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('priorities')
        .select('*')
        .order('level');
      if (error) throw error;
      this.items.set(data as Priority[]);
      this.filteredItems.set(data as Priority[]);
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to load priorities');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void {
    this.editingItem = null;
    this.form = this.defaultForm();
    this.dialogVisible = true;
  }

  openEdit(item: Priority): void {
    this.editingItem = item;
    this.form = {
      name: item.name,
      slug: item.slug,
      level: item.level,
      color: item.color,
      sla_multiplier: item.sla_multiplier,
      is_active: item.is_active,
    };
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
      const payload = {
        name: this.form.name.trim(),
        slug: this.form.slug.trim(),
        level: this.form.level,
        color: this.form.color,
        sla_multiplier: this.form.sla_multiplier,
        is_active: this.form.is_active,
      };
      if (this.editingItem) {
        const { error } = await this.supabase.from('priorities').update(payload).eq('id', this.editingItem.id);
        if (error) throw error;
        this.toastService.success('Priority updated successfully.');
      } else {
        const { error } = await this.supabase.from('priorities').insert(payload);
        if (error) throw error;
        this.toastService.success('Priority created successfully.');
      }
      this.closeDialog();
      await this.load();
    } catch (err: any) {
      this.toastService.error(err.message ?? 'Failed to save priority');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: Priority): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete priority <strong>${item.name}</strong>?`,
      header: 'Confirm Delete',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('priorities').delete().eq('id', item.id);
        if (!error) {
          this.toastService.success('Priority deleted.');
          await this.load();
        } else {
          this.toastService.error(error.message);
        }
      },
    });
  }
}
