import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
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

interface TicketTypeItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

interface TicketTypeForm {
  name: string;
  slug: string;
  description: string;
  icon: string;
  is_active: boolean;
}

@Component({
  selector: 'app-ticket-type-master',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TextareaModule,
    TableModule, TagModule, TooltipModule, SkeletonModule, ToggleSwitchModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Ticket Types"
      subtitle="Configure different ticket types for categorization"
      [breadcrumbs]="['Home', 'Masters', 'Ticket Types']"
    >
      @if (isAdmin()) {
        <p-button label="Add Type" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search ticket types..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} types</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="32px" height="32px" borderRadius="8px" />
              <p-skeleton width="160px" height="1rem" />
              <p-skeleton width="100px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-ticket" title="No ticket types found"
          [description]="searchQuery ? 'No types match your search.' : 'Add your first ticket type.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Type' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Slug</th>
              <th>Description</th>
              <th>Status</th>
              @if (isAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td>
                <div class="flex items-center gap-2">
                  @if (item.icon) {
                    <i [class]="item.icon + ' text-primary-500'"></i>
                  }
                  <span class="font-medium text-surface-900">{{ item.name }}</span>
                </div>
              </td>
              <td class="font-mono text-xs text-surface-500">{{ item.slug }}</td>
              <td class="text-surface-600 text-sm max-w-xs truncate">{{ item.description || '—' }}</td>
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

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Ticket Type' : 'Add Ticket Type'"
      [modal]="true" [style]="{ width: '480px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Incident" (ngModelChange)="autoSlug()" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Slug</label>
          <input pInputText [(ngModel)]="form.slug" placeholder="incident" class="w-full font-mono text-sm" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Icon class</label>
          <div class="flex items-center gap-2">
            <input pInputText [(ngModel)]="form.icon" placeholder="pi pi-ticket" class="flex-1" />
            @if (form.icon) { <i [class]="form.icon + ' text-2xl text-primary-500'"></i> }
          </div>
          <span class="text-xs text-surface-400">Use PrimeIcons class (e.g. pi pi-ticket)</span>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Description</label>
          <textarea pTextarea [(ngModel)]="form.description" placeholder="Brief description..." rows="3" class="w-full"></textarea>
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
            [disabled]="!form.name" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class TicketTypeMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<TicketTypeItem[]>([]);
  readonly filteredItems = signal<TicketTypeItem[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: TicketTypeItem | null = null;
  protected form: TicketTypeForm = this.defaultForm();

  ngOnInit(): void { this.load(); }

  private defaultForm(): TicketTypeForm {
    return { name: '', slug: '', description: '', icon: 'pi pi-ticket', is_active: true };
  }

  protected autoSlug(): void {
    this.form.slug = this.form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i =>
      i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
    ) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('ticket_types').select('id, name, slug, description, icon, is_active, created_at').order('name');
      if (error) throw error;
      this.items.set((data ?? []) as TicketTypeItem[]);
      this.filteredItems.set((data ?? []) as TicketTypeItem[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: TicketTypeItem): void {
    this.editingItem = item;
    this.form = { name: item.name, slug: item.slug, description: item.description ?? '', icon: item.icon ?? '', is_active: item.is_active };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim()) { this.toastService.error('Name is required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = { name: this.form.name.trim(), slug: this.form.slug || this.form.name.toLowerCase().replace(/\s+/g, '_'),
        description: this.form.description || null, icon: this.form.icon || null, is_active: this.form.is_active };
      const { error } = this.editingItem
        ? await this.supabase.from('ticket_types').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('ticket_types').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Updated.' : 'Created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: TicketTypeItem): void {
    this.confirmationService.confirm({
      message: `Delete ticket type <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('ticket_types').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
