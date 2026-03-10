import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { TooltipModule } from 'primeng/tooltip';
import { PriorityBadgeComponent } from '../../../shared/components/priority-badge/priority-badge.component';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago.pipe';
import { Ticket } from '../../../shared/models/ticket.model';

@Component({
  selector: 'app-ticket-card',
  standalone: true,
  imports: [CommonModule, RouterLink, DragDropModule, TooltipModule, PriorityBadgeComponent, TimeAgoPipe],
  template: `
    <div
      cdkDrag
      [cdkDragData]="ticket"
      [cdkDragDisabled]="!canManage"
      [class]="'bg-white rounded-lg border border-surface-200 p-3 shadow-sm hover:shadow-md transition-shadow duration-150 border-l-4 ' + priorityBorderClass()"
      [class.cursor-grab]="canManage"
      [class.active:cursor-grabbing]="canManage"
    >
      <!-- Drag placeholder -->
      <div *cdkDragPlaceholder
           class="h-28 rounded-lg bg-primary-50 border-2 border-dashed border-primary-300">
      </div>

      <!-- Row 1: Ticket number + Priority badge -->
      <div class="flex items-center justify-between mb-2">
        <a
          [routerLink]="['/tickets', ticket.id]"
          class="font-mono text-xs text-primary-600 font-bold hover:underline"
          (click)="$event.stopPropagation()"
        >
          {{ ticket.ticket_number }}
        </a>
        @if (ticket.priority) {
          <app-priority-badge [priority]="ticket.priority" />
        }
      </div>

      <!-- Row 2: Title (2-line clamp) -->
      <p class="text-sm font-medium text-surface-800 leading-snug mb-2"
         style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
        {{ ticket.title }}
      </p>

      <!-- Row 3: Category tag -->
      @if (ticket.category) {
        <span class="inline-block text-xs px-1.5 py-0.5 bg-surface-100 text-surface-500 rounded mb-2">
          {{ ticket.category.name }}
        </span>
      }

      <!-- Row 4: Assignee + Date + Quick edit -->
      <div class="flex items-center justify-between pt-2 border-t border-surface-100 mt-1">
        <div class="flex items-center gap-1.5 min-w-0">
          @if (ticket.assignee) {
            <div class="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-primary-600">
                {{ (ticket.assignee.full_name ?? 'U').charAt(0).toUpperCase() }}
              </span>
            </div>
            <span class="text-xs text-surface-500 truncate max-w-[80px]">{{ ticket.assignee.full_name }}</span>
          } @else {
            <span class="text-xs text-surface-400 italic">Unassigned</span>
          }
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <span class="text-xs text-surface-400">{{ ticket.created_at | timeAgo }}</span>
          @if (canManage) {
            <button
              type="button"
              class="p-0.5 rounded hover:text-primary-600 hover:bg-primary-50 transition-colors"
              pTooltip="Quick edit"
              tooltipPosition="left"
              (click)="$event.stopPropagation(); quickEdit.emit(ticket)"
            >
              <i class="pi pi-pencil text-xs text-surface-400 hover:text-primary-600"></i>
            </button>
          }
        </div>
      </div>

      <!-- Escalated badge -->
      @if (ticket.is_escalated) {
        <div class="mt-2 flex items-center gap-1 text-xs text-orange-600 font-medium">
          <i class="pi pi-arrow-up text-xs"></i>
          <span>Escalated</span>
        </div>
      }
    </div>
  `,
})
export class TicketCardComponent {
  @Input({ required: true }) ticket!: Ticket;
  @Input() canManage = false;
  @Output() quickEdit = new EventEmitter<Ticket>();

  protected priorityBorderClass(): string {
    switch (this.ticket.priority?.level) {
      case 4: return 'border-l-red-500';
      case 3: return 'border-l-orange-500';
      case 2: return 'border-l-yellow-500';
      default: return 'border-l-green-500';
    }
  }
}
