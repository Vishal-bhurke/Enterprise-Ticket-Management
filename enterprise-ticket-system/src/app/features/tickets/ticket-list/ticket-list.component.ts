import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { AvatarModule } from 'primeng/avatar';
import { TicketService } from '../services/ticket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SUPABASE_CLIENT } from '../../../core/supabase/supabase.client';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { PriorityBadgeComponent } from '../../../shared/components/priority-badge/priority-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { TicketStatus, TicketPriority, DEFAULT_TICKET_FILTERS, TicketFilterParams } from '../../../shared/models/ticket.model';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    AvatarModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    EmptyStateComponent,
    ErrorBannerComponent,
    TimeAgoPipe,
  ],
  template: `
    <app-page-header
      [title]="myTickets ? 'My Tickets' : 'All Tickets'"
      [subtitle]="myTickets ? 'Tickets you created or are assigned to' : 'All tickets in the system'"
      [breadcrumbs]="['Home', 'Tickets', myTickets ? 'My Tickets' : 'All Tickets']"
    >
      <div class="flex items-center gap-2">
        <!-- View toggle (board not available for end_user) -->
        @if (canManageTickets()) {
          <div class="flex items-center border border-surface-200 rounded-lg overflow-hidden">
            <span class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white font-medium">
              <i class="pi pi-list text-sm"></i>
              Table
            </span>
            <a
              routerLink="/tickets/board"
              class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 font-medium transition-colors"
            >
              <i class="pi pi-th-large text-sm"></i>
              Board
            </a>
          </div>
        }
        <p-button
          label="Create Ticket"
          icon="pi pi-plus"
          routerLink="/tickets/create"
          size="small"
        />
      </div>
    </app-page-header>

    <!-- Filter Bar -->
    <div class="bg-white rounded-xl border border-surface-200 p-4 mb-4">
      <div class="flex items-center gap-3 flex-wrap">
        <!-- Search -->
        <div class="relative flex-1 min-w-[220px] max-w-sm">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm z-10"></i>
          <input
            pInputText
            type="text"
            placeholder="Search by title or ticket number..."
            [(ngModel)]="searchValue"
            (ngModelChange)="onSearchChange($event)"
            class="pl-9 w-full text-sm"
          />
        </div>

        <!-- Status Filter -->
        <p-dropdown
          [options]="statusOptions"
          [(ngModel)]="selectedStatusId"
          optionLabel="name"
          optionValue="id"
          placeholder="All Statuses"
          [showClear]="true"
          (ngModelChange)="applyFilters()"
          appendTo="body"
        />

        <!-- Priority Filter -->
        <p-dropdown
          [options]="priorityOptions"
          [(ngModel)]="selectedPriorityId"
          optionLabel="name"
          optionValue="id"
          placeholder="All Priorities"
          [showClear]="true"
          (ngModelChange)="applyFilters()"
          appendTo="body"
        />

        <!-- Clear Filters -->
        @if (hasActiveFilters()) {
          <button
            type="button"
            class="text-sm text-surface-500 hover:text-surface-700 flex items-center gap-1 underline"
            (click)="clearFilters()"
          >
            <i class="pi pi-times text-xs"></i>
            Clear filters
          </button>
        }

        <!-- Ticket count -->
        <span class="ml-auto text-sm text-surface-500">
          {{ totalCount() }} ticket{{ totalCount() !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <!-- Error -->
    @if (error() && !isLoading()) {
      <app-error-banner [message]="error()!" (retry)="loadTickets()" />
    }

    <!-- Content -->
    <div class="bg-white rounded-xl border border-surface-200 overflow-hidden">

      <!-- Table Header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-surface-100">
        <span class="text-sm text-surface-500">
          @if (isLoading()) {
            Loading...
          } @else {
            {{ totalCount() }} ticket{{ totalCount() !== 1 ? 's' : '' }} total
          }
        </span>
        <div class="flex items-center gap-2">
          <span class="text-xs text-surface-400">
            Page {{ filters().page }} of {{ totalPages() }}
          </span>
        </div>
      </div>

      <!-- Skeleton Loading -->
      @if (isLoading()) {
        <div class="divide-y divide-surface-100">
          @for (i of skeletonRows; track i) {
            <div class="px-5 py-4 flex items-center gap-4">
              <div class="flex-shrink-0">
                <p-skeleton width="80px" height="18px" />
              </div>
              <div class="flex-1">
                <p-skeleton width="60%" height="16px" styleClass="mb-1" />
                <p-skeleton width="30%" height="13px" />
              </div>
              <p-skeleton width="80px" height="24px" />
              <p-skeleton width="80px" height="24px" />
              <p-skeleton shape="circle" size="28px" />
              <p-skeleton width="60px" height="13px" />
            </div>
          }
        </div>
      }

      <!-- Empty State -->
      @if (!isLoading() && isEmpty()) {
        <app-empty-state
          icon="pi pi-ticket"
          [title]="hasActiveFilters() ? 'No matching tickets' : 'No tickets yet'"
          [description]="hasActiveFilters() ? 'Try adjusting your filters.' : 'Create your first ticket to get started.'"
          [actionLabel]="hasActiveFilters() ? undefined : 'Create Ticket'"
          (action)="router.navigate(['/tickets/create'])"
        />
      }

      <!-- Data Table -->
      @if (!isLoading() && !isEmpty()) {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-surface-50 border-b border-surface-200">
              <tr>
                <th class="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Ticket</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Status</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Priority</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Assignee</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Created</th>
                @if (canManageTickets()) {
                  <th class="text-right px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wide">Actions</th>
                }
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-100">
              @for (ticket of tickets(); track ticket.id) {
                <tr
                  class="hover:bg-surface-50 cursor-pointer transition-colors"
                  (click)="viewTicket(ticket.id)"
                >
                  <td class="px-5 py-4">
                    <div class="flex items-start gap-2">
                      @if (ticket.is_escalated) {
                        <span pTooltip="Escalated" tooltipPosition="top">
                          <i class="pi pi-arrow-up text-orange-500 text-xs mt-0.5 flex-shrink-0"></i>
                        </span>
                      }
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                            {{ ticket.ticket_number }}
                          </span>
                          @if (ticket.ticket_type) {
                            <span class="text-xs text-surface-400">
                              {{ ticket.ticket_type.name }}
                            </span>
                          }
                        </div>
                        <p class="font-medium text-surface-800 mt-1 line-clamp-1">{{ ticket.title }}</p>
                        @if (ticket.category) {
                          <span class="text-xs text-surface-400 mt-0.5">{{ ticket.category.name }}</span>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-4">
                    @if (ticket.status) {
                      <app-status-badge [status]="ticket.status" />
                    }
                  </td>
                  <td class="px-4 py-4">
                    @if (ticket.priority) {
                      <app-priority-badge [priority]="ticket.priority" />
                    }
                  </td>
                  <td class="px-4 py-4">
                    @if (ticket.assignee) {
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <span class="text-xs font-bold text-primary-600">
                            {{ (ticket.assignee.full_name ?? 'U').charAt(0).toUpperCase() }}
                          </span>
                        </div>
                        <span class="text-xs text-surface-700 line-clamp-1">{{ ticket.assignee.full_name }}</span>
                      </div>
                    } @else {
                      <span class="text-xs text-surface-400 italic">Unassigned</span>
                    }
                  </td>
                  <td class="px-4 py-4 text-xs text-surface-500 whitespace-nowrap">
                    {{ ticket.created_at | timeAgo }}
                  </td>
                  @if (canManageTickets()) {
                    <td class="px-5 py-4 text-right" (click)="$event.stopPropagation()">
                      <p-button
                        icon="pi pi-trash"
                        severity="danger"
                        [text]="true"
                        size="small"
                        pTooltip="Delete ticket"
                        tooltipPosition="left"
                        (onClick)="confirmDelete(ticket.id, ticket.ticket_number)"
                      />
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="flex items-center justify-between px-5 py-4 border-t border-surface-100">
            <p-button
              label="Previous"
              icon="pi pi-chevron-left"
              severity="secondary"
              size="small"
              [disabled]="filters().page === 1"
              (onClick)="goToPage(filters().page - 1)"
            />
            <span class="text-sm text-surface-600">
              Page <strong>{{ filters().page }}</strong> of <strong>{{ totalPages() }}</strong>
            </span>
            <p-button
              label="Next"
              icon="pi pi-chevron-right"
              iconPos="right"
              severity="secondary"
              size="small"
              [disabled]="filters().page >= totalPages()"
              (onClick)="goToPage(filters().page + 1)"
            />
          </div>
        }
      }
    </div>
  `,
})
export class TicketListComponent implements OnInit, OnDestroy {
  @Input() myTickets = false;

  protected ticketService = inject(TicketService);
  protected router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);
  private toastService = inject(ToastService);

  // From service signals
  protected tickets = this.ticketService.tickets;
  protected isLoading = this.ticketService.isLoading;
  protected error = this.ticketService.error;
  protected isEmpty = this.ticketService.isEmpty;
  protected totalCount = this.ticketService.totalCount;
  protected totalPages = this.ticketService.totalPages;
  protected filters = this.ticketService.filters;
  protected canManageTickets = this.authService.canManageTickets;

  // Filter state
  protected searchValue = '';
  protected selectedStatusId: string | null = null;
  protected selectedPriorityId: string | null = null;
  protected statusOptions: TicketStatus[] = [];
  protected priorityOptions: TicketPriority[] = [];
  protected skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;
  private supabaseClient = inject(SUPABASE_CLIENT);

  ngOnInit(): void {
    // Handle route data for "my tickets"
    const routeData = this.route.snapshot.data;
    if (routeData['myTickets']) {
      this.myTickets = true;
    }
    this.loadFilterOptions();
    this.loadTickets();
  }

  ngOnDestroy(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
  }

  protected hasActiveFilters(): boolean {
    return !!(this.searchValue || this.selectedStatusId || this.selectedPriorityId);
  }

  protected onSearchChange(value: string): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFilters();
    }, 400);
  }

  protected applyFilters(): void {
    const params: TicketFilterParams = {
      ...DEFAULT_TICKET_FILTERS,
      page: 1,
      search: this.searchValue || undefined,
      status_id: this.selectedStatusId ?? undefined,
      priority_id: this.selectedPriorityId ?? undefined,
    };
    const userId = this.myTickets ? (this.authService.currentUser()?.id ?? '') : undefined;
    this.ticketService.getTickets(params, userId);
  }

  protected clearFilters(): void {
    this.searchValue = '';
    this.selectedStatusId = null;
    this.selectedPriorityId = null;
    this.loadTickets();
  }

  protected goToPage(page: number): void {
    const params: TicketFilterParams = { ...this.filters(), page };
    const userId = this.myTickets ? (this.authService.currentUser()?.id ?? '') : undefined;
    this.ticketService.getTickets(params, userId);
  }

  protected viewTicket(id: string): void {
    this.router.navigate(['/tickets', id]);
  }

  protected confirmDelete(id: string, ticketNumber: string): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ticket <strong>${ticketNumber}</strong>? This action cannot be undone.`,
      header: 'Delete Ticket',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        await this.ticketService.deleteTicket(id);
      },
    });
  }

  loadTickets(): void {
    const userId = this.myTickets ? (this.authService.currentUser()?.id ?? '') : undefined;
    this.ticketService.getTickets({ ...DEFAULT_TICKET_FILTERS }, userId);
  }

  private async loadFilterOptions(): Promise<void> {
    const client = this.supabaseClient;

    const [statusRes, priorityRes] = await Promise.all([
      client.from('statuses').select('id, name, slug, color, category, is_closed').eq('is_active', true).order('sort_order'),
      client.from('priorities').select('id, name, slug, color, level, icon, sla_multiplier, is_active').eq('is_active', true).order('level'),
    ]);

    if (statusRes.data) this.statusOptions = statusRes.data as TicketStatus[];
    if (priorityRes.data) this.priorityOptions = priorityRes.data as TicketPriority[];
  }
}
