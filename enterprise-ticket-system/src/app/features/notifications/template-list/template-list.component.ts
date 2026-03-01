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
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface NotificationTemplate {
  id: string;
  name: string;
  slug: string;
  channel: string;
  subject: string | null;
  body: string;
  variables: string[];
  created_at: string;
}

interface TemplateForm {
  name: string;
  slug: string;
  channel: string;
  subject: string;
  body: string;
  variables: string;
}

@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule, TextareaModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Notification Templates"
      subtitle="Manage email and in-app notification templates"
      [breadcrumbs]="['Home', 'Notifications', 'Templates']"
    >
      @if (isAdmin()) {
        <p-button label="Add Template" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div class="p-4 border-b border-surface-100 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 z-10 text-sm"></i>
          <input pInputText placeholder="Search templates..." [(ngModel)]="searchQuery"
            (ngModelChange)="filterItems()" class="w-full pl-9" />
        </div>
        <span class="text-sm text-surface-500">{{ filteredItems().length }} templates</span>
      </div>

      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="180px" height="1rem" />
              <p-skeleton width="100px" height="1.5rem" borderRadius="999px" />
              <p-skeleton width="200px" height="1rem" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && filteredItems().length === 0) {
        <app-empty-state icon="pi pi-envelope" title="No notification templates"
          [description]="searchQuery ? 'No templates match your search.' : 'Add your first notification template.'"
          [actionLabel]="!searchQuery && isAdmin() ? 'Add Template' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && filteredItems().length > 0) {
        <p-table [value]="filteredItems()" [paginator]="filteredItems().length > 20" [rows]="20" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">Name <p-sortIcon field="name" /></th>
              <th>Slug</th>
              <th>Channel</th>
              <th>Subject</th>
              <th>Variables</th>
              @if (isAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td class="font-mono text-xs text-surface-500">{{ item.slug }}</td>
              <td>
                <p-tag [value]="item.channel" [severity]="item.channel === 'email' ? 'info' : 'secondary'" />
              </td>
              <td class="text-surface-600 text-sm max-w-xs truncate">{{ item.subject || '—' }}</td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @for (v of (item.variables || []); track v) {
                    <span class="px-1.5 py-0.5 bg-surface-100 text-surface-500 rounded text-xs font-mono">
                      {{ wrapVar(v) }}
                    </span>
                  }
                </div>
              </td>
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

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Template' : 'Add Template'"
      [modal]="true" [style]="{ width: '600px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Template Name <span class="text-red-500">*</span></label>
            <input pInputText [(ngModel)]="form.name" placeholder="e.g. Ticket Assigned"
              (ngModelChange)="autoSlug()" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Slug</label>
            <input pInputText [(ngModel)]="form.slug" placeholder="ticket_assigned" class="w-full font-mono text-sm" />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Channel <span class="text-red-500">*</span></label>
          <p-dropdown [(ngModel)]="form.channel" [options]="channelOptions" optionLabel="label"
            optionValue="value" placeholder="Select channel" class="w-full" />
        </div>
        @if (form.channel === 'email') {
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Email Subject</label>
            <input pInputText [(ngModel)]="form.subject" [attr.placeholder]="subjectPlaceholder" class="w-full" />
          </div>
        }
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Body (Handlebars) <span class="text-red-500">*</span></label>
          <textarea pTextarea [(ngModel)]="form.body" rows="6"
            [attr.placeholder]="bodyPlaceholder"
            class="w-full font-mono text-sm"></textarea>
          <span class="text-xs text-surface-400">Use Handlebars syntax: {{ handlebarsHint }}</span>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Variables (comma-separated)</label>
          <input pInputText [(ngModel)]="form.variables" placeholder="ticket_number, ticket_title, recipient_name, ticket_url" class="w-full" />
          <span class="text-xs text-surface-400">List variable names available in this template.</span>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button [label]="editingItem ? 'Update' : 'Create'" [loading]="isSaving()"
            [disabled]="!form.name || !form.channel || !form.body" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class TemplateListComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isAdmin = inject(AuthService).isAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<NotificationTemplate[]>([]);
  readonly filteredItems = signal<NotificationTemplate[]>([]);

  protected searchQuery = '';
  protected dialogVisible = false;
  protected editingItem: NotificationTemplate | null = null;
  protected form: TemplateForm = this.defaultForm();

  readonly channelOptions = [
    { label: 'Email', value: 'email' },
    { label: 'In-App', value: 'in_app' },
  ];

  ngOnInit(): void { this.load(); }

  private defaultForm(): TemplateForm {
    return { name: '', slug: '', channel: 'email', subject: '', body: '', variables: '' };
  }

  protected wrapVar(v: string): string { return '{{ ' + v + ' }}'; }
  readonly handlebarsHint = '{{ variable_name }}';
  readonly subjectPlaceholder = 'e.g. Ticket {{ticket_number}} has been assigned to you';
  readonly bodyPlaceholder = 'Hi {{recipient_name}},\n\nTicket {{ticket_number}} - {{ticket_title}} has been assigned to you.\n\nView ticket: {{ticket_url}}';

  protected autoSlug(): void {
    if (!this.editingItem) {
      this.form.slug = this.form.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
  }

  protected filterItems(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredItems.set(q
      ? this.items().filter(i => i.name.toLowerCase().includes(q) || i.slug.includes(q) || i.channel.includes(q))
      : this.items());
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('notification_templates').select('*').order('name');
      if (error) throw error;
      this.items.set((data ?? []) as NotificationTemplate[]);
      this.filteredItems.set((data ?? []) as NotificationTemplate[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: NotificationTemplate): void {
    this.editingItem = item;
    this.form = {
      name: item.name, slug: item.slug, channel: item.channel,
      subject: item.subject ?? '', body: item.body,
      variables: (item.variables ?? []).join(', '),
    };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async save(): Promise<void> {
    if (!this.form.name.trim() || !this.form.channel || !this.form.body) {
      this.toastService.error('Name, channel, and body are required.');
      return;
    }
    this.isSaving.set(true);
    try {
      const variables = this.form.variables
        .split(',').map(v => v.trim()).filter(v => v.length > 0);
      const payload = {
        name: this.form.name.trim(),
        slug: this.form.slug || this.form.name.toLowerCase().replace(/\s+/g, '_'),
        channel: this.form.channel,
        subject: this.form.channel === 'email' ? (this.form.subject || null) : null,
        body: this.form.body,
        variables,
      };
      const { error } = this.editingItem
        ? await this.supabase.from('notification_templates').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('notification_templates').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Template updated.' : 'Template created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: NotificationTemplate): void {
    this.confirmationService.confirm({
      message: `Delete template <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('notification_templates').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Template deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
