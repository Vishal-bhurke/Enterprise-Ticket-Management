import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DashboardService } from './services/dashboard.service';
import { AuthService } from '../../core/auth/auth.service';
import { MetricCardComponent } from '../../shared/components/metric-card/metric-card.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ChartModule,
    TableModule,
    TagModule,
    ButtonModule,
    SkeletonModule,
    MetricCardComponent,
    PageHeaderComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
    TimeAgoPipe,
  ],
  template: `
    <app-page-header
      title="Dashboard"
      subtitle="Overview of your service management metrics"
      [breadcrumbs]="['Home', 'Dashboard']"
    >
      <p-button
        label="Create Ticket"
        icon="pi pi-plus"
        routerLink="/tickets/create"
        size="small"
      />
    </app-page-header>

    <!-- Error state -->
    @if (error() && !isLoading()) {
      <app-error-banner [message]="error()!" (retry)="loadDashboard()" />
    }

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
      <app-metric-card
        label="Total Tickets"
        [value]="stats().total"
        icon="pi pi-ticket"
        iconColor="#3B82F6"
        iconBg="#EFF6FF"
        [loading]="isLoading()"
      />
      <app-metric-card
        label="Open"
        [value]="stats().open"
        icon="pi pi-circle"
        iconColor="#3B82F6"
        iconBg="#DBEAFE"
        [loading]="isLoading()"
      />
      <app-metric-card
        label="In Progress"
        [value]="stats().in_progress"
        icon="pi pi-spin pi-spinner"
        iconColor="#8B5CF6"
        iconBg="#EDE9FE"
        [loading]="isLoading()"
      />
      <app-metric-card
        label="Pending"
        [value]="stats().pending"
        icon="pi pi-pause"
        iconColor="#F59E0B"
        iconBg="#FEF3C7"
        [loading]="isLoading()"
      />
      <app-metric-card
        label="Resolved"
        [value]="stats().resolved"
        icon="pi pi-check-circle"
        iconColor="#10B981"
        iconBg="#D1FAE5"
        [loading]="isLoading()"
      />
      <app-metric-card
        label="Closed"
        [value]="stats().closed"
        icon="pi pi-lock"
        iconColor="#64748B"
        iconBg="#F1F5F9"
        [loading]="isLoading()"
      />
      <app-metric-card
        label="SLA Breached"
        [value]="stats().sla_breached"
        icon="pi pi-exclamation-triangle"
        iconColor="#EF4444"
        iconBg="#FEE2E2"
        [loading]="isLoading()"
      />
      <app-metric-card
        label="Escalated"
        [value]="stats().escalated"
        icon="pi pi-arrow-up"
        iconColor="#F97316"
        iconBg="#FFEDD5"
        [loading]="isLoading()"
      />
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
      <!-- Ticket Trend Chart -->
      <div class="lg:col-span-2 bg-white rounded-xl border border-surface-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-surface-800">Ticket Trend (Last 7 Days)</h3>
          <span class="text-xs text-surface-500">Created vs Resolved</span>
        </div>
        @if (isLoading()) {
          <p-skeleton height="200px" />
        } @else if (trendData().length === 0) {
          <div class="h-48 flex items-center justify-center text-surface-400 text-sm">
            No trend data available
          </div>
        } @else {
          <p-chart type="line" [data]="trendChartData()" [options]="lineChartOptions" height="200px" />
        }
      </div>

      <!-- SLA Compliance Donut -->
      <div class="bg-white rounded-xl border border-surface-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-surface-800">SLA Compliance</h3>
        </div>
        @if (isLoading()) {
          <p-skeleton shape="circle" size="160px" styleClass="mx-auto" />
        } @else if (stats().total === 0) {
          <div class="h-48 flex flex-col items-center justify-center gap-2 text-surface-400">
            <i class="pi pi-chart-pie text-4xl"></i>
            <span class="text-sm">No data yet</span>
          </div>
        } @else {
          <p-chart type="doughnut" [data]="slaChartData()" [options]="donutOptions" height="200px" />
          <div class="flex items-center justify-center gap-6 mt-4">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span class="text-xs text-surface-600">Met ({{ slaMet() }})</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
              <span class="text-xs text-surface-600">Breached ({{ stats().sla_breached }})</span>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Agent Workload Table -->
    @if (isAdmin()) {
      <div class="bg-white rounded-xl border border-surface-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-surface-800">Agent Workload</h3>
          <a routerLink="/reports/agents" class="text-xs text-primary-600 hover:text-primary-700">
            View full report <i class="pi pi-arrow-right ml-1 text-xs"></i>
          </a>
        </div>

        @if (isLoading()) {
          <div class="space-y-3">
            @for (i of [1,2,3,4]; track i) {
              <div class="flex items-center gap-3">
                <p-skeleton shape="circle" size="36px" />
                <div class="flex-1">
                  <p-skeleton width="120px" height="14px" />
                </div>
                <p-skeleton width="60px" height="24px" />
                <p-skeleton width="60px" height="24px" />
              </div>
            }
          </div>
        } @else if (agentWorkload().length === 0) {
          <app-empty-state
            icon="pi pi-users"
            title="No agent data"
            description="No tickets are currently assigned to agents."
          />
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-surface-200">
                  <th class="text-left pb-3 text-surface-500 font-medium text-xs uppercase tracking-wide">Agent</th>
                  <th class="text-center pb-3 text-surface-500 font-medium text-xs uppercase tracking-wide">Open</th>
                  <th class="text-center pb-3 text-surface-500 font-medium text-xs uppercase tracking-wide">In Progress</th>
                  <th class="text-center pb-3 text-surface-500 font-medium text-xs uppercase tracking-wide">Total Active</th>
                </tr>
              </thead>
              <tbody>
                @for (agent of agentWorkload(); track agent.agent_id) {
                  <tr class="border-b border-surface-100 last:border-0">
                    <td class="py-3">
                      <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span class="text-xs font-bold text-primary-600">
                            {{ agent.agent_name.charAt(0).toUpperCase() }}
                          </span>
                        </div>
                        <span class="font-medium text-surface-800">{{ agent.agent_name }}</span>
                      </div>
                    </td>
                    <td class="py-3 text-center">
                      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {{ agent.open_tickets }}
                      </span>
                    </td>
                    <td class="py-3 text-center">
                      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                        {{ agent.in_progress_tickets }}
                      </span>
                    </td>
                    <td class="py-3 text-center">
                      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface-100 text-surface-700 font-bold text-sm">
                        {{ agent.open_tickets + agent.in_progress_tickets }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }
  `,
})
export class DashboardComponent implements OnInit, OnDestroy {
  private dashboardService = inject(DashboardService);
  private authService = inject(AuthService);

  protected stats = this.dashboardService.stats;
  protected agentWorkload = this.dashboardService.agentWorkload;
  protected trendData = this.dashboardService.trendData;
  protected isLoading = this.dashboardService.isLoading;
  protected error = this.dashboardService.error;
  protected isAdmin = this.authService.isAdmin;

  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private readonly REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  protected readonly slaMet = computed(() => {
    const s = this.stats();
    return s.resolved + s.closed - s.sla_breached;
  });

  protected lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, stepSize: 1 } },
    },
  };

  protected donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '70%',
  };

  protected readonly trendChartData = computed(() => {
    const data = this.trendData();
    const labels = data.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });
    return {
      labels,
      datasets: [
        {
          label: 'Created',
          data: data.map(d => d.created),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
        {
          label: 'Resolved',
          data: data.map(d => d.resolved),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16,185,129,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        },
      ],
    };
  });

  protected readonly slaChartData = computed(() => {
    const met = Math.max(0, this.slaMet());
    const breached = Math.max(0, this.stats().sla_breached);
    return {
      datasets: [{
        data: [met || 1, breached],
        backgroundColor: ['#10B981', '#EF4444'],
        borderWidth: 0,
      }],
    };
  });

  ngOnInit(): void {
    this.loadDashboard();
    this.refreshInterval = setInterval(() => this.loadDashboard(), this.REFRESH_INTERVAL_MS);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  loadDashboard(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return; // Profile not loaded yet — don't query with empty UUID
    const roleSlug = this.authService.userRole() ?? 'end_user';
    this.dashboardService.loadDashboard(roleSlug, userId);
  }
}
