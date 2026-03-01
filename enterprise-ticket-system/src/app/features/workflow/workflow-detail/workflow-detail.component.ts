import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface StatusOption { id: string; name: string; color: string; slug: string; }
interface ApprovalRuleOption { id: string; name: string; }

interface WorkflowTransition {
  id: string;
  workflow_id: string;
  from_status_id: string | null;
  to_status_id: string;
  allowed_roles: string[];
  requires_approval: boolean;
  approval_rule_id: string | null;
  from_status?: StatusOption | null;
  to_status?: StatusOption;
}

interface TransitionForm {
  from_status_id: string | null;
  to_status_id: string;
  allowed_roles: string[];
  requires_approval: boolean;
  approval_rule_id: string | null;
}

const ALL_ROLES = [
  { label: 'Super Admin', value: 'super_admin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Agent', value: 'agent' },
  { label: 'End User', value: 'end_user' },
];

@Component({
  selector: 'app-workflow-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DialogModule, ButtonModule, InputTextModule,
    DropdownModule, TableModule, TagModule, TooltipModule, SkeletonModule, ToggleSwitchModule,
    PageHeaderComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-header
      [title]="workflowName()"
      subtitle="Manage status transitions and access rules for this workflow"
      [breadcrumbs]="['Home', 'Workflow Builder', workflowName()]"
    >
      <p-button label="Back" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
        size="small" (onClick)="goBack()" />
      @if (isSuperAdmin()) {
        <p-button label="Add Transition" icon="pi pi-plus" size="small" (onClick)="openAdd()" />
      }
    </app-page-header>

    @if (isLoading()) {
      <div class="bg-white rounded-xl border border-surface-200 p-4 space-y-3">
        @for (i of [1,2,3,4]; track i) {
          <div class="flex items-center gap-4">
            <p-skeleton width="140px" height="1.5rem" borderRadius="999px" />
            <p-skeleton width="24px" height="1rem" />
            <p-skeleton width="140px" height="1.5rem" borderRadius="999px" />
            <p-skeleton width="200px" height="1rem" />
          </div>
        }
      </div>
    }

    @if (!isLoading() && transitions().length === 0) {
      <app-empty-state icon="pi pi-directions" title="No transitions defined"
        description="Add status transitions to define the ticket lifecycle for this workflow."
        [actionLabel]="isSuperAdmin() ? 'Add Transition' : undefined"
        (action)="openAdd()" />
    }

    @if (!isLoading() && transitions().length > 0) {
      <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
        <div class="p-4 border-b border-surface-100">
          <p class="text-sm text-surface-500">
            <strong>{{ transitions().length }}</strong> transition{{ transitions().length !== 1 ? 's' : '' }} defined.
            Transitions control which status changes are allowed and by whom.
          </p>
        </div>
        <p-table [value]="transitions()" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>From Status</th>
              <th></th>
              <th>To Status</th>
              <th>Allowed Roles</th>
              <th>Requires Approval</th>
              @if (isSuperAdmin()) { <th class="w-24 text-center">Actions</th> }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-tr>
            <tr>
              <td>
                @if (tr.from_status) {
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    [style.background-color]="tr.from_status.color">
                    {{ tr.from_status.name }}
                  </span>
                } @else {
                  <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-200 text-surface-600">
                    Initial (any)
                  </span>
                }
              </td>
              <td class="text-surface-400 text-center"><i class="pi pi-arrow-right text-sm"></i></td>
              <td>
                @if (tr.to_status) {
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    [style.background-color]="tr.to_status.color">
                    {{ tr.to_status.name }}
                  </span>
                }
              </td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @for (role of tr.allowed_roles; track role) {
                    <span class="px-1.5 py-0.5 bg-surface-100 text-surface-600 rounded text-xs capitalize">
                      {{ formatRole(role) }}
                    </span>
                  }
                  @if (!tr.allowed_roles?.length) {
                    <span class="text-surface-400 text-sm">All roles</span>
                  }
                </div>
              </td>
              <td>
                @if (tr.requires_approval) {
                  <p-tag value="Required" severity="warn" />
                } @else {
                  <p-tag value="No" severity="secondary" />
                }
              </td>
              @if (isSuperAdmin()) {
                <td class="text-center">
                  <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger"
                    size="small" pTooltip="Delete" (onClick)="confirmDelete(tr)" />
                </td>
              }
            </tr>
          </ng-template>
        </p-table>
      </div>
    }

    <!-- Add Transition Dialog -->
    <p-dialog [(visible)]="dialogVisible" header="Add Transition"
      [modal]="true" [style]="{ width: '500px' }" [draggable]="false" [resizable]="false">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">From Status</label>
          <p-dropdown [(ngModel)]="form.from_status_id" [options]="fromStatusOptions()"
            optionLabel="name" optionValue="id" placeholder="Initial / Any Status"
            [showClear]="true" class="w-full" />
          <span class="text-xs text-surface-400">Leave empty to allow transition from any status (initial).</span>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">To Status <span class="text-red-500">*</span></label>
          <p-dropdown [(ngModel)]="form.to_status_id" [options]="statuses()"
            optionLabel="name" optionValue="id" placeholder="Select target status" class="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-surface-700">Allowed Roles</label>
          <div class="grid grid-cols-2 gap-2">
            @for (role of allRoles; track role.value) {
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [checked]="form.allowed_roles.includes(role.value)"
                  (change)="toggleRole(role.value)" />
                <span class="text-sm text-surface-700">{{ role.label }}</span>
              </label>
            }
          </div>
          <span class="text-xs text-surface-400">Leave unchecked to allow all roles.</span>
        </div>
        <div class="flex items-center gap-3">
          <p-toggleswitch [(ngModel)]="form.requires_approval" />
          <label class="text-sm font-medium text-surface-700">Requires Approval</label>
        </div>
        @if (form.requires_approval) {
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Approval Rule</label>
            <p-dropdown [(ngModel)]="form.approval_rule_id" [options]="approvalRules()"
              optionLabel="name" optionValue="id" placeholder="Select approval rule"
              [showClear]="true" class="w-full" />
          </div>
        }
      </div>
      <ng-template pTemplate="footer">
        <div class="flex items-center justify-end gap-2">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="closeDialog()" />
          <p-button label="Add Transition" [loading]="isSaving()"
            [disabled]="!form.to_status_id" (onClick)="save()" />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class WorkflowDetailComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private confirmationService = inject(ConfirmationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected isSuperAdmin = inject(AuthService).isSuperAdmin;

  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly workflowName = signal('Workflow Detail');
  readonly transitions = signal<WorkflowTransition[]>([]);
  readonly statuses = signal<StatusOption[]>([]);
  readonly approvalRules = signal<ApprovalRuleOption[]>([]);

  readonly fromStatusOptions = computed(() =>
    this.statuses().filter(s => this.form.to_status_id !== s.id)
  );

  protected allRoles = ALL_ROLES;
  protected dialogVisible = false;
  protected form: TransitionForm = this.defaultForm();
  private workflowId = '';

  ngOnInit(): void {
    this.workflowId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
    this.loadRefs();
  }

  private defaultForm(): TransitionForm {
    return { from_status_id: null, to_status_id: '', allowed_roles: [], requires_approval: false, approval_rule_id: null };
  }

  protected formatRole(role: string): string {
    return role.split('_').join(' ');
  }

  protected toggleRole(role: string): void {
    const current = this.form.allowed_roles;
    this.form.allowed_roles = current.includes(role) ? current.filter(r => r !== role) : [...current, role];
  }

  async load(): Promise<void> {
    if (!this.workflowId) return;
    this.isLoading.set(true);
    try {
      const { data: wf, error: wfErr } = await this.supabase
        .from('workflow_definitions').select('id, name').eq('id', this.workflowId).single();
      if (wfErr) throw wfErr;
      this.workflowName.set((wf as { name: string }).name);

      const { data, error } = await this.supabase
        .from('workflow_transitions')
        .select('id, workflow_id, from_status_id, to_status_id, allowed_roles, requires_approval, approval_rule_id')
        .eq('workflow_id', this.workflowId);
      if (error) throw error;

      const allStatuses = this.statuses();
      const transitions = ((data ?? []) as WorkflowTransition[]).map(t => ({
        ...t,
        from_status: t.from_status_id ? allStatuses.find(s => s.id === t.from_status_id) ?? null : null,
        to_status: allStatuses.find(s => s.id === t.to_status_id),
      }));
      this.transitions.set(transitions);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to load');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRefs(): Promise<void> {
    const [statusRes, ruleRes] = await Promise.all([
      this.supabase.from('statuses').select('id, name, color, slug').eq('is_active', true).order('sort_order'),
      this.supabase.from('approval_rules').select('id, name').order('name'),
    ]);
    if (statusRes.data) this.statuses.set(statusRes.data as StatusOption[]);
    if (ruleRes.data) this.approvalRules.set(ruleRes.data as ApprovalRuleOption[]);
    // Reload transitions once statuses are available
    if (this.workflowId && this.transitions().length === 0) this.load();
  }

  goBack(): void { this.router.navigate(['/workflow']); }

  openAdd(): void { this.form = this.defaultForm(); this.dialogVisible = true; }
  closeDialog(): void { this.dialogVisible = false; }

  async save(): Promise<void> {
    if (!this.form.to_status_id) { this.toastService.error('Target status is required.'); return; }
    this.isSaving.set(true);
    try {
      const payload = {
        workflow_id: this.workflowId,
        from_status_id: this.form.from_status_id,
        to_status_id: this.form.to_status_id,
        allowed_roles: this.form.allowed_roles,
        requires_approval: this.form.requires_approval,
        approval_rule_id: this.form.requires_approval ? this.form.approval_rule_id : null,
      };
      const { error } = await this.supabase.from('workflow_transitions').insert(payload);
      if (error) throw error;
      this.toastService.success('Transition added.');
      this.closeDialog();
      await this.load();
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }

  confirmDelete(tr: WorkflowTransition): void {
    this.confirmationService.confirm({
      message: 'Delete this transition?',
      header: 'Confirm Delete', icon: 'pi pi-trash', acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        const { error } = await this.supabase.from('workflow_transitions').delete().eq('id', tr.id);
        if (!error) { this.toastService.success('Transition deleted.'); await this.load(); }
        else this.toastService.error(error.message);
      },
    });
  }
}
