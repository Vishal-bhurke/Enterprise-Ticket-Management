import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.client';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  entity_type: string;
  action: string;
  created_at: string;
  actor: { full_name: string; email: string } | null;
}

interface MasterStatus {
  roles: number;
  departments: number;
  categories: number;
  priorities: number;
  statuses: number;
  ticket_types: number;
  queues: number;
  sla_policies: number;
  business_hours: number;
  automation_rules: number;
}

interface SystemStats {
  totalUsers: number;
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  escalatedTickets: number;
  slaCompliancePercent: number;
  activeAutomations: number;
  activeWebhooks: number;
  activeApiKeys: number;
  recentAuditLogs: AuditEntry[];
  masterStatus: MasterStatus;
}

// ─── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    SkeletonModule,
    TooltipModule,
    PageHeaderComponent,
    MetricCardComponent,
    ErrorBannerComponent,
    TimeAgoPipe,
  ],
  template: `
    <div class="p-4 sm:p-6">

      <app-page-header
        title="System Overview"
        subtitle="Executive control center — system health at a glance"
        [breadcrumbs]="['Home', 'Overview']"
      >
        <p-button
          label="System Guide"
          icon="pi pi-book"
          severity="primary"
          [outlined]="true"
          size="small"
          (onClick)="openGuide()"
        />
        <p-button
          label="Refresh"
          icon="pi pi-refresh"
          severity="secondary"
          [outlined]="true"
          size="small"
          [loading]="isLoading()"
          (onClick)="loadStats()"
        />
      </app-page-header>

      <!-- ── System Guide Dialog ─────────────────────────────────────────────── -->
      <p-dialog
        [(visible)]="guideVisible"
        [modal]="true"
        [draggable]="false"
        [resizable]="false"
        [closable]="true"
        [style]="{ width: '860px', 'max-width': '95vw' }"
      >
        <!-- Dialog header with progress -->
        <ng-template pTemplate="header">
          <div class="w-full">
            <!-- Title row -->
            <div class="flex items-center gap-3 mb-3">
              <div class="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="pi pi-book text-primary-600 text-base"></i>
              </div>
              <div>
                <h2 class="text-base font-bold text-surface-900">System Guide</h2>
                <p class="text-xs text-surface-500">Step {{ currentStep() + 1 }} of {{ totalSteps }} — Complete Application Flow</p>
              </div>
            </div>
            <!-- Progress bar -->
            <div class="h-1.5 bg-surface-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-500 rounded-full transition-all duration-500 ease-in-out"
                [style.width.%]="guideProgress()"
              ></div>
            </div>
            <!-- Step dot indicators -->
            <div class="flex items-center justify-center gap-1.5 mt-3">
              @for (i of stepIndices; track i) {
                <button
                  type="button"
                  class="rounded-full transition-all duration-200 cursor-pointer"
                  [class]="i === currentStep()
                    ? 'w-5 h-2 bg-primary-500'
                    : 'w-2 h-2 bg-surface-300 hover:bg-surface-400'"
                  (click)="currentStep.set(i)"
                  [attr.aria-label]="'Go to step ' + (i + 1)"
                ></button>
              }
            </div>
          </div>
        </ng-template>

        <!-- Step content -->
        <div class="min-h-[420px] py-2">

          @switch (currentStep()) {

            <!-- ══ STEP 1: Welcome & Architecture ══ -->
            @case (0) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-th-large text-blue-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">Welcome to Enterprise Ticket System</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      A production-ready service management platform modelled after Jira Service Management,
                      Zendesk, and ServiceNow — with full data ownership via Supabase.
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-ticket text-blue-600"></i>
                      <span class="font-semibold text-sm text-blue-800">Ticket Lifecycle</span>
                    </div>
                    <p class="text-xs text-blue-700">Create, assign, track and resolve service requests with full audit history and SLA timers.</p>
                  </div>
                  <div class="bg-violet-50 border border-violet-200 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-sitemap text-violet-600"></i>
                      <span class="font-semibold text-sm text-violet-800">Workflow Engine</span>
                    </div>
                    <p class="text-xs text-violet-700">Define exactly which status transitions are allowed per ticket type and role.</p>
                  </div>
                  <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-clock text-emerald-600"></i>
                      <span class="font-semibold text-sm text-emerald-800">SLA Engine</span>
                    </div>
                    <p class="text-xs text-emerald-700">Auto-apply response and resolution deadlines based on priority and ticket type.</p>
                  </div>
                  <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-bolt text-amber-600"></i>
                      <span class="font-semibold text-sm text-amber-800">Automation Rules</span>
                    </div>
                    <p class="text-xs text-amber-700">Event-driven rules for auto-assignment, notifications, escalations, and webhooks.</p>
                  </div>
                </div>

                <div class="bg-surface-50 border border-surface-200 rounded-lg p-4">
                  <p class="text-sm font-semibold text-surface-700 mb-2">Four Roles in the System</p>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div class="text-center p-2 bg-blue-100 rounded-lg">
                      <div class="font-bold text-blue-800">Super Admin</div>
                      <div class="text-blue-600 mt-0.5">Full control — you</div>
                    </div>
                    <div class="text-center p-2 bg-violet-100 rounded-lg">
                      <div class="font-bold text-violet-800">Admin</div>
                      <div class="text-violet-600 mt-0.5">Operations &amp; users</div>
                    </div>
                    <div class="text-center p-2 bg-emerald-100 rounded-lg">
                      <div class="font-bold text-emerald-800">Agent</div>
                      <div class="text-emerald-600 mt-0.5">Resolves tickets</div>
                    </div>
                    <div class="text-center p-2 bg-amber-100 rounded-lg">
                      <div class="font-bold text-amber-800">End User</div>
                      <div class="text-amber-600 mt-0.5">Raises requests</div>
                    </div>
                  </div>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2 mt-4">
                  <i class="pi pi-lightbulb text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>Where to start:</strong> Complete Steps 2–6 in order before creating your first ticket. The system requires Roles, Priorities, Statuses, and at least one SLA Policy to function correctly.</span>
                </div>
              </div>
            }

            <!-- ══ STEP 2: Core Masters ══ -->
            @case (1) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-database text-violet-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">Configure Core Masters — Do This First</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      Master data is the foundation of the entire system. Tickets, SLA policies, and automation rules all depend on masters being configured before anything else.
                    </p>
                  </div>
                </div>

                <p class="text-sm font-semibold text-surface-700 mb-3">Configure in this exact order:</p>
                <div class="space-y-2 mb-4">
                  @for (master of masterSetupOrder; track master.step) {
                    <div class="flex items-start gap-3 p-3 bg-surface-50 border border-surface-200 rounded-lg">
                      <div class="w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {{ master.step }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-sm font-semibold text-surface-800">{{ master.name }}</span>
                          <span class="text-xs bg-surface-200 text-surface-600 px-1.5 py-0.5 rounded">{{ master.route }}</span>
                        </div>
                        <p class="text-xs text-surface-500 mt-0.5">{{ master.why }}</p>
                      </div>
                    </div>
                  }
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                  <i class="pi pi-lightbulb text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>Why order matters:</strong> Statuses reference Categories. Priorities reference SLA Multipliers. Ticket Types reference Statuses. If you create them out of order, you will hit empty dropdowns during setup.</span>
                </div>
              </div>
            }

            <!-- ══ STEP 3: SLA & Business Hours ══ -->
            @case (2) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-clock text-emerald-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">SLA &amp; Business Hours</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      SLA policies define response and resolution deadlines. Business Hours schedules define when the SLA clock counts — so off-hours don't penalise your team.
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-3 mb-4">
                  <div class="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <div class="w-8 h-8 bg-emerald-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <i class="pi pi-sun text-emerald-700 text-sm"></i>
                    </div>
                    <div class="text-xs font-bold text-emerald-800">1. Business Hours</div>
                    <div class="text-xs text-emerald-600 mt-1">Create schedule first<br/>(e.g. Mon–Fri 9–6 IST)</div>
                  </div>
                  <i class="pi pi-arrow-right text-surface-400 flex-shrink-0"></i>
                  <div class="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <div class="w-8 h-8 bg-emerald-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <i class="pi pi-clock text-emerald-700 text-sm"></i>
                    </div>
                    <div class="text-xs font-bold text-emerald-800">2. SLA Policy</div>
                    <div class="text-xs text-emerald-600 mt-1">Link to Priority + Business Hours schedule</div>
                  </div>
                  <i class="pi pi-arrow-right text-surface-400 flex-shrink-0"></i>
                  <div class="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <div class="w-8 h-8 bg-emerald-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <i class="pi pi-check-circle text-emerald-700 text-sm"></i>
                    </div>
                    <div class="text-xs font-bold text-emerald-800">3. Auto-Applied</div>
                    <div class="text-xs text-emerald-600 mt-1">System applies SLA to every new ticket automatically</div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div class="bg-surface-50 border border-surface-200 rounded-lg p-4">
                    <p class="text-xs font-bold text-surface-700 mb-2">SLA Policy Fields</p>
                    <ul class="space-y-1 text-xs text-surface-600">
                      <li class="flex items-center gap-2"><i class="pi pi-check text-emerald-500 text-xs"></i>Priority (Critical / High / Medium / Low)</li>
                      <li class="flex items-center gap-2"><i class="pi pi-check text-emerald-500 text-xs"></i>Response Time (hours)</li>
                      <li class="flex items-center gap-2"><i class="pi pi-check text-emerald-500 text-xs"></i>Resolution Time (hours)</li>
                      <li class="flex items-center gap-2"><i class="pi pi-check text-emerald-500 text-xs"></i>Business Hours Schedule</li>
                      <li class="flex items-center gap-2"><i class="pi pi-check text-emerald-500 text-xs"></i>Optional: Ticket Type filter</li>
                    </ul>
                  </div>
                  <div class="bg-surface-50 border border-surface-200 rounded-lg p-4">
                    <p class="text-xs font-bold text-surface-700 mb-2">How SLA Clock Works</p>
                    <ul class="space-y-1 text-xs text-surface-600">
                      <li class="flex items-center gap-2"><i class="pi pi-circle-fill text-blue-400 text-xs"></i>Starts when ticket is created</li>
                      <li class="flex items-center gap-2"><i class="pi pi-circle-fill text-amber-400 text-xs"></i>Pauses when status = Pending</li>
                      <li class="flex items-center gap-2"><i class="pi pi-circle-fill text-emerald-400 text-xs"></i>Resumes on In Progress / Open</li>
                      <li class="flex items-center gap-2"><i class="pi pi-circle-fill text-red-400 text-xs"></i>Breach → automation fires</li>
                      <li class="flex items-center gap-2"><i class="pi pi-circle-fill text-surface-400 text-xs"></i>Stops when Resolved/Closed</li>
                    </ul>
                  </div>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                  <i class="pi pi-lightbulb text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>Best practice:</strong> Create one SLA policy per priority level. For Critical tickets, use a short response time (e.g. 1 hour, 4 hour resolution). SLA policies created after tickets are created do not apply retroactively.</span>
                </div>
              </div>
            }

            <!-- ══ STEP 4: Workflow Builder ══ -->
            @case (3) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-sitemap text-purple-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">Workflow Builder</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      Workflows define which status transitions are allowed — preventing agents from jumping directly from Open to Closed without going through Resolved, for example.
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p class="text-sm font-semibold text-surface-700 mb-2">Setup Steps</p>
                    <ol class="space-y-2">
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <span class="text-surface-600">Go to <span class="font-mono text-xs bg-surface-100 px-1 rounded">Sidebar → Workflow Builder</span></span>
                      </li>
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <span class="text-surface-600">Click <strong>+ New Workflow</strong>, give it a name (e.g. "Standard IT Workflow") and toggle <strong>Is Default</strong> ON</span>
                      </li>
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <span class="text-surface-600">Add transitions: From Status → To Status, specify allowed roles</span>
                      </li>
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-purple-100 text-purple-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                        <span class="text-surface-600">Go to <strong>Masters → Ticket Types</strong> and assign the workflow to each ticket type</span>
                      </li>
                    </ol>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-surface-700 mb-2">Common Transitions</p>
                    <div class="space-y-1.5">
                      @for (t of commonTransitions; track t.from) {
                        <div class="flex items-center gap-2 text-xs bg-surface-50 border border-surface-100 rounded px-2 py-1.5">
                          <span class="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{{ t.from }}</span>
                          <i class="pi pi-arrow-right text-surface-400 text-xs"></i>
                          <span class="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">{{ t.to }}</span>
                          <span class="text-surface-400 ml-auto">{{ t.roles }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                  <i class="pi pi-lightbulb text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>Optional but recommended:</strong> Leave workflow blank for early testing — all transitions are allowed by default. Add workflow restrictions once your team is trained on the process.</span>
                </div>
              </div>
            }

            <!-- ══ STEP 5: Automation Rules ══ -->
            @case (4) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-bolt text-amber-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">Automation Rules</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      Automation rules fire automatically when ticket events occur. They follow a simple Trigger → Condition → Action model.
                    </p>
                  </div>
                </div>

                <!-- Model diagram -->
                <div class="flex items-center gap-2 mb-4">
                  <div class="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <i class="pi pi-play text-amber-600 mb-1 block"></i>
                    <div class="text-xs font-bold text-amber-800">Trigger Event</div>
                    <div class="text-xs text-amber-600 mt-1">ticket_created<br/>sla_breached<br/>status_changed</div>
                  </div>
                  <i class="pi pi-arrow-right text-surface-400 flex-shrink-0"></i>
                  <div class="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <i class="pi pi-filter text-blue-600 mb-1 block"></i>
                    <div class="text-xs font-bold text-blue-800">Conditions</div>
                    <div class="text-xs text-blue-600 mt-1">priority = Critical<br/>status = Open<br/>tag contains vip</div>
                  </div>
                  <i class="pi pi-arrow-right text-surface-400 flex-shrink-0"></i>
                  <div class="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <i class="pi pi-bolt text-emerald-600 mb-1 block"></i>
                    <div class="text-xs font-bold text-emerald-800">Actions</div>
                    <div class="text-xs text-emerald-600 mt-1">assign_to agent<br/>send_notification<br/>call_webhook</div>
                  </div>
                </div>

                <p class="text-sm font-semibold text-surface-700 mb-2">5 Common Automation Examples</p>
                <div class="space-y-1.5">
                  @for (ex of automationExamples; track ex.name) {
                    <div class="flex items-start gap-2 p-2.5 bg-surface-50 border border-surface-100 rounded-lg text-xs">
                      <i [class]="'pi ' + ex.icon + ' text-amber-500 flex-shrink-0 mt-0.5'"></i>
                      <div>
                        <span class="font-semibold text-surface-800">{{ ex.name }}</span>
                        <span class="text-surface-500 ml-1">— {{ ex.desc }}</span>
                      </div>
                    </div>
                  }
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2 mt-4">
                  <i class="pi pi-lightbulb text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>Best practice:</strong> Test new rules on a Low priority test ticket with "Stop on match" OFF. This lets you see all rules that would fire without side effects.</span>
                </div>
              </div>
            }

            <!-- ══ STEP 6: User Management ══ -->
            @case (5) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-users text-sky-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">Add &amp; Manage Your Team</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      Invite agents and admins through the Masters → Users tab. Each new user receives a Supabase email invitation to set their password.
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p class="text-sm font-semibold text-surface-700 mb-2">How to Add a User</p>
                    <ol class="space-y-2">
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-sky-100 text-sky-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                        <span class="text-surface-600">Go to <strong>Masters → Users</strong></span>
                      </li>
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-sky-100 text-sky-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                        <span class="text-surface-600">Click <strong>+ Add User</strong></span>
                      </li>
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-sky-100 text-sky-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                        <span class="text-surface-600">Fill in Full Name, Email, Role, Department</span>
                      </li>
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-sky-100 text-sky-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                        <span class="text-surface-600">Click <strong>Save</strong> — invitation email is sent automatically</span>
                      </li>
                      <li class="flex items-start gap-2 text-sm">
                        <span class="w-5 h-5 bg-sky-100 text-sky-700 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
                        <span class="text-surface-600">User clicks link, sets password, and logs in</span>
                      </li>
                    </ol>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-surface-700 mb-2">Role Capabilities</p>
                    <div class="space-y-2">
                      @for (role of roleCapabilities; track role.name) {
                        <div class="flex items-start gap-2 p-2 bg-surface-50 border border-surface-100 rounded-lg">
                          <div class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" [style.backgroundColor]="role.color"></div>
                          <div>
                            <span class="text-xs font-bold text-surface-800">{{ role.name }}</span>
                            <span class="text-xs text-surface-500 ml-1">— {{ role.desc }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                  <i class="pi pi-lightbulb text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>Security note:</strong> Never delete the four system roles (super_admin, admin, agent, end_user). They are referenced by RLS policies in the database. Deleting them will break access control for all users.</span>
                </div>
              </div>
            }

            <!-- ══ STEP 7: Ticket Lifecycle ══ -->
            @case (6) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-ticket text-rose-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">Ticket Lifecycle</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      Every ticket moves through a defined set of status stages. Each status belongs to a category that drives SLA behavior, dashboard counts, and automation triggers.
                    </p>
                  </div>
                </div>

                <!-- Status flow diagram -->
                <div class="bg-surface-900 rounded-xl p-4 mb-4 overflow-x-auto">
                  <pre class="text-xs text-surface-100 font-mono leading-relaxed whitespace-pre">{{ ticketLifecycleDiagram }}</pre>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div class="bg-surface-50 border border-surface-200 rounded-lg p-3">
                    <p class="text-xs font-bold text-surface-700 mb-2">Status Categories</p>
                    <div class="space-y-1">
                      @for (sc of statusCategories; track sc.category) {
                        <div class="flex items-center gap-2 text-xs">
                          <div class="w-2 h-2 rounded-full flex-shrink-0" [style.backgroundColor]="sc.color"></div>
                          <span class="font-medium text-surface-700">{{ sc.category }}</span>
                          <span class="text-surface-400">— {{ sc.meaning }}</span>
                        </div>
                      }
                    </div>
                  </div>
                  <div class="bg-surface-50 border border-surface-200 rounded-lg p-3">
                    <p class="text-xs font-bold text-surface-700 mb-2">Key Behaviors</p>
                    <ul class="space-y-1.5 text-xs text-surface-600">
                      <li class="flex items-start gap-1.5">
                        <i class="pi pi-clock text-blue-500 flex-shrink-0 mt-0.5 text-xs"></i>
                        SLA clock pauses when ticket enters <strong>Pending</strong> or <strong>On Hold</strong>
                      </li>
                      <li class="flex items-start gap-1.5">
                        <i class="pi pi-exclamation-triangle text-orange-500 flex-shrink-0 mt-0.5 text-xs"></i>
                        <strong>Escalated</strong> flag is separate from status — it triggers escalation automations
                      </li>
                      <li class="flex items-start gap-1.5">
                        <i class="pi pi-lock text-surface-400 flex-shrink-0 mt-0.5 text-xs"></i>
                        <strong>Closed</strong> tickets are read-only — only Super Admin can reopen
                      </li>
                      <li class="flex items-start gap-1.5">
                        <i class="pi pi-history text-violet-500 flex-shrink-0 mt-0.5 text-xs"></i>
                        Every status change is recorded in the Audit Log automatically
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                  <i class="pi pi-lightbulb text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>Tip:</strong> The Ticket Detail page shows a real-time SLA countdown bar. Green = on track, Amber = under 50% remaining, Red = under 10% or breached.</span>
                </div>
              </div>
            }

            <!-- ══ STEP 8: Notifications & Templates ══ -->
            @case (7) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-bell text-orange-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">Notifications &amp; Templates</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      Eight notification templates are pre-configured. You can customize the body text using Handlebars-style placeholders without any code changes.
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <p class="text-xs font-bold text-surface-700 mb-2">Seeded Templates</p>
                    <div class="space-y-1">
                      @for (tmpl of notificationTemplates; track tmpl.name) {
                        <div class="flex items-center gap-2 text-xs p-2 bg-surface-50 border border-surface-100 rounded">
                          <i class="pi pi-envelope text-surface-400 text-xs"></i>
                          <span class="font-medium text-surface-700 flex-1">{{ tmpl.name }}</span>
                          <span class="text-surface-400">{{ tmpl.channel }}</span>
                        </div>
                      }
                    </div>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-surface-700 mb-2">Template Variables</p>
                    <div class="bg-surface-900 rounded-lg p-3">
                      <pre class="text-xs text-green-400 font-mono leading-relaxed">{{ templateVarsExample }}</pre>
                    </div>
                    <p class="text-xs text-surface-500 mt-2">Use these placeholders in the template body — they are replaced with live ticket data when the notification fires.</p>
                  </div>
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                  <i class="pi pi-lightbulb text-amber-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>Where to edit:</strong> Go to <strong>Notifications → Templates</strong> in the sidebar. Each template has a Name, Event Type, Channel (in-app / email), Subject, and Body field.</span>
                </div>
              </div>
            }

            <!-- ══ STEP 9: Integrations & Going Live ══ -->
            @case (8) {
              <div class="animate-fade-in">
                <div class="flex items-start gap-4 mb-5">
                  <div class="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i class="pi pi-link text-teal-600 text-xl"></i>
                  </div>
                  <div>
                    <h3 class="text-lg font-bold text-surface-900">Integrations &amp; Going Live</h3>
                    <p class="text-sm text-surface-500 mt-1">
                      Connect external systems via outbound Webhooks or grant programmatic access using API Keys. Then run the production readiness checklist before going live.
                    </p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-send text-blue-600"></i>
                      <span class="text-sm font-bold text-blue-800">Webhooks</span>
                    </div>
                    <ul class="space-y-1 text-xs text-blue-700">
                      <li>• POST event payloads to any URL</li>
                      <li>• Subscribe per-event (ticket_created, sla_breached, etc.)</li>
                      <li>• HMAC-SHA256 signature verification</li>
                      <li>• Failure count tracked for alerting</li>
                    </ul>
                  </div>
                  <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-key text-amber-600"></i>
                      <span class="text-sm font-bold text-amber-800">API Keys</span>
                    </div>
                    <ul class="space-y-1 text-xs text-amber-700">
                      <li>• Prefix: etk_ + SHA-256 hash</li>
                      <li>• Per-permission scopes (read/write)</li>
                      <li>• Shown only once at creation</li>
                      <li>• Used in Authorization: Bearer header</li>
                    </ul>
                  </div>
                </div>

                <p class="text-sm font-semibold text-surface-700 mb-2">Production Readiness Checklist</p>
                <div class="space-y-1.5">
                  @for (item of productionChecklist; track item.label) {
                    <div class="flex items-center gap-3 p-2.5 bg-surface-50 border border-surface-100 rounded-lg">
                      <div class="w-4 h-4 border-2 border-surface-300 rounded flex-shrink-0"></div>
                      <div class="text-xs">
                        <span class="font-medium text-surface-800">{{ item.label }}</span>
                        <span class="text-surface-500 ml-1">— {{ item.check }}</span>
                      </div>
                    </div>
                  }
                </div>

                <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800 flex items-start gap-2 mt-4">
                  <i class="pi pi-check-circle text-emerald-600 flex-shrink-0 mt-0.5"></i>
                  <span><strong>You're ready!</strong> Once this checklist is complete, your system is production-ready. Share the login URL with your team and begin creating tickets.</span>
                </div>
              </div>
            }

          }
        </div>

        <!-- Footer navigation -->
        <ng-template pTemplate="footer">
          <div class="flex items-center justify-between w-full">
            <p-button
              label="Previous"
              icon="pi pi-chevron-left"
              severity="secondary"
              [outlined]="true"
              [disabled]="currentStep() === 0"
              (onClick)="prevStep()"
            />
            <span class="text-sm text-surface-500 font-medium">{{ currentStep() + 1 }} / {{ totalSteps }}</span>
            <p-button
              [label]="currentStep() === totalSteps - 1 ? 'Finish' : 'Next'"
              [icon]="currentStep() === totalSteps - 1 ? 'pi pi-check' : 'pi pi-chevron-right'"
              iconPos="right"
              (onClick)="nextStep()"
            />
          </div>
        </ng-template>
      </p-dialog>

      <!-- Error State -->
      @if (error() && !isLoading()) {
        <app-error-banner [message]="error()!" (retry)="loadStats()" />
      }

      @if (!error() || isLoading()) {

        <!-- ── Section 1: System Health Bar ── -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <app-metric-card
            label="Total Users"
            [value]="stats()?.totalUsers ?? 0"
            icon="pi pi-users"
            iconColor="#3B82F6"
            iconBg="#EFF6FF"
            [loading]="isLoading()"
          />
          <app-metric-card
            label="Total Tickets"
            [value]="stats()?.totalTickets ?? 0"
            icon="pi pi-ticket"
            iconColor="#8B5CF6"
            iconBg="#EDE9FE"
            [loading]="isLoading()"
          />
          <app-metric-card
            label="SLA Compliance"
            [value]="stats()?.slaCompliancePercent ?? 0"
            unit="%"
            icon="pi pi-clock"
            iconColor="#10B981"
            iconBg="#D1FAE5"
            [loading]="isLoading()"
          />
          <app-metric-card
            label="Active Automations"
            [value]="stats()?.activeAutomations ?? 0"
            icon="pi pi-bolt"
            iconColor="#F59E0B"
            iconBg="#FEF3C7"
            [loading]="isLoading()"
          />
        </div>

        <!-- ── Section 2 + 3: Ticket Breakdown + Audit Activity ── -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          <!-- Ticket Breakdown -->
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <i class="pi pi-chart-bar text-primary-500"></i>
              Ticket Breakdown
            </h3>
            @if (isLoading()) {
              <div class="space-y-3">
                @for (i of [1, 2, 3, 4]; track i) {
                  <div class="flex items-center justify-between">
                    <p-skeleton width="90px" height="14px" />
                    <p-skeleton width="44px" height="24px" borderRadius="999px" />
                  </div>
                }
              </div>
            } @else {
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span class="text-sm text-surface-700">Open</span>
                  </div>
                  <span class="text-sm font-bold text-surface-900 bg-blue-50 px-3 py-0.5 rounded-full">
                    {{ stats()?.openTickets ?? 0 }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                    <span class="text-sm text-surface-700">In Progress</span>
                  </div>
                  <span class="text-sm font-bold text-surface-900 bg-purple-50 px-3 py-0.5 rounded-full">
                    {{ stats()?.inProgressTickets ?? 0 }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span class="text-sm text-surface-700">Resolved</span>
                  </div>
                  <span class="text-sm font-bold text-surface-900 bg-emerald-50 px-3 py-0.5 rounded-full">
                    {{ stats()?.resolvedTickets ?? 0 }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                    <span class="text-sm text-surface-700">Escalated</span>
                  </div>
                  <span class="text-sm font-bold text-surface-900 bg-orange-50 px-3 py-0.5 rounded-full">
                    {{ stats()?.escalatedTickets ?? 0 }}
                  </span>
                </div>
              </div>
              <a routerLink="/tickets"
                 class="mt-4 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 pt-3 border-t border-surface-100">
                View all tickets <i class="pi pi-arrow-right text-xs"></i>
              </a>
            }
          </div>

          <!-- Recent Audit Activity -->
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <i class="pi pi-history text-surface-500"></i>
              Recent Audit Activity
            </h3>
            @if (isLoading()) {
              <div class="space-y-3">
                @for (i of [1, 2, 3, 4, 5]; track i) {
                  <div class="flex items-start gap-3">
                    <p-skeleton width="64px" height="20px" borderRadius="4px" />
                    <div class="flex-1 space-y-1">
                      <p-skeleton width="100px" height="14px" />
                      <p-skeleton width="80px" height="12px" />
                    </div>
                  </div>
                }
              </div>
            } @else if ((stats()?.recentAuditLogs ?? []).length === 0) {
              <p class="text-sm text-surface-400 text-center py-8">No audit activity yet</p>
            } @else {
              <div class="space-y-3">
                @for (log of stats()?.recentAuditLogs ?? []; track log.id) {
                  <div class="flex items-start gap-3">
                    <span class="px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 mt-0.5"
                          [class]="getActionClass(log.action)">
                      {{ log.action.replace('_', ' ').toUpperCase() }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm text-surface-700 truncate capitalize">
                        {{ formatEntity(log.entity_type) }}
                      </p>
                      <p class="text-xs text-surface-400">
                        {{ log.actor?.full_name ?? 'System' }} &middot; {{ log.created_at | timeAgo }}
                      </p>
                    </div>
                  </div>
                }
              </div>
              <a routerLink="/audit"
                 class="mt-4 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 pt-3 border-t border-surface-100">
                Full audit log <i class="pi pi-arrow-right text-xs"></i>
              </a>
            }
          </div>
        </div>

        <!-- ── Section 4 + 5: Configuration Status + Integration Health ── -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          <!-- Configuration Status -->
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <i class="pi pi-cog text-surface-500"></i>
              Configuration Status
            </h3>
            @if (isLoading()) {
              <div class="grid grid-cols-2 gap-3">
                @for (i of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; track i) {
                  <div class="flex items-center gap-2">
                    <p-skeleton shape="circle" size="18px" />
                    <p-skeleton width="80px" height="14px" />
                  </div>
                }
              </div>
            } @else {
              <div class="grid grid-cols-2 gap-2">
                @for (item of masterItems; track item.key) {
                  <a [routerLink]="item.route"
                     class="flex items-center gap-2 py-1 hover:opacity-80 transition-opacity"
                     [pTooltip]="getMasterTooltip(item.key)"
                     tooltipPosition="top">
                    <i [class]="getMasterIcon(item.key) + ' text-sm flex-shrink-0'"></i>
                    <span class="text-sm text-surface-700 truncate">{{ item.label }}</span>
                    <span class="ml-auto text-xs font-semibold text-surface-500 flex-shrink-0">
                      {{ getMasterCount(item.key) }}
                    </span>
                  </a>
                }
              </div>
              <p class="text-xs text-surface-400 mt-4 pt-3 border-t border-surface-100">
                <i class="pi pi-info-circle mr-1"></i>
                Items marked <span class="text-red-500 font-semibold">✗</span> have no records — configure them before creating tickets.
              </p>
            }
          </div>

          <!-- Integration Health -->
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
              <i class="pi pi-link text-surface-500"></i>
              Integration Health
            </h3>
            @if (isLoading()) {
              <div class="space-y-3">
                @for (i of [1, 2]; track i) {
                  <div class="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                    <p-skeleton width="130px" height="14px" />
                    <p-skeleton width="36px" height="28px" borderRadius="6px" />
                  </div>
                }
              </div>
            } @else {
              <div class="space-y-3">
                <div class="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <i class="pi pi-send text-blue-500 text-sm"></i>
                    </div>
                    <span class="text-sm font-medium text-surface-700">Active Webhooks</span>
                  </div>
                  <span class="text-xl font-bold text-surface-900">
                    {{ stats()?.activeWebhooks ?? 0 }}
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                      <i class="pi pi-key text-amber-500 text-sm"></i>
                    </div>
                    <span class="text-sm font-medium text-surface-700">Active API Keys</span>
                  </div>
                  <span class="text-xl font-bold text-surface-900">
                    {{ stats()?.activeApiKeys ?? 0 }}
                  </span>
                </div>
              </div>
              <a routerLink="/integrations"
                 class="mt-4 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 pt-3 border-t border-surface-100">
                Manage integrations <i class="pi pi-arrow-right text-xs"></i>
              </a>
            }
          </div>
        </div>

        <!-- ── Section 6: Quick Actions ── -->
        <div class="bg-white rounded-xl border border-surface-200 p-5">
          <h3 class="font-semibold text-surface-800 mb-4 flex items-center gap-2">
            <i class="pi pi-th-large text-surface-500"></i>
            Quick Actions
          </h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            @for (action of quickActions; track action.label) {
              <a
                [routerLink]="action.route"
                class="flex flex-col items-center gap-2 p-4 bg-surface-50 hover:bg-primary-50 border border-surface-200 hover:border-primary-300 rounded-xl transition-all cursor-pointer group text-center"
              >
                <div
                  class="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                  [style.backgroundColor]="action.iconBg"
                >
                  <i [class]="action.icon + ' text-base'" [style.color]="action.iconColor"></i>
                </div>
                <span class="text-sm font-medium text-surface-700 group-hover:text-primary-700 leading-tight">
                  {{ action.label }}
                </span>
              </a>
            }
          </div>
        </div>

      }

    </div>
  `,
})
export class OverviewComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);

  // ── Signals ──────────────────────────────────────────────────────────────────
  readonly isLoading = signal(false);
  readonly stats = signal<SystemStats | null>(null);
  readonly error = signal<string | null>(null);

  // ── Guide dialog signals ──────────────────────────────────────────────────
  readonly guideVisible = signal(false);
  readonly currentStep  = signal(0);
  readonly totalSteps   = 9;
  readonly guideProgress = computed(() =>
    Math.round(((this.currentStep() + 1) / this.totalSteps) * 100)
  );
  readonly stepIndices = Array.from({ length: 9 }, (_, i) => i);

  // ── Static config — overview ───────────────────────────────────────────────
  readonly masterItems: { key: keyof MasterStatus; label: string; route: string }[] = [
    { key: 'roles',            label: 'Roles',            route: '/masters' },
    { key: 'departments',      label: 'Departments',      route: '/masters' },
    { key: 'categories',       label: 'Categories',       route: '/masters' },
    { key: 'priorities',       label: 'Priorities',       route: '/masters' },
    { key: 'statuses',         label: 'Statuses',         route: '/masters' },
    { key: 'ticket_types',     label: 'Ticket Types',     route: '/masters' },
    { key: 'queues',           label: 'Queues',           route: '/masters' },
    { key: 'sla_policies',     label: 'SLA Policies',     route: '/sla' },
    { key: 'business_hours',   label: 'Business Hours',   route: '/sla' },
    { key: 'automation_rules', label: 'Automation Rules', route: '/automation' },
  ];

  readonly quickActions = [
    { label: 'Add User',          route: '/masters',    icon: 'pi pi-user-plus', iconColor: '#3B82F6', iconBg: '#EFF6FF' },
    { label: 'Configure SLA',     route: '/sla',        icon: 'pi pi-clock',     iconColor: '#10B981', iconBg: '#D1FAE5' },
    { label: 'Build Workflow',    route: '/workflow',   icon: 'pi pi-sitemap',   iconColor: '#8B5CF6', iconBg: '#EDE9FE' },
    { label: 'Create Automation', route: '/automation', icon: 'pi pi-bolt',      iconColor: '#F59E0B', iconBg: '#FEF3C7' },
  ];

  // ── Static config — guide step data ───────────────────────────────────────

  readonly masterSetupOrder = [
    { step: 1, name: 'Roles',        route: 'Masters → Roles',        why: 'Required for RLS access control — always exists by default. Verify before anything else.' },
    { step: 2, name: 'Departments',  route: 'Masters → Departments',  why: 'Used for agent assignment routing and ticket categorization.' },
    { step: 3, name: 'Categories',   route: 'Masters → Categories',   why: 'Ticket classification — hierarchical (parent/child). Set up parent categories first.' },
    { step: 4, name: 'Priorities',   route: 'Masters → Priorities',   why: 'Every ticket requires a priority. Priorities also carry the SLA multiplier value.' },
    { step: 5, name: 'Statuses',     route: 'Masters → Statuses',     why: 'Ticket lifecycle stages. Exactly one status must be marked as "Is Default" for ticket creation.' },
    { step: 6, name: 'Ticket Types', route: 'Masters → Ticket Types', why: 'Incident / SR / Problem / Change / Task. Each type can have its own workflow.' },
    { step: 7, name: 'Queues',       route: 'Masters → Queues',       why: 'Team-based routing buckets. Assign agents to queues for round-robin auto-assignment.' },
  ];

  readonly commonTransitions = [
    { from: 'Open',        to: 'In Progress', roles: 'Agent, Admin' },
    { from: 'Open',        to: 'Pending',     roles: 'Agent, Admin' },
    { from: 'In Progress', to: 'Resolved',    roles: 'Agent, Admin' },
    { from: 'Resolved',    to: 'Closed',      roles: 'Admin' },
    { from: 'Resolved',    to: 'Open',        roles: 'Any (reopen)' },
  ];

  readonly automationExamples = [
    { icon: 'pi-user-plus',           name: 'Auto-Assign Critical',    desc: 'ticket_created + priority=Critical → assign_to senior agent' },
    { icon: 'pi-bell',                name: 'SLA Breach Alert',         desc: 'sla_breached → send_notification to assignee and admin' },
    { icon: 'pi-arrow-up',            name: 'Escalate Stale Tickets',   desc: 'ticket_updated + status=Open + age>24h → set_priority=High' },
    { icon: 'pi-send',                name: 'Webhook on Resolution',    desc: 'ticket_resolved → call_webhook to external ITSM system' },
    { icon: 'pi-tag',                 name: 'Tag VIP Requests',         desc: 'ticket_created + title contains "VIP" → add_tag vip' },
  ];

  readonly roleCapabilities = [
    { name: 'Super Admin', color: '#3B82F6', desc: 'Full system control — all features, overview tab, workflow, automation, integrations' },
    { name: 'Admin',       color: '#8B5CF6', desc: 'User management, SLA, reports, audit logs, notification templates' },
    { name: 'Agent',       color: '#10B981', desc: 'Handle tickets, change status/priority, add internal notes, view all tickets' },
    { name: 'End User',    color: '#F59E0B', desc: 'Create tickets, view own tickets, add comments, receive notifications' },
  ];

  readonly ticketLifecycleDiagram = `
  [Ticket Created]
        |
        v
      OPEN ──────────────────────────────┐
        |                                |
        v                                |
   IN PROGRESS ──── needs info ──> PENDING
        |                                |
        |  <──── info received ──────────┘
        |
        v
    RESOLVED ──── confirmed / auto-close ──> CLOSED
        |
        └──── issue recurs ──────────────> OPEN (reopen)

  ESCALATED = flag on ticket, not a status
  ON HOLD   = pause while awaiting 3rd party
  CANCELLED = ticket withdrawn / invalid
`;

  readonly statusCategories = [
    { category: 'open',        color: '#3B82F6', meaning: 'Awaiting pickup' },
    { category: 'in_progress', color: '#8B5CF6', meaning: 'Being actively worked' },
    { category: 'pending',     color: '#F59E0B', meaning: 'SLA clock paused — awaiting info' },
    { category: 'resolved',    color: '#10B981', meaning: 'Fixed, awaiting confirmation' },
    { category: 'closed',      color: '#64748B', meaning: 'Complete, read-only' },
  ];

  readonly notificationTemplates = [
    { name: 'Ticket Created',        channel: 'In-App + Email' },
    { name: 'Ticket Assigned',       channel: 'In-App + Email' },
    { name: 'Status Changed',        channel: 'In-App' },
    { name: 'SLA Breach Warning',    channel: 'In-App + Email' },
    { name: 'SLA Breached',          channel: 'In-App + Email' },
    { name: 'Ticket Resolved',       channel: 'In-App + Email' },
    { name: 'Comment Added',         channel: 'In-App' },
    { name: 'Mentioned in Comment',  channel: 'In-App' },
  ];

  readonly templateVarsExample =
`{{ ticket_number }}   → TICK-00042
{{ ticket_title }}    → Cannot access VPN
{{ recipient_name }}  → Alice Johnson
{{ ticket_url }}      → https://app.co/tickets/...
{{ agent_name }}      → Bob Smith
{{ status_name }}     → In Progress
{{ priority_name }}   → Critical`;

  readonly productionChecklist = [
    { label: 'Supabase auth configured',    check: 'Email provider enabled, Site URL set to production domain' },
    { label: 'All migrations applied',      check: '001 through 010 run in order — 24 tables visible in Table Editor' },
    { label: 'Super Admin user promoted',   check: 'profiles.role_id = super_admin UUID' },
    { label: 'SLA policies created',        check: 'At least one per priority level' },
    { label: 'Default status set',          check: 'Exactly one status has Is Default = ON' },
    { label: 'Netlify SPA redirect active', check: 'netlify.toml [[redirects]] /* → /index.html present' },
    { label: 'System Overview verified',    check: 'All configuration status rows show green ✓' },
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadStats();
  }

  // ── Guide actions ─────────────────────────────────────────────────────────
  openGuide(): void {
    this.currentStep.set(0);
    this.guideVisible.set(true);
  }

  closeGuide(): void {
    this.guideVisible.set(false);
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps - 1) {
      this.currentStep.update(s => s + 1);
    } else {
      this.closeGuide();
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
    }
  }

  // ── Data loading ──────────────────────────────────────────────────────────
  async loadStats(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [
        usersResult,
        ticketsResult,
        slaResult,
        auditResult,
        masterCounts,
        webhookResult,
        apiKeyResult,
        automationResult,
      ] = await Promise.all([
        // 1. Total users
        this.supabase.from('profiles').select('id', { count: 'exact', head: true }),

        // 2. All tickets — need status category + escalation flag
        this.supabase
          .from('tickets')
          .select('id, is_escalated, status:statuses!status_id(category)'),

        // 3. SLA resolution events for compliance calculation
        this.supabase
          .from('sla_events')
          .select('id, is_breached')
          .eq('event_type', 'resolution'),

        // 4. Last 5 audit log entries with actor details
        this.supabase
          .from('audit_logs')
          .select('id, entity_type, action, created_at, actor:profiles!actor_id(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(5),

        // 5. All 10 master table counts in parallel
        Promise.all([
          this.supabase.from('roles').select('id', { count: 'exact', head: true }),
          this.supabase.from('departments').select('id', { count: 'exact', head: true }),
          this.supabase.from('categories').select('id', { count: 'exact', head: true }),
          this.supabase.from('priorities').select('id', { count: 'exact', head: true }),
          this.supabase.from('statuses').select('id', { count: 'exact', head: true }),
          this.supabase.from('ticket_types').select('id', { count: 'exact', head: true }),
          this.supabase.from('queues').select('id', { count: 'exact', head: true }),
          this.supabase.from('sla_policies').select('id', { count: 'exact', head: true }),
          this.supabase.from('business_hours').select('id', { count: 'exact', head: true }),
          this.supabase.from('automation_rules').select('id', { count: 'exact', head: true }).eq('is_active', true),
        ]),

        // 6. Active webhooks count
        this.supabase.from('webhook_configs').select('id', { count: 'exact', head: true }).eq('is_active', true),

        // 7. Active API keys count
        this.supabase.from('api_keys').select('id', { count: 'exact', head: true }).eq('is_active', true),

        // 8. Active automation rules count (for health bar)
        this.supabase.from('automation_rules').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      // ── Parse ticket breakdown ──────────────────────────────────────────────
      const tickets = (ticketsResult.data ?? []) as Array<{
        id: string;
        is_escalated: boolean;
        status: { category: string } | Array<{ category: string }>;
      }>;

      const getCategory = (t: typeof tickets[0]): string => {
        const s = t.status;
        return Array.isArray(s) ? (s[0]?.category ?? '') : (s?.category ?? '');
      };

      // ── Parse SLA compliance ────────────────────────────────────────────────
      const slaEvents = (slaResult.data ?? []) as Array<{ id: string; is_breached: boolean }>;
      const totalResolution = slaEvents.length;
      const breachedCount = slaEvents.filter(e => e.is_breached).length;
      const slaCompliancePercent = totalResolution > 0
        ? Math.round(((totalResolution - breachedCount) / totalResolution) * 100)
        : 100;

      // ── Parse audit logs (unwrap actor join) ────────────────────────────────
      const recentAuditLogs: AuditEntry[] = ((auditResult.data ?? []) as unknown[]).map(d => {
        const item = d as Record<string, unknown>;
        const rawActor = item['actor'];
        const actor = Array.isArray(rawActor) ? (rawActor[0] ?? null) : (rawActor ?? null);
        return {
          id: item['id'] as string,
          entity_type: item['entity_type'] as string,
          action: item['action'] as string,
          created_at: item['created_at'] as string,
          actor: actor as { full_name: string; email: string } | null,
        };
      });

      // ── Parse master counts ─────────────────────────────────────────────────
      const [mRoles, mDepts, mCats, mPrios, mStats, mTypes, mQueues, mSla, mBh, mAuto] = masterCounts;

      const masterStatus: MasterStatus = {
        roles:            mRoles.count ?? 0,
        departments:      mDepts.count ?? 0,
        categories:       mCats.count ?? 0,
        priorities:       mPrios.count ?? 0,
        statuses:         mStats.count ?? 0,
        ticket_types:     mTypes.count ?? 0,
        queues:           mQueues.count ?? 0,
        sla_policies:     mSla.count ?? 0,
        business_hours:   mBh.count ?? 0,
        automation_rules: mAuto.count ?? 0,
      };

      // ── Assemble final stats ────────────────────────────────────────────────
      this.stats.set({
        totalUsers:           usersResult.count ?? 0,
        totalTickets:         tickets.length,
        openTickets:          tickets.filter(t => getCategory(t) === 'open').length,
        inProgressTickets:    tickets.filter(t => getCategory(t) === 'in_progress').length,
        resolvedTickets:      tickets.filter(t => getCategory(t) === 'resolved').length,
        escalatedTickets:     tickets.filter(t => t.is_escalated).length,
        slaCompliancePercent,
        activeAutomations:    automationResult.count ?? 0,
        activeWebhooks:       webhookResult.count ?? 0,
        activeApiKeys:        apiKeyResult.count ?? 0,
        recentAuditLogs,
        masterStatus,
      });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load system overview';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Template helpers ──────────────────────────────────────────────────────
  getActionClass(action: string): string {
    const map: Record<string, string> = {
      created:        'bg-emerald-100 text-emerald-700',
      updated:        'bg-amber-100 text-amber-700',
      status_changed: 'bg-blue-100 text-blue-700',
      reassigned:     'bg-purple-100 text-purple-700',
      deleted:        'bg-red-100 text-red-700',
    };
    return map[action.toLowerCase()] ?? 'bg-surface-100 text-surface-600';
  }

  formatEntity(type: string): string {
    return type.split('_').join(' ');
  }

  getMasterIcon(key: keyof MasterStatus): string {
    const count = this.stats()?.masterStatus[key] ?? 0;
    return count > 0
      ? 'pi pi-check-circle text-emerald-500'
      : 'pi pi-times-circle text-red-400';
  }

  getMasterTooltip(key: keyof MasterStatus): string {
    const count = this.stats()?.masterStatus[key] ?? 0;
    return count > 0
      ? `${count} record(s) configured`
      : 'Not configured — click to set up';
  }

  getMasterCount(key: keyof MasterStatus): number {
    return this.stats()?.masterStatus[key] ?? 0;
  }
}
