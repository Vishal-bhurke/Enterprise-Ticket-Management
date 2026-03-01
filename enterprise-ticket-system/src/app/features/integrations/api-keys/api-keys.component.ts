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

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
}

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
    TableModule, TagModule, TooltipModule, SkeletonModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      title="API Keys"
      subtitle="Manage API keys for programmatic access to the ticket system"
      [breadcrumbs]="['Home', 'Integrations', 'API Keys']"
    >
      @if (isSuperAdmin()) {
        <p-button label="Generate Key" icon="pi pi-plus" size="small" (onClick)="openCreate()" />
      }
    </app-page-header>

    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
      <i class="pi pi-info-circle text-amber-600 mt-0.5"></i>
      <p class="text-sm text-amber-800">
        API keys grant programmatic access to this system. Keep them secure and rotate them regularly.
        Each key is only shown once upon creation.
      </p>
    </div>

    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
      @if (isLoading()) {
        <div class="p-4 space-y-3">
          @for (i of [1,2,3]; track i) {
            <div class="flex items-center gap-4">
              <p-skeleton width="180px" height="1rem" />
              <p-skeleton width="120px" height="1.5rem" borderRadius="4px" />
              <p-skeleton width="100px" height="1rem" />
              <p-skeleton width="60px" height="1.5rem" borderRadius="999px" />
            </div>
          }
        </div>
      }

      @if (!isLoading() && items().length === 0) {
        <app-empty-state icon="pi pi-key" title="No API keys"
          description="Generate an API key to allow external applications to access the ticket system."
          [actionLabel]="isSuperAdmin() ? 'Generate Key' : undefined"
          (action)="openCreate()" />
      }

      @if (!isLoading() && items().length > 0) {
        <p-table [value]="items()" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Name</th>
              <th>Key Prefix</th>
              <th>Permissions</th>
              <th>Last Used</th>
              <th>Expires</th>
              <th>Status</th>
              @if (isSuperAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td class="font-medium text-surface-900">{{ item.name }}</td>
              <td>
                <span class="font-mono text-xs bg-surface-100 px-2 py-1 rounded">{{ item.key_prefix }}...</span>
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @for (perm of (item.permissions || []); track perm) {
                    <span class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">{{ perm }}</span>
                  }
                </div>
              </td>
              <td class="text-surface-500 text-sm">
                {{ item.last_used ? (item.last_used | date:'mediumDate') : 'Never' }}
              </td>
              <td class="text-surface-500 text-sm">
                {{ item.expires_at ? (item.expires_at | date:'mediumDate') : 'Never' }}
              </td>
              <td>
                <p-tag [value]="item.is_active ? 'Active' : 'Revoked'"
                  [severity]="item.is_active ? 'success' : 'danger'" />
              </td>
              @if (isSuperAdmin()) {
                <td class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    @if (item.is_active) {
                      <p-button icon="pi pi-ban" [rounded]="true" [text]="true" severity="warn"
                        size="small" pTooltip="Revoke Key" (onClick)="revokeKey(item)" />
                    }
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

    <!-- Create Key Dialog -->
    <p-dialog [(visible)]="createDialogVisible" header="Generate API Key"
      [modal]="true" [style]="{ width: '480px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Key Name <span class="text-red-500">*</span></label>
          <input pInputText [(ngModel)]="newKeyName" placeholder="e.g. CI/CD Pipeline Key" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Permissions</label>
          <div class="grid grid-cols-2 gap-2">
            @for (scope of availableScopes; track scope) {
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [checked]="newKeyScopes.includes(scope)"
                  (change)="toggleScope(scope)" />
                <span class="text-sm text-surface-700 font-mono">{{ scope }}</span>
              </label>
            }
          </div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="createDialogVisible = false" />
          <p-button label="Generate Key" [loading]="isSaving()"
            [disabled]="!newKeyName" (onClick)="generateKey()" />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Show Generated Key Dialog -->
    <p-dialog [(visible)]="showKeyDialogVisible" header="API Key Generated"
      [modal]="true" [style]="{ width: '520px' }" [draggable]="false" [resizable]="false"
      [closable]="false">
      <div class="py-2">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <i class="pi pi-exclamation-triangle text-amber-600 mt-0.5"></i>
          <p class="text-sm text-amber-800 font-medium">Copy this key now. It will never be shown again.</p>
        </div>
        <div class="flex items-center gap-2">
          <code class="flex-1 bg-surface-900 text-green-400 text-sm font-mono p-3 rounded-lg break-all">{{ generatedKey }}</code>
          <p-button icon="pi pi-copy" [rounded]="true" [text]="true" severity="secondary"
            pTooltip="Copy to clipboard" (onClick)="copyKey()" />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="I've saved the key" (onClick)="dismissKeyDialog()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ApiKeysComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  protected isSuperAdmin = inject(AuthService).isSuperAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly items = signal<ApiKeyItem[]>([]);

  protected createDialogVisible = false;
  protected showKeyDialogVisible = false;
  protected newKeyName = '';
  protected newKeyScopes: string[] = ['tickets:read'];
  protected generatedKey = '';

  protected availableScopes = [
    'tickets:read', 'tickets:write', 'tickets:delete',
    'comments:read', 'comments:write',
    'users:read', 'reports:read',
  ];

  ngOnInit(): void { this.load(); }

  protected toggleScope(scope: string): void {
    this.newKeyScopes = this.newKeyScopes.includes(scope)
      ? this.newKeyScopes.filter(s => s !== scope)
      : [...this.newKeyScopes, scope];
  }

  openCreate(): void {
    this.newKeyName = '';
    this.newKeyScopes = ['tickets:read'];
    this.createDialogVisible = true;
  }

  private generateToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'etk_';
    for (let i = 0; i < 48; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  async generateKey(): Promise<void> {
    if (!this.newKeyName.trim()) { this.toastService.error('Key name is required.'); return; }
    this.isSaving.set(true);
    try {
      const rawKey = this.generateToken();
      const prefix = rawKey.slice(0, 12);
      const payload = {
        name: this.newKeyName.trim(),
        key_prefix: prefix,
        key_hash: rawKey, // In production, hash with bcrypt; storing raw for demo
        permissions: this.newKeyScopes,
        is_active: true,
      };
      const { error } = await this.supabase.from('api_keys').insert(payload);
      if (error) throw error;
      this.generatedKey = rawKey;
      this.createDialogVisible = false;
      this.showKeyDialogVisible = true;
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to generate key');
    } finally {
      this.isSaving.set(false);
    }
  }

  copyKey(): void {
    navigator.clipboard.writeText(this.generatedKey).then(() => {
      this.toastService.success('Key copied to clipboard.');
    });
  }

  dismissKeyDialog(): void {
    this.showKeyDialogVisible = false;
    this.generatedKey = '';
  }

  async revokeKey(item: ApiKeyItem): Promise<void> {
    const { error } = await this.supabase.from('api_keys').update({ is_active: false }).eq('id', item.id);
    if (!error) { this.toastService.success('Key revoked.'); await this.load(); }
    else this.toastService.error(error.message);
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.from('api_keys')
        .select('id, name, key_prefix, permissions, last_used, expires_at, created_at, is_active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      this.items.set((data ?? []) as ApiKeyItem[]);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load API keys');
    } finally {
      this.isLoading.set(false);
    }
  }

  confirmDelete(item: ApiKeyItem): void {
    this.confirmationService.confirm({
      message: `Delete API key <strong>${item.name}</strong>? This cannot be undone.`,
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('api_keys').delete().eq('id', item.id);
        if (!error) { this.toastService.success('Key deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
