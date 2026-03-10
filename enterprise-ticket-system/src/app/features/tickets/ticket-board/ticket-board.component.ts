import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { TicketBoardService } from '../services/ticket-board.service';
import { TicketService } from '../services/ticket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { TicketColumnComponent } from './ticket-column.component';
import { TicketBoardQuickEditComponent } from './ticket-board-quick-edit.component';
import { Ticket } from '../../../shared/models/ticket.model';

@Component({
  selector: 'app-ticket-board',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DragDropModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    SkeletonModule,
    TooltipModule,
    PageHeaderComponent,
    ErrorBannerComponent,
    TicketColumnComponent,
    TicketBoardQuickEditComponent,
  ],
  template: `
    <app-page-header
      title="Ticket Board"
      subtitle="Drag and drop tickets to update their status"
      [breadcrumbs]="['Home', 'Tickets', 'Board']"
    >
      <div class="flex items-center gap-2">
        <!-- View toggle -->
        <div class="flex items-center border border-surface-200 rounded-lg overflow-hidden">
          <a
            routerLink="/tickets"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm text-surface-600 hover:bg-surface-100 font-medium transition-colors"
          >
            <i class="pi pi-list text-sm"></i>
            Table
          </a>
          <span class="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white font-medium">
            <i class="pi pi-th-large text-sm"></i>
            Board
          </span>
        </div>
        <p-button
          label="Create Ticket"
          icon="pi pi-plus"
          size="small"
          routerLink="/tickets/create"
        />
      </div>
    </app-page-header>

    <!-- Error banner -->
    @if (boardService.error() && !boardService.isLoading()) {
      <app-error-banner
        [message]="boardService.error()!"
        (retry)="loadBoard()"
      />
    }

    <!-- Filter bar -->
    <div class="bg-white border border-surface-200 rounded-xl p-4 mb-4">
      <div class="flex items-center gap-3 flex-wrap">
        <!-- Search -->
        <div class="relative flex-1 min-w-[200px] max-w-xs">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm z-10"></i>
          <input
            pInputText
            placeholder="Search tickets..."
            [ngModel]="boardService.searchQuery()"
            (ngModelChange)="boardService.searchQuery.set($event)"
            class="pl-9 w-full text-sm"
          />
        </div>

        <!-- Priority filter -->
        <p-dropdown
          [options]="boardService.priorities()"
          optionLabel="name"
          optionValue="id"
          placeholder="All Priorities"
          [showClear]="true"
          [ngModel]="boardService.filterPriorityId()"
          (ngModelChange)="boardService.filterPriorityId.set($event)"
          appendTo="body"
        />

        <!-- Category filter -->
        <p-dropdown
          [options]="boardService.categories()"
          optionLabel="name"
          optionValue="id"
          placeholder="All Categories"
          [showClear]="true"
          [ngModel]="boardService.filterCategoryId()"
          (ngModelChange)="boardService.filterCategoryId.set($event)"
          appendTo="body"
        />

        <!-- Assignee filter (agents/admins only) -->
        @if (canManage()) {
          <p-dropdown
            [options]="boardService.agents()"
            optionLabel="full_name"
            optionValue="id"
            placeholder="All Agents"
            [showClear]="true"
            [filter]="true"
            filterBy="full_name"
            [ngModel]="boardService.filterAssigneeId()"
            (ngModelChange)="boardService.filterAssigneeId.set($event)"
            appendTo="body"
          />
        }

        <!-- Clear filters -->
        @if (hasActiveFilters()) {
          <button
            type="button"
            class="text-sm text-surface-500 hover:text-surface-700 flex items-center gap-1 underline"
            (click)="boardService.clearFilters()"
          >
            <i class="pi pi-times text-xs"></i>
            Clear filters
          </button>
        }

        <!-- Ticket count -->
        <span class="ml-auto text-sm text-surface-500">
          {{ boardService.totalVisibleTickets() }} ticket{{ boardService.totalVisibleTickets() !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <!-- Loading skeleton -->
    @if (boardService.isLoading()) {
      <div class="flex gap-4 overflow-x-auto pb-4 items-start">
        @for (i of skeletonCols; track i) {
          <div class="w-72 min-w-[288px] bg-surface-50 rounded-xl border border-surface-200 p-4 flex-shrink-0">
            <div class="flex items-center justify-between mb-4">
              <p-skeleton width="100px" height="16px" />
              <p-skeleton width="28px" height="20px" borderRadius="999px" />
            </div>
            @for (j of [1,2,3]; track j) {
              <p-skeleton height="88px" styleClass="mb-2" borderRadius="8px" />
            }
          </div>
        }
      </div>
    }

    <!-- Board columns (horizontal scroll, CDK drop list group for cross-column drag) -->
    @if (!boardService.isLoading() && !boardService.error()) {
      <div
        cdkDropListGroup
        class="flex gap-4 overflow-x-auto pb-4 items-start"
      >
        @for (col of boardService.filteredColumns(); track col.status.id) {
          <app-ticket-column
            class="flex-shrink-0"
            [column]="col"
            [canManage]="canManage()"
            (dropped)="onDrop($event)"
            (quickEdit)="openQuickEdit($event)"
          />
        }

        @if (boardService.filteredColumns().length === 0) {
          <div class="flex-1 flex items-center justify-center py-16 text-surface-400">
            <div class="text-center">
              <i class="pi pi-th-large text-5xl block mb-3 opacity-30"></i>
              <p class="font-medium text-surface-600">No status columns found</p>
              <p class="text-sm mt-1">Check that statuses are configured in Masters → Statuses.</p>
            </div>
          </div>
        }
      </div>
    }

    <!-- Quick edit dialog -->
    <app-ticket-board-quick-edit
      [ticket]="editingTicket"
      [statuses]="boardService.statuses()"
      [priorities]="boardService.priorities()"
      [agents]="boardService.agents()"
      (saved)="onQuickEditSaved()"
      (closed)="editingTicket = null"
    />
  `,
})
export class TicketBoardComponent implements OnInit, OnDestroy {
  protected boardService = inject(TicketBoardService);
  private ticketService = inject(TicketService);
  private authService = inject(AuthService);

  protected canManage = this.authService.canManageTickets;
  protected editingTicket: Ticket | null = null;
  protected readonly skeletonCols = [1, 2, 3, 4, 5];

  protected readonly hasActiveFilters = computed(() =>
    this.boardService.filterPriorityId() !== null ||
    this.boardService.filterCategoryId() !== null ||
    this.boardService.filterAssigneeId() !== null ||
    this.boardService.searchQuery() !== ''
  );

  ngOnInit(): void {
    this.loadBoard();
    this.boardService.subscribeRealtime();
  }

  ngOnDestroy(): void {
    this.boardService.unsubscribeRealtime();
  }

  protected loadBoard(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;
    const roleSlug = this.authService.userRole() ?? 'end_user';
    this.boardService.loadBoard(roleSlug, userId);
  }

  protected onDrop(payload: { event: CdkDragDrop<Ticket[]>; statusId: string }): void {
    const { event, statusId } = payload;
    // Skip same-column drops (no status change needed)
    if (event.previousContainer === event.container) return;

    const ticket: Ticket = event.item.data;
    if (!ticket?.id) return;

    // Only move if the ticket isn't already in the target status
    if (ticket.status_id === statusId) return;

    this.boardService.moveTicket(ticket.id, statusId);
  }

  protected openQuickEdit(ticket: Ticket): void {
    this.editingTicket = ticket;
  }

  protected onQuickEditSaved(): void {
    this.editingTicket = null;
    // Reload board to reflect changes
    this.loadBoard();
  }
}
