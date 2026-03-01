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

interface RefOption { id: string; name: string; }
interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  default_ticket_type_id: string | null;
  is_active: boolean;
  category: RefOption | null;
  default_ticket_type: RefOption | null;
}
interface CatalogForm {
  name: string;
  description: string;
  category_id: string | null;
  default_ticket_type_id: string | null;
  is_active: boolean;
}

@Component({
  selector: 'app-service-catalog-master',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TextareaModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule, ToggleSwitchModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Service Catalog"
      subtitle="Define services available for user requests"
      [breadcrumbs]="['Home', 'Masters', 'Service Catalog']"
    >
      @if (isAdmin()) {
        <p-button label="Add Service" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search catalog..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} services</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="180px" height="1rem" />
              <p-skeleton width="120px" height="1rem" />
              <p-skeleton width="100px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-book" title="No services found"
          [description]="searchQuery ? 'No services match your search.' : 'Add your first service to the catalog.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Service' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Category</th>
              <th>Default Type</th>
              <th>Description</th>
              <th>Status</th>
              @if (isAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td class="text-surface-600 text-sm">{{ item.category?.name || '—' }}</td>
              <td class="text-surface-600 text-sm">{{ item.default_ticket_type?.name || '—' }}</td>
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

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Service' : 'Add Service'"
      [modal]="true" [style]="{ width: '500px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Password Reset" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Category</label>
          <p-dropdown [(ngModel)]="form.category_id" [options]="categories()" optionLabel="name"
            optionValue="id" placeholder="Select category" [showClear]="true" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Default Ticket Type</label>
          <p-dropdown [(ngModel)]="form.default_ticket_type_id" [options]="ticketTypes()" optionLabel="name"
            optionValue="id" placeholder="Select ticket type" [showClear]="true" class="w-full" />
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
export class ServiceCatalogMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<CatalogItem[]>([]);
  readonly filteredItems = signal<CatalogItem[]>([]);
  readonly categories = signal<RefOption[]>([]);
  readonly ticketTypes = signal<RefOption[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: CatalogItem | null = null;
  protected form: CatalogForm = this.defaultForm();

  ngOnInit(): void { this.load(); this.loadRefs(); }

  private defaultForm(): CatalogForm {
    return { name: '', description: '', category_id: null, default_ticket_type_id: null, is_active: true };
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i => i.name.toLowerCase().includes(q)) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('service_catalog')
        .select('id, name, description, category_id, default_ticket_type_id, is_active, category:categories!category_id(id, name), default_ticket_type:ticket_types!default_ticket_type_id(id, name)')
        .order('name');
      if (error) throw error;
      const items = (data ?? []).map((d: unknown) => {
        const item = d as Record<string, unknown>;
        const cat = item['category'];
        const tt = item['default_ticket_type'];
        return { ...item, category: Array.isArray(cat) ? cat[0] : cat, default_ticket_type: Array.isArray(tt) ? tt[0] : tt } as CatalogItem;
      });
      this.items.set(items);
      this.filteredItems.set(items);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRefs(): Promise<void> {
    const [catRes, ttRes] = await Promise.all([
      this.supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
      this.supabase.from('ticket_types').select('id, name').eq('is_active', true).order('name'),
    ]);
    if (catRes.data) this.categories.set(catRes.data as RefOption[]);
    if (ttRes.data) this.ticketTypes.set(ttRes.data as RefOption[]);
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: CatalogItem): void {
    this.editingItem = item;
    this.form = { name: item.name, description: item.description ?? '', category_id: item.category_id,
      default_ticket_type_id: item.default_ticket_type_id, is_active: item.is_active };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim()) { this.toastService.error('Name is required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = { name: this.form.name.trim(), description: this.form.description || null,
        category_id: this.form.category_id, default_ticket_type_id: this.form.default_ticket_type_id, is_active: this.form.is_active };
      const { error } = this.editingItem
        ? await this.supabase.from('service_catalog').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('service_catalog').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Service updated.' : 'Service created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: CatalogItem): void {
    this.confirmationService.confirm({
      message: `Delete service <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('service_catalog').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Service deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
