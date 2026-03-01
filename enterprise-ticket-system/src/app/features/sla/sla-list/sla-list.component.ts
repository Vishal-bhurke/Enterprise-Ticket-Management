import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
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

interface RefOption { id: string; name: string; }

interface SlaPolicyItem {
  id: string;
  name: string;
  priority_id: string | null;
  ticket_type_id: string | null;
  response_time_hours: number;
  resolution_time_hours: number;
  business_hours_id: string | null;
  escalation_matrix_id: string | null;
  created_at: string;
  priority?: RefOption | null;
  ticket_type?: RefOption | null;
  business_hours?: RefOption | null;
}

interface SlaPolicyForm {
  name: string;
  priority_id: string | null;
  ticket_type_id: string | null;
  response_time_hours: number;
  resolution_time_hours: number;
  business_hours_id: string | null;
  escalation_matrix_id: string | null;
}

@Component({
  selector: 'app-sla-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, InputNumberModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="SLA Policies"
      subtitle="Define response and resolution time targets for tickets"
      [breadcrumbs]="['Home', 'SLA Management', 'Policies']"
    >
      @if (isAdmin()) {
        <p-button label="Add Policy" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search policies..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} policies</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="180px" height="1rem" />
              <p-skeleton width="100px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="80px" height="1rem" />
              <p-skeleton width="80px" height="1rem" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-clock" title="No SLA policies"
          [description]="searchQuery ? 'No policies match your search.' : 'Create your first SLA policy.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Policy' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Priority</th>
              <th>Ticket Type</th>
              <th>Response</th>
              <th>Resolution</th>
              <th>Business Hours</th>
              @if (isAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td class="text-surface-600 text-sm">{{ item.priority?.name || '—' }}</td>
              <td class="text-surface-600 text-sm">{{ item.ticket_type?.name || '—' }}</td>
              <td>
                <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                  {{ item.response_time_hours }}h
                </span>
              </td>
              <td>
                <span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-semibold">
                  {{ item.resolution_time_hours }}h
                </span>
              </td>
              <td class="text-surface-600 text-sm">{{ item.business_hours?.name || 'Default (24/7)' }}</td>
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

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit SLA Policy' : 'Add SLA Policy'"
      [modal]="true" [style]="{ width: '540px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Policy Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Critical Priority SLA" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Priority</label>
            <p-dropdown [(ngModel)]="form.priority_id" [options]="priorities()" optionLabel="name"
              optionValue="id" placeholder="Any priority" [showClear]="true" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Ticket Type</label>
            <p-dropdown [(ngModel)]="form.ticket_type_id" [options]="ticketTypes()" optionLabel="name"
              optionValue="id" placeholder="Any type" [showClear]="true" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Response Time (hours) <span class="text-red-500">*</span></label>
            <p-inputnumber [(ngModel)]="form.response_time_hours" [min]="1" [max]="720" placeholder="e.g. 4" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Resolution Time (hours) <span class="text-red-500">*</span></label>
            <p-inputnumber [(ngModel)]="form.resolution_time_hours" [min]="1" [max]="720" placeholder="e.g. 24" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Business Hours</label>
          <p-dropdown [(ngModel)]="form.business_hours_id" [options]="businessHours()" optionLabel="name"
            optionValue="id" placeholder="Default (24/7)" [showClear]="true" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Escalation Matrix</label>
          <p-dropdown [(ngModel)]="form.escalation_matrix_id" [options]="escalationMatrices()" optionLabel="name"
            optionValue="id" placeholder="No escalation" [showClear]="true" class="w-full" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button [label]="editingItem ? 'Update' : 'Create'" [loading]="isSaving()"
            [disabled]="!form.name || !form.response_time_hours || !form.resolution_time_hours" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class SlaListComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<SlaPolicyItem[]>([]);
  readonly filteredItems = signal<SlaPolicyItem[]>([]);
  readonly priorities = signal<RefOption[]>([]);
  readonly ticketTypes = signal<RefOption[]>([]);
  readonly businessHours = signal<RefOption[]>([]);
  readonly escalationMatrices = signal<RefOption[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: SlaPolicyItem | null = null;
  protected form: SlaPolicyForm = this.defaultForm();

  ngOnInit(): void { this.load(); this.loadRefs(); }

  private defaultForm(): SlaPolicyForm {
    return { name: '', priority_id: null, ticket_type_id: null, response_time_hours: 4, resolution_time_hours: 24, business_hours_id: null, escalation_matrix_id: null };
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i => i.name.toLowerCase().includes(q)) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('sla_policies')
        .select('id, name, priority_id, ticket_type_id, response_time_hours, resolution_time_hours, business_hours_id, escalation_matrix_id, created_at, priority:priorities!priority_id(id, name), ticket_type:ticket_types!ticket_type_id(id, name), business_hours:business_hours!business_hours_id(id, name)')
        .order('name');
      if (error) throw error;
      const items = ((data ?? []) as unknown[]).map((d: unknown) => {
        const item = d as Record<string, unknown>;
        const p = item['priority']; const tt = item['ticket_type']; const bh = item['business_hours'];
        return { ...item, priority: Array.isArray(p) ? p[0] : p, ticket_type: Array.isArray(tt) ? tt[0] : tt, business_hours: Array.isArray(bh) ? bh[0] : bh } as SlaPolicyItem;
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
    const [priRes, ttRes, bhRes, emRes] = await Promise.all([
      this.supabase.from('priorities').select('id, name').eq('is_active', true).order('level'),
      this.supabase.from('ticket_types').select('id, name').eq('is_active', true).order('name'),
      this.supabase.from('business_hours').select('id, name').order('name'),
      this.supabase.from('escalation_matrices').select('id, name').order('name'),
    ]);
    if (priRes.data) this.priorities.set(priRes.data as RefOption[]);
    if (ttRes.data) this.ticketTypes.set(ttRes.data as RefOption[]);
    if (bhRes.data) this.businessHours.set(bhRes.data as RefOption[]);
    if (emRes.data) this.escalationMatrices.set(emRes.data as RefOption[]);
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: SlaPolicyItem): void {
    this.editingItem = item;
    this.form = {
      name: item.name, priority_id: item.priority_id, ticket_type_id: item.ticket_type_id,
      response_time_hours: item.response_time_hours, resolution_time_hours: item.resolution_time_hours,
      business_hours_id: item.business_hours_id, escalation_matrix_id: item.escalation_matrix_id,
    };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim()) { this.toastService.error('Name is required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = {
        name: this.form.name.trim(), priority_id: this.form.priority_id, ticket_type_id: this.form.ticket_type_id,
        response_time_hours: this.form.response_time_hours, resolution_time_hours: this.form.resolution_time_hours,
        business_hours_id: this.form.business_hours_id, escalation_matrix_id: this.form.escalation_matrix_id,
      };
      const { error } = this.editingItem
        ? await this.supabase.from('sla_policies').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('sla_policies').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Policy updated.' : 'Policy created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: SlaPolicyItem): void {
    this.confirmationService.confirm({
      message: `Delete SLA policy <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('sla_policies').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Policy deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
