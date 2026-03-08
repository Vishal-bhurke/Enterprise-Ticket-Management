import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { SUPABASE_CLIENT } from '../../core/supabase/supabase.client';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface TestRunLog {
  id: string;
  run_at: string;
  deployment_url: string | null;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration_ms: number | null;
  status: 'passed' | 'failed' | 'partial';
  report_url: string | null;
  raw_results: unknown;
}

interface SuiteBreakdown {
  suite: string;
  total: number;
  passed: number;
  failed: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-system-testing',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    SkeletonModule,
    TooltipModule,
    TableModule,
    DialogModule,
    PageHeaderComponent,
    MetricCardComponent,
    ErrorBannerComponent,
    TimeAgoPipe,
  ],
  template: `
    <div class="p-4 sm:p-6">

      <app-page-header
        title="System Testing Dashboard"
        subtitle="Automated E2E test results — every deployment is tested end-to-end"
        [breadcrumbs]="['Home', 'System Testing']"
      >
        <p-button
          label="View Run Guide"
          icon="pi pi-book"
          severity="secondary"
          [outlined]="true"
          size="small"
          (onClick)="guideVisible.set(true)"
        />
        <p-button
          label="Refresh"
          icon="pi pi-refresh"
          severity="primary"
          [outlined]="true"
          size="small"
          [loading]="isLoading()"
          (onClick)="loadRuns()"
        />
      </app-page-header>

      <!-- Run Guide Dialog -->
      <p-dialog
        [(visible)]="guideVisible"
        header="How to Run Tests"
        [modal]="true"
        [draggable]="false"
        [resizable]="false"
        [closable]="true"
        [style]="{ width: '640px', 'max-width': '95vw' }"
      >
        <div class="space-y-4 py-2">

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-play text-blue-600"></i>
              <span class="font-semibold text-sm text-blue-800">Run Locally</span>
            </div>
            <p class="text-xs text-blue-700 mb-3">Start the dev server, then run the full Playwright test suite:</p>
            <div class="bg-surface-900 rounded p-3 font-mono text-xs text-green-400 space-y-1">
              <p># In terminal 1 — start the app</p>
              <p class="text-white">ng serve</p>
              <p class="mt-2"># In terminal 2 — run tests</p>
              <p class="text-white">npx playwright test</p>
              <p class="mt-2"># Open HTML report</p>
              <p class="text-white">npx playwright show-report</p>
            </div>
          </div>

          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-cloud-upload text-emerald-600"></i>
              <span class="font-semibold text-sm text-emerald-800">Automatic on Deploy</span>
            </div>
            <p class="text-xs text-emerald-700">Tests run automatically after every successful Netlify deployment via the <code class="bg-emerald-100 px-1 rounded">netlify/plugins/run-tests</code> <code>onSuccess</code> hook. Results are stored in this table and notifications are sent to all super_admin users.</p>
          </div>

          <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <i class="pi pi-info-circle text-amber-600"></i>
              <span class="font-semibold text-sm text-amber-800">Test Architecture</span>
            </div>
            <div class="space-y-1 text-xs text-amber-700">
              <p><strong>301 tests</strong> across 42 spec files — every page, every master, every role</p>
              <p><strong>4 roles tested</strong>: super_admin, admin, agent, end_user</p>
              <p><strong>144 route-access checks</strong>: 4 roles × 36 routes</p>
              <p><strong>Location</strong>: <code class="bg-amber-100 px-1 rounded">enterprise-ticket-system/tests/</code></p>
              <p><strong>Config</strong>: <code class="bg-amber-100 px-1 rounded">playwright.config.ts</code></p>
            </div>
          </div>

        </div>
      </p-dialog>

      <!-- Error State -->
      @if (error() && !isLoading()) {
        <app-error-banner [message]="error()!" (retry)="loadRuns()" />
      }

      @if (!error() || isLoading()) {

        <!-- ── Summary Metrics ── -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <app-metric-card
            label="Total Runs"
            [value]="runs().length"
            icon="pi pi-play-circle"
            iconColor="#3B82F6"
            iconBg="#EFF6FF"
            [loading]="isLoading()"
          />
          <app-metric-card
            label="Last Run Tests"
            [value]="latestRun()?.total_tests ?? 0"
            icon="pi pi-list-check"
            iconColor="#8B5CF6"
            iconBg="#EDE9FE"
            [loading]="isLoading()"
          />
          <app-metric-card
            label="Last Run Passed"
            [value]="latestRun()?.passed ?? 0"
            icon="pi pi-check-circle"
            iconColor="#10B981"
            iconBg="#D1FAE5"
            [loading]="isLoading()"
          />
          <app-metric-card
            label="Last Run Failed"
            [value]="latestRun()?.failed ?? 0"
            icon="pi pi-times-circle"
            iconColor="#EF4444"
            iconBg="#FEE2E2"
            [loading]="isLoading()"
          />
        </div>

        <!-- ── Latest Run Banner ── -->
        @if (!isLoading() && latestRun()) {
          <div
            class="rounded-xl border p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            [class]="latestRun()!.status === 'passed'
              ? 'bg-emerald-50 border-emerald-200'
              : latestRun()!.status === 'failed'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'"
          >
            <div
              class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              [class]="latestRun()!.status === 'passed'
                ? 'bg-emerald-100'
                : latestRun()!.status === 'failed'
                  ? 'bg-red-100'
                  : 'bg-amber-100'"
            >
              <i
                class="text-xl"
                [class]="latestRun()!.status === 'passed'
                  ? 'pi pi-check-circle text-emerald-600'
                  : latestRun()!.status === 'failed'
                    ? 'pi pi-times-circle text-red-600'
                    : 'pi pi-exclamation-triangle text-amber-600'"
              ></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-surface-900">Latest Run</span>
                <p-tag
                  [value]="latestRun()!.status | titlecase"
                  [severity]="getStatusSeverity(latestRun()!.status)"
                />
                <span class="text-sm text-surface-500">{{ latestRun()!.run_at | timeAgo }}</span>
              </div>
              <div class="flex items-center gap-4 mt-1 text-sm flex-wrap">
                <span class="text-emerald-700 font-semibold">
                  <i class="pi pi-check mr-1"></i>{{ latestRun()!.passed }} passed
                </span>
                @if (latestRun()!.failed > 0) {
                  <span class="text-red-700 font-semibold">
                    <i class="pi pi-times mr-1"></i>{{ latestRun()!.failed }} failed
                  </span>
                }
                @if (latestRun()!.skipped > 0) {
                  <span class="text-surface-500">
                    {{ latestRun()!.skipped }} skipped
                  </span>
                }
                @if (latestRun()!.duration_ms) {
                  <span class="text-surface-500">
                    <i class="pi pi-clock mr-1"></i>{{ formatDuration(latestRun()!.duration_ms!) }}
                  </span>
                }
                @if (latestRun()!.deployment_url) {
                  <a
                    [href]="latestRun()!.deployment_url!"
                    target="_blank"
                    rel="noopener"
                    class="text-blue-600 hover:text-blue-700 text-xs"
                    pTooltip="Open deployed URL"
                  >
                    <i class="pi pi-external-link"></i>
                  </a>
                }
              </div>
            </div>
            @if (latestRun()!.report_url) {
              <a
                [href]="latestRun()!.report_url!"
                target="_blank"
                rel="noopener"
                class="flex-shrink-0"
              >
                <p-button
                  label="View Report"
                  icon="pi pi-external-link"
                  severity="secondary"
                  [outlined]="true"
                  size="small"
                />
              </a>
            }
          </div>
        }

        @if (!isLoading() && runs().length === 0) {
          <!-- Empty State -->
          <div class="bg-white rounded-xl border border-surface-200 p-12 text-center">
            <div class="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-play-circle text-surface-400 text-3xl"></i>
            </div>
            <h3 class="text-lg font-semibold text-surface-700 mb-2">No Test Runs Yet</h3>
            <p class="text-sm text-surface-500 mb-4">
              Test results appear here automatically after each deployment,<br>
              or you can run the suite locally using the command below.
            </p>
            <div class="inline-block bg-surface-900 rounded-lg px-4 py-2 font-mono text-sm text-green-400 mb-4">
              npx playwright test
            </div>
            <br>
            <p-button
              label="View Run Guide"
              icon="pi pi-book"
              severity="secondary"
              [outlined]="true"
              size="small"
              (onClick)="guideVisible.set(true)"
            />
          </div>
        }

        <!-- ── Run History Table ── -->
        @if (!isLoading() && runs().length > 0) {
          <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div class="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 class="font-semibold text-surface-800 flex items-center gap-2">
                <i class="pi pi-history text-surface-500"></i>
                Run History
                <span class="text-xs text-surface-400 font-normal">({{ runs().length }} runs)</span>
              </h3>
            </div>

            <p-table
              [value]="runs()"
              [paginator]="runs().length > 10"
              [rows]="10"
              [rowsPerPageOptions]="[10, 25, 50]"
              styleClass="p-datatable-sm"
              [tableStyle]="{ 'min-width': '700px' }"
            >
              <ng-template pTemplate="header">
                <tr>
                  <th>Run At</th>
                  <th>Status</th>
                  <th class="text-center">Total</th>
                  <th class="text-center">Passed</th>
                  <th class="text-center">Failed</th>
                  <th class="text-center">Skipped</th>
                  <th>Duration</th>
                  <th>Deployment</th>
                  <th class="text-center">Report</th>
                </tr>
              </ng-template>
              <ng-template pTemplate="body" let-run>
                <tr>
                  <td class="text-sm text-surface-600 whitespace-nowrap">
                    {{ run.run_at | date:'dd MMM yyyy, HH:mm' }}
                    <span class="block text-xs text-surface-400">{{ run.run_at | timeAgo }}</span>
                  </td>
                  <td>
                    <p-tag
                      [value]="run.status | titlecase"
                      [severity]="getStatusSeverity(run.status)"
                    />
                  </td>
                  <td class="text-center font-semibold text-surface-700">{{ run.total_tests }}</td>
                  <td class="text-center">
                    <span class="font-semibold" [class]="run.passed === run.total_tests ? 'text-emerald-600' : 'text-emerald-500'">
                      {{ run.passed }}
                    </span>
                  </td>
                  <td class="text-center">
                    <span class="font-semibold" [class]="run.failed > 0 ? 'text-red-600' : 'text-surface-400'">
                      {{ run.failed }}
                    </span>
                  </td>
                  <td class="text-center text-surface-400 text-sm">{{ run.skipped }}</td>
                  <td class="text-sm text-surface-500 whitespace-nowrap">
                    {{ run.duration_ms ? formatDuration(run.duration_ms) : '—' }}
                  </td>
                  <td class="text-sm max-w-[160px] truncate">
                    @if (run.deployment_url) {
                      <a
                        [href]="run.deployment_url"
                        target="_blank"
                        rel="noopener"
                        class="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1 truncate"
                        [pTooltip]="run.deployment_url"
                      >
                        <i class="pi pi-external-link text-xs flex-shrink-0"></i>
                        <span class="truncate">{{ run.deployment_url }}</span>
                      </a>
                    } @else {
                      <span class="text-surface-400">—</span>
                    }
                  </td>
                  <td class="text-center">
                    @if (run.report_url) {
                      <a
                        [href]="run.report_url"
                        target="_blank"
                        rel="noopener"
                        pTooltip="View Playwright HTML report"
                      >
                        <p-button
                          icon="pi pi-chart-bar"
                          severity="secondary"
                          [text]="true"
                          size="small"
                        />
                      </a>
                    } @else {
                      <span class="text-surface-300 text-xs">—</span>
                    }
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
        }

        <!-- ── Loading skeleton for table ── -->
        @if (isLoading()) {
          <div class="bg-white rounded-xl border border-surface-200 p-5">
            <div class="space-y-3">
              @for (i of [1, 2, 3, 4, 5]; track i) {
                <div class="flex items-center gap-4">
                  <p-skeleton width="120px" height="14px" />
                  <p-skeleton width="60px" height="22px" borderRadius="999px" />
                  <p-skeleton width="40px" height="14px" />
                  <p-skeleton width="40px" height="14px" />
                  <p-skeleton width="40px" height="14px" />
                  <p-skeleton width="60px" height="14px" />
                  <p-skeleton width="100px" height="14px" />
                </div>
              }
            </div>
          </div>
        }

        <!-- ── Test Infrastructure Info ── -->
        @if (!isLoading()) {
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">

            <div class="bg-white rounded-xl border border-surface-200 p-5">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <i class="pi pi-file-edit text-blue-600 text-sm"></i>
                </div>
                <span class="font-semibold text-sm text-surface-800">Test Coverage</span>
              </div>
              <div class="space-y-2 text-xs text-surface-600">
                <div class="flex justify-between items-center">
                  <span>E2E spec files</span>
                  <span class="font-semibold text-surface-800">42</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Total tests</span>
                  <span class="font-semibold text-surface-800">301</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Route-access checks</span>
                  <span class="font-semibold text-surface-800">144</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Masters tested</span>
                  <span class="font-semibold text-surface-800">13</span>
                </div>
                <div class="flex justify-between items-center">
                  <span>Roles tested</span>
                  <span class="font-semibold text-surface-800">4</span>
                </div>
              </div>
            </div>

            <div class="bg-white rounded-xl border border-surface-200 p-5">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
                  <i class="pi pi-folder text-violet-600 text-sm"></i>
                </div>
                <span class="font-semibold text-sm text-surface-800">Test Categories</span>
              </div>
              <div class="space-y-1.5 text-xs text-surface-600">
                @for (cat of testCategories; track cat.name) {
                  <div class="flex items-center gap-2">
                    <i [class]="cat.icon + ' text-xs flex-shrink-0 w-3'" [style.color]="cat.color"></i>
                    <span>{{ cat.name }}</span>
                    <span class="ml-auto font-semibold text-surface-700">{{ cat.count }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="bg-white rounded-xl border border-surface-200 p-5">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <i class="pi pi-cloud text-emerald-600 text-sm"></i>
                </div>
                <span class="font-semibold text-sm text-surface-800">CI Integration</span>
              </div>
              <div class="space-y-2 text-xs text-surface-600">
                <div class="flex items-start gap-2">
                  <i class="pi pi-check-circle text-emerald-500 flex-shrink-0 mt-0.5"></i>
                  <span>Runs automatically after Netlify deploy</span>
                </div>
                <div class="flex items-start gap-2">
                  <i class="pi pi-check-circle text-emerald-500 flex-shrink-0 mt-0.5"></i>
                  <span>Never blocks deployment — runs post-deploy</span>
                </div>
                <div class="flex items-start gap-2">
                  <i class="pi pi-check-circle text-emerald-500 flex-shrink-0 mt-0.5"></i>
                  <span>Failure triggers in-app notification</span>
                </div>
                <div class="flex items-start gap-2">
                  <i class="pi pi-check-circle text-emerald-500 flex-shrink-0 mt-0.5"></i>
                  <span>Results stored in Supabase</span>
                </div>
                <div class="flex items-start gap-2">
                  <i class="pi pi-check-circle text-emerald-500 flex-shrink-0 mt-0.5"></i>
                  <span>HTML report available per run</span>
                </div>
              </div>
            </div>

          </div>
        }

      }

    </div>
  `,
})
export class SystemTestingComponent implements OnInit {
  private supabase = inject(SUPABASE_CLIENT);

  // ── Signals ────────────────────────────────────────────────────────────────
  readonly isLoading = signal(false);
  readonly runs = signal<TestRunLog[]>([]);
  readonly error = signal<string | null>(null);
  readonly guideVisible = signal(false);

  readonly latestRun = computed(() => this.runs()[0] ?? null);

  // ── Static config ──────────────────────────────────────────────────────────
  readonly testCategories = [
    { name: 'Authentication flows',    icon: 'pi pi-lock',        color: '#3B82F6', count: 18 },
    { name: 'Masters CRUD',            icon: 'pi pi-database',    color: '#8B5CF6', count: 65 },
    { name: 'Ticket operations',       icon: 'pi pi-ticket',      color: '#10B981', count: 38 },
    { name: 'Role-access matrix',      icon: 'pi pi-shield',      color: '#F59E0B', count: 144 },
    { name: 'Reports & Audit',         icon: 'pi pi-chart-bar',   color: '#EF4444', count: 15 },
    { name: 'Integrations & SLA',      icon: 'pi pi-link',        color: '#64748B', count: 21 },
  ];

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadRuns();
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  async loadRuns(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase
        .from('test_run_logs')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(100);

      if (error) {
        // Table might not exist yet (migration not applied)
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          this.runs.set([]);
        } else {
          throw error;
        }
      } else {
        this.runs.set((data ?? []) as TestRunLog[]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load test runs';
      this.error.set(message);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getStatusSeverity(status: string): 'success' | 'danger' | 'warn' {
    if (status === 'passed') return 'success';
    if (status === 'failed') return 'danger';
    return 'warn';
  }

  formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
}
