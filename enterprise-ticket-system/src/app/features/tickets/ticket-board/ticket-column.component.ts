import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { SkeletonModule } from 'primeng/skeleton';
import { TicketCardComponent } from './ticket-card.component';
import { BoardColumn } from '../services/ticket-board.service';
import { Ticket } from '../../../shared/models/ticket.model';

@Component({
  selector: 'app-ticket-column',
  standalone: true,
  imports: [CommonModule, DragDropModule, SkeletonModule, TicketCardComponent],
  template: `
    <div class="flex flex-col w-72 min-w-[288px] bg-surface-50 rounded-xl border border-surface-200"
         style="max-height: calc(100vh - 260px)">

      <!-- Column header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-surface-200 flex-shrink-0">
        <div class="flex items-center gap-2">
          <div
            class="w-2.5 h-2.5 rounded-full flex-shrink-0"
            [style.background-color]="column.status.color"
          ></div>
          <span class="font-semibold text-sm text-surface-700">{{ column.status.name }}</span>
        </div>
        <span class="text-xs font-semibold bg-surface-200 text-surface-600 rounded-full px-2 py-0.5 min-w-[24px] text-center">
          {{ column.tickets.length }}
        </span>
      </div>

      <!-- Drop zone — scrollable ticket list -->
      <div
        cdkDropList
        [cdkDropListData]="column.tickets"
        (cdkDropListDropped)="onDropped($event)"
        class="flex-1 overflow-y-auto p-3 space-y-2"
        style="min-height: 80px"
      >
        @for (ticket of column.tickets; track ticket.id) {
          <app-ticket-card
            [ticket]="ticket"
            [canManage]="canManage"
            (quickEdit)="quickEdit.emit($event)"
          />
        }

        @if (column.tickets.length === 0) {
          <div class="flex items-center justify-center text-surface-300 text-sm italic py-6">
            <div class="text-center">
              <i class="pi pi-inbox text-2xl block mb-1 opacity-40"></i>
              <span>No tickets</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class TicketColumnComponent {
  @Input({ required: true }) column!: BoardColumn;
  @Input() canManage = false;
  @Output() dropped = new EventEmitter<{ event: CdkDragDrop<Ticket[]>; statusId: string }>();
  @Output() quickEdit = new EventEmitter<Ticket>();

  protected onDropped(event: CdkDragDrop<Ticket[]>): void {
    this.dropped.emit({ event, statusId: this.column.status.id });
  }
}
