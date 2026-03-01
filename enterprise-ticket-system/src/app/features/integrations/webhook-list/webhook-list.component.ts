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
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ConfirmationService } from 'primeng/api';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface WebhookForm {
  name: string;
  url: string;
  secret: string;
  is_active: boolean;
  events: string[];
}

const WEBHOOK_EVENTS = [
  { label: 'Ticket Created', value: 'ticket.created' },
  { label: 'Ticket Updated', value: 'ticket.updated' },
  { label: 'Ticket Resolved', value: 'ticket.resolved' },
  { label: 'Ticket Closed', value: 'ticket.closed' },
  { label: 'Comment Added', value: 'comment.added' },
  { label: 'SLA Breached', value: 'sla.breached' },
  { label: 'Escalation Triggered', value: 'escalation.triggered' },
];

@Component({
  selector: 'app-webhook-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
    TableModule, TagModule, TooltipModule, SkeletonModule, ToggleSwitchModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="Webhooks"
      subtitle="Configure outbound webhooks to integrate with external systems"
      [breadcrumbs]="['Home', 'Integrations', 'Webhooks']"
    >
      @if (isSuperAdmin()) {
        <p-button label="Add Webhook" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="180px" height="1rem" />
              <p-skeleton width="280px" height="0.875rem" />
              <p-skeleton width="80px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && items().length === 0) {
        <app-empty-state icon="pi pi-send" title="No webhooks configured"
          description="Add a webhook to send event notifications to external systems."
          [actionLabel]="isSuperAdmin() ? 'Add Webhook' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && items().length > 0) {
        <p-table [value]="items()" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Events</th>
              <th>Status</th>
              @if (isSuperAdmin()) { <th class="w-32 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td class="font-mono text-xs text-surface-500 max-w-xs truncate">{{ item.url }}</td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @for (ev of (item.events || []); track ev) {
                    <span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{{ ev }}</span>
                  }
                </div>
              </td>
              <td>
                <p-tag [value]="item.is_active ? 'Active' : 'Inactive'"
                  [severity]="item.is_active ? 'success' : 'danger'" />
              </td>
              @if (isSuperAdmin()) {
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <p-button icon="pi pi-send" [rounded]="true" [text]="true" severity="secondary"
                      size="small" pTooltip="Test Webhook" (onClick)="testWebhook(item)" />
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

    <p-dialog [(visible)]="dialogVisible" [header]="editingItem ? 'Edit Webhook' : 'Add Webhook'"
      [modal]="true" [style]="{ width: '540px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.name" placeholder="e.g. Slack Notifications" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Endpoint URL <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="form.url" placeholder="https://hooks.example.com/..." class="w-full font-mono text-sm" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Secret (optional)</label>
          <input pInputText [(ngModel)]="form.secret" placeholder="Used to sign payload HMAC-SHA256" class="w-full font-mono text-sm" />
          <span class="text-xs text-surface-400">Leave blank to skip signature verification.</span>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Events <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-2 gap-2 p-3 border border-surface-200 rounded-lg">
            @for (event of webhookEvents; track event.value) {
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [checked]="form.events.includes(event.value)"
                  (change)="toggleEvent(event.value)" />
                <span class="text-sm text-surface-700">{{ event.label }}</span>
              </label>
            }
          </div>
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
            [disabled]="!form.name || !form.url || !form.events.length" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class WebhookListComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isSuperAdmin = inject(AuthService).isSuperAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<WebhookItem[]>([]);

  protected dialogVisible = false;
  protected editingItem: WebhookItem | null = null;
  protected form: WebhookForm = this.defaultForm();
  protected webhookEvents = WEBHOOK_EVENTS;

  ngOnInit(): void { this.load(); }

  private defaultForm(): WebhookForm {
    return { name: '', url: '', secret: '', is_active: true, events: [] };
  }

  protected toggleEvent(value: string): void {
    const events = this.form.events;
    this.form.events = events.includes(value) ? events.filter(e => e !== value) : [...events, value];
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('webhook_configs').select('*').order('name');
      if (error) throw error;
      this.items.set((data ?? []) as WebhookItem[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load webhooks');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreate(): void { this.editingItem = null; this.form = this.defaultForm(); this.dialogVisible = true; }

  openEdit(item: WebhookItem): void {
    this.editingItem = item;
    this.form = { name: item.name, url: item.url, secret: item.secret ?? '', is_active: item.is_active, events: [...(item.events ?? [])] };
    this.dialogVisible = true;
  }

  closeDialog(): void { this.dialogVisible = false; this.editingItem = null; }

  async testWebhook(item: WebhookItem): Promise<void> {
    const payload = { event: 'webhook.test', timestamp: new Date().toISOString(), data: { message: 'This is a test webhook from Enterprise Ticket System.' } };
    try {
      await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.toastService.success('Test payload sent to webhook URL.');
    } catch {
      this.toastService.error('Failed to send test webhook. Check the URL and try again.');
    }
  }

  async save(): Promise<void> {
    if (!this.form.name.trim() || !this.form.url.trim() || !this.form.events.length) {
      this.toastService.error('Name, URL, and at least one event are required.');
      return;
    }
    this.isSaving.set(true);
    try {
      const payload = {
        name: this.form.name.trim(), url: this.form.url.trim(),
        secret: this.form.secret || null, is_active: this.form.is_active, events: this.form.events,
      };
      const { error } = this.editingItem
        ? await this.supabase.from('webhook_configs').update(payload).eq('id', this.editingItem.id)
        : await this.supabase.from('webhook_configs').insert(payload);
      if (error) throw error;
      this.toastService.success(this.editingItem ? 'Webhook updated.' : 'Webhook created.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(item: WebhookItem): void {
    this.confirmationService.confirm({
      message: `Delete webhook <strong>${item.name}</strong>?`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('webhook_configs').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Webhook deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
