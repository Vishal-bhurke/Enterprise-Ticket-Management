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

interface AgentOption { id: string; full_name: string; }
interface QueueItem {
  id: string;
  name: string;
  description: string | null;
  team_lead_id: string | null;
  is_active: boolean;
  team_lead: AgentOption | null;
}
interface QueueForm {
  name: string;
  description: string;
  team_lead_id: string | null;
  is_active: boolean;
}

@Component({
  selector: 'app-queue-master',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TextareaModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule, ToggleSwitchModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Queues"
      subtitle="Manage ticket queues and assign team leads"
      [breadcrumbs]="['Home', 'Masters', 'Queues']"
    >
      @if (isAdmin()) {
        <p-button label="Add Queue" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search queues..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} queues</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="160px" height="1rem" />
              <p-skeleton width="200px" height="1rem" />
              <p-skeleton width="120px" height="1rem" />
              <p-skeleton width="80px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-list" title="No queues found"
          [description]="searchQuery ? 'No queues match your search.' : 'Add your first queue.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Queue' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Description</th>
              <th>Team Lead</th>
              <th>Status</th>
              @if (isAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td class="text-surface-600 text-sm max-w-xs truncate">{{ item.description || '—' }}</td>
              <td>
                @if (item.team_lead) {
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                      <span class="text-xs font-semibold text-primary-700">{{ item.team_lead.full_name.charAt(0) }}</span>
                    </div>
                    <span class="text-sm text-surface-700">{{ item.team_lead.full_name }}</span>
                  </div>
                } @else { <span class="text-surface-400 text-sm">—</span> }
              </td>
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

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Queue' : 'Add Queue'"
      [modal]="true" [style]="{ width: '480px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Queue Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. IT Support Queue" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Description</label>
          <textarea pTextarea [(ngModel)]="form.description" placeholder="Brief description..." rows="3" class="w-full"></textarea>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Team Lead</label>
          <p-dropdown [(ngModel)]="form.team_lead_id" [options]="agents()" optionLabel="full_name"
            optionValue="id" placeholder="Select team lead" [showClear]="true" [filter]="true" filterBy="full_name" class="w-full" />
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
export class QueueMasterComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<QueueItem[]>([]);
  readonly filteredItems = signal<QueueItem[]>([]);
  readonly agents = signal<AgentOption[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: QueueItem | null = null;
  protected form: QueueForm = this.defaultForm();

  ngOnInit(): void { this.load(); this.loadAgents(); }

  private defaultForm(): QueueForm { return { name: '', description: '', team_lead_id: null, is_active: true }; }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q ? this.items().filter(i =>
      i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
    ) : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('queues')
        .select('id, name, description, team_lead_id, is_active, team_lead:profiles!team_lead_id(id, full_name)').order('name');
      if (error) throw error;
      const items = (data ?? []).map((d: unknown) => {
        const item = d as Record<string, unknown>;
        const tl = item['team_lead'];
        return { ...item, team_lead: Array.isArray(tl) ? tl[0] : tl } as QueueItem;
      });
      this.items.set(items);
      this.filteredItems.set(items);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load queues');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadAgents(): Promise<void> {
    const { data } = await this.supabase.from('profiles').select('id, full_name').eq('is_active', true).order('full_name');
    if (data) this.agents.set(data as AgentOption[]);
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: QueueItem): void {
    this.editingItem = item;
    this.form = { name: item.name, description: item.description ?? '', team_lead_id: item.team_lead_id, is_active: item.is_active };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim()) { this.toastService.error('Name is required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = { name: this.form.name.trim(), description: this.form.description || null,
        team_lead_id: this.form.team_lead_id, is_active: this.form.is_active };
      const { error } = this.editingItem
        ? await this.supabase.from('queues').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('queues').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Queue updated.' : 'Queue created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: QueueItem): void {
    this.confirmationService.confirm({
      message: `Delete queue <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('queues').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Queue deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
