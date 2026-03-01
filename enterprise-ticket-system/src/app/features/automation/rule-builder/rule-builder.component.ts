import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ToastService } from '../../../core/services/toast.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';

interface ConditionRow {
  field: string;
  operator: string;
  value: string;
}

interface ActionRow {
  type: string;
  params: Record<string, string>;
}

interface RuleConditions {
  logic: 'AND' | 'OR';
  rules: ConditionRow[];
}

const TRIGGER_OPTIONS = [
  { label: 'Ticket Created', value: 'ticket_created' },
  { label: 'Ticket Updated', value: 'ticket_updated' },
  { label: 'Status Changed', value: 'status_changed' },
  { label: 'Priority Changed', value: 'priority_changed' },
  { label: 'Ticket Assigned', value: 'ticket_assigned' },
  { label: 'Comment Added', value: 'comment_added' },
  { label: 'SLA Breached', value: 'sla_breached' },
];

const CONDITION_FIELDS = [
  { label: 'Priority', value: 'priority' },
  { label: 'Status', value: 'status' },
  { label: 'Ticket Type', value: 'ticket_type' },
  { label: 'Category', value: 'category' },
  { label: 'Department', value: 'department' },
  { label: 'Assignee', value: 'assignee' },
  { label: 'Tag', value: 'tag' },
  { label: 'Title (contains)', value: 'title' },
];

const CONDITION_OPERATORS = [
  { label: 'equals', value: 'equals' },
  { label: 'not equals', value: 'not_equals' },
  { label: 'contains', value: 'contains' },
  { label: 'in list', value: 'in' },
  { label: 'not in list', value: 'not_in' },
  { label: 'is empty', value: 'is_empty' },
];

const ACTION_TYPES = [
  { label: 'Assign to Agent', value: 'assign_to' },
  { label: 'Assign Round Robin', value: 'assign_round_robin' },
  { label: 'Set Priority', value: 'set_priority' },
  { label: 'Change Status', value: 'change_status' },
  { label: 'Add Tag', value: 'add_tag' },
  { label: 'Send Notification', value: 'send_notification' },
  { label: 'Call Webhook', value: 'call_webhook' },
];

@Component({
  selector: 'app-rule-builder',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ButtonModule, InputTextModule, InputNumberModule,
    DropdownModule, ToggleSwitchModule, TooltipModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      [title]="ruleId ? 'Edit Automation Rule' : 'Create Automation Rule'"
      subtitle="Define triggers, conditions and actions for this rule"
      [breadcrumbs]="['Home', 'Automation Rules', ruleId ? 'Edit' : 'New']"
    >
      <p-button label="Back" icon="pi pi-arrow-left" severity="secondary" [outlined]="true"
        size="small" (onClick)="goBack()" />
    </app-page-header>

    <div class="space-y-4">
      <!-- Basic Info -->
      <div class="bg-white rounded-xl border border-surface-200 p-5">
        <h3 class="font-semibold text-surface-900 mb-4">Basic Information</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Rule Name <span class="text-red-500">*</span></label>
            <input pInputText [(ngModel)]="name" placeholder="e.g. Auto-assign Critical Tickets" class="w-full" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Trigger Event <span class="text-red-500">*</span></label>
            <p-dropdown [(ngModel)]="triggerEvent" [options]="triggerOptions" optionLabel="label"
              optionValue="value" placeholder="Select trigger" class="w-full" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mt-4">
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Run Order</label>
            <p-inputnumber [(ngModel)]="runOrder" [min]="1" [max]="999" placeholder="1" />
            <span class="text-xs text-surface-400">Lower numbers run first.</span>
          </div>
          <div class="flex flex-col gap-4 mt-1">
            <label class="flex items-center gap-3 cursor-pointer">
              <p-toggleswitch [(ngModel)]="stopOnMatch" />
              <span class="text-sm font-medium text-surface-700">Stop processing when matched</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <p-toggleswitch [(ngModel)]="isActive" />
              <span class="text-sm font-medium text-surface-700">Active</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Conditions -->
      <div class="bg-white rounded-xl border border-surface-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-surface-900">Conditions</h3>
          <div class="flex items-center gap-3">
            <span class="text-sm text-surface-500">Match</span>
            <div class="flex rounded-lg border border-surface-200 overflow-hidden">
              <button class="px-3 py-1 text-sm transition-colors"
                [class]="conditionLogic === 'AND' ? 'bg-primary-600 text-white' : 'bg-white text-surface-600 hover:bg-surface-50'"
                (click)="conditionLogic = 'AND'">ALL (AND)</button>
              <button class="px-3 py-1 text-sm transition-colors"
                [class]="conditionLogic === 'OR' ? 'bg-primary-600 text-white' : 'bg-white text-surface-600 hover:bg-surface-50'"
                (click)="conditionLogic = 'OR'">ANY (OR)</button>
            </div>
          </div>
        </div>

        @if (conditions.length === 0) {
          <p class="text-sm text-surface-400 italic py-2">No conditions — rule will always trigger.</p>
        }

        <div class="space-y-2">
          @for (cond of conditions; track $index; let i = $index) {
            <div class="flex items-center gap-2 p-3 bg-surface-50 rounded-lg">
              <p-dropdown [(ngModel)]="cond.field" [options]="conditionFields" optionLabel="label"
                optionValue="value" placeholder="Field" class="flex-1" />
              <p-dropdown [(ngModel)]="cond.operator" [options]="conditionOperators" optionLabel="label"
                optionValue="value" placeholder="Operator" class="w-36" />
              <input pInputText [(ngModel)]="cond.value" placeholder="Value" class="flex-1" />
              <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger"
                size="small" (onClick)="removeCondition(i)" />
            </div>
          }
        </div>
        <p-button label="Add Condition" icon="pi pi-plus" severity="secondary" [outlined]="true"
          size="small" class="mt-3" (onClick)="addCondition()" />
      </div>

      <!-- Actions -->
      <div class="bg-white rounded-xl border border-surface-200 p-5">
        <h3 class="font-semibold text-surface-900 mb-4">Actions</h3>

        @if (actions.length === 0) {
          <p class="text-sm text-surface-400 italic py-2">Add at least one action to execute when conditions match.</p>
        }

        <div class="space-y-2">
          @for (action of actions; track $index; let i = $index) {
            <div class="flex items-start gap-2 p-3 bg-surface-50 rounded-lg">
              <p-dropdown [(ngModel)]="action.type" [options]="actionTypes" optionLabel="label"
                optionValue="value" placeholder="Action type" class="w-52" />
              <div class="flex-1">
                @if (action.type === 'assign_to' || action.type === 'send_notification') {
                  <input pInputText [(ngModel)]="action.params['value']"
                    placeholder="User ID / Notification template slug" class="w-full" />
                }
                @if (action.type === 'set_priority' || action.type === 'change_status' || action.type === 'add_tag') {
                  <input pInputText [(ngModel)]="action.params['value']"
                    placeholder="Value (e.g. critical, in_progress, urgent)" class="w-full" />
                }
                @if (action.type === 'call_webhook') {
                  <input pInputText [(ngModel)]="action.params['url']"
                    placeholder="Webhook URL" class="w-full" />
                }
                @if (action.type === 'assign_round_robin') {
                  <input pInputText [(ngModel)]="action.params['queue_id']"
                    placeholder="Queue ID (optional)" class="w-full" />
                }
              </div>
              <p-button icon="pi pi-times" [rounded]="true" [text]="true" severity="danger"
                size="small" (onClick)="removeAction(i)" />
            </div>
          }
        </div>
        <p-button label="Add Action" icon="pi pi-plus" severity="secondary" [outlined]="true"
          size="small" class="mt-3" (onClick)="addAction()" />
      </div>

      <!-- Save -->
      <div class="flex items-center justify-end gap-3 pb-4">
        <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="goBack()" />
        <p-button [label]="ruleId ? 'Update Rule' : 'Create Rule'" [loading]="isSaving()"
          [disabled]="!name || !triggerEvent" (onClick)="save()" />
      </div>
    </div>
  `,
})
export class RuleBuilderComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);
  private toastService = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly isSaving = signal(false);

  protected ruleId = '';
  protected name = '';
  protected triggerEvent = '';
  protected runOrder = 1;
  protected stopOnMatch = false;
  protected isActive = true;
  protected conditionLogic: 'AND' | 'OR' = 'AND';
  protected conditions: ConditionRow[] = [];
  protected actions: ActionRow[] = [];

  protected triggerOptions = TRIGGER_OPTIONS;
  protected conditionFields = CONDITION_FIELDS;
  protected conditionOperators = CONDITION_OPERATORS;
  protected actionTypes = ACTION_TYPES;

  ngOnInit(): void {
    this.ruleId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.ruleId && this.ruleId !== 'new') {
      this.loadRule();
    }
  }

  private async loadRule(): Promise<void> {
    const { data, error } = await this.supabase.from('automation_rules').select('*').eq('id', this.ruleId).single();
    if (error) { this.toastService.error('Failed to load rule.'); return; }
    const rule = data as { name: string; trigger_event: string; run_order: number; stop_on_match: boolean; is_active: boolean; conditions: RuleConditions; actions: ActionRow[] };
    this.name = rule.name;
    this.triggerEvent = rule.trigger_event;
    this.runOrder = rule.run_order;
    this.stopOnMatch = rule.stop_on_match;
    this.isActive = rule.is_active;
    this.conditionLogic = (rule.conditions as RuleConditions)?.logic ?? 'AND';
    this.conditions = (rule.conditions as RuleConditions)?.rules ?? [];
    this.actions = (rule.actions as ActionRow[]) ?? [];
  }

  addCondition(): void { this.conditions = [...this.conditions, { field: '', operator: 'equals', value: '' }]; }
  removeCondition(i: number): void { this.conditions = this.conditions.filter((_, idx) => idx !== i); }

  addAction(): void { this.actions = [...this.actions, { type: '', params: {} }]; }
  removeAction(i: number): void { this.actions = this.actions.filter((_, idx) => idx !== i); }

  goBack(): void { this.router.navigate(['/automation']); }

  async save(): Promise<void> {
    if (!this.name.trim() || !this.triggerEvent) {
      this.toastService.error('Name and trigger event are required.');
      return;
    }
    this.isSaving.set(true);
    try {
      const payload = {
        name: this.name.trim(),
        trigger_event: this.triggerEvent,
        conditions: { logic: this.conditionLogic, rules: this.conditions },
        actions: this.actions,
        run_order: this.runOrder,
        stop_on_match: this.stopOnMatch,
        is_active: this.isActive,
      };
      const isNew = !this.ruleId || this.ruleId === 'new';
      const { error } = isNew
        ? await this.supabase.from('automation_rules').insert(payload)
        : await this.supabase.from('automation_rules').update(payload).eq('id', this.ruleId);
      if (error) throw error;
      this.toastService.success(isNew ? 'Rule created.' : 'Rule updated.');
      this.router.navigate(['/automation']);
    } catch (err: unknown) {
      this.toastService.error((err as Error).message ?? 'Failed to save');
    } finally {
      this.isSaving.set(false);
    }
  }
}
