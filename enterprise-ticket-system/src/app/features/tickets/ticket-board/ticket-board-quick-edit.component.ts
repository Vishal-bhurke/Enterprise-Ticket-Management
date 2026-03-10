import { Component, EventEmitter, inject, Input, OnChanges, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { TicketService } from '../services/ticket.service';
import { ToastService } from '../../../core/services/toast.service';
import { Ticket, TicketPriority, TicketStatus } from '../../../shared/models/ticket.model';
import { Profile } from '../../../shared/models/user.model';

@Component({
  selector: 'app-ticket-board-quick-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, DropdownModule],
  template: `
    <p-dialog
      [(visible)]="visible"
      [header]="ticket ? 'Edit ' + ticket.ticket_number : 'Edit Ticket'"
      [modal]="true"
      [style]="{ width: '480px' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="closed.emit()"
    >
      @if (ticket) {
        <div class="flex flex-col gap-4 py-2">
          <!-- Ticket title (read-only reference) -->
          <div class="p-3 bg-surface-50 rounded-lg border border-surface-200">
            <p class="text-xs text-surface-500 mb-1">Ticket</p>
            <p class="text-sm font-medium text-surface-800 leading-snug">{{ ticket.title }}</p>
          </div>

          <!-- Status -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Status</label>
            <p-dropdown
              [(ngModel)]="editStatusId"
              [options]="statuses"
              optionLabel="name"
              optionValue="id"
              placeholder="Select status"
              appendTo="body"
              class="w-full"
            />
          </div>

          <!-- Priority -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Priority</label>
            <p-dropdown
              [(ngModel)]="editPriorityId"
              [options]="priorities"
              optionLabel="name"
              optionValue="id"
              placeholder="Select priority"
              appendTo="body"
              class="w-full"
            />
          </div>

          <!-- Assignee -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium text-surface-700">Assignee</label>
            <p-dropdown
              [(ngModel)]="editAssigneeId"
              [options]="agents"
              optionLabel="full_name"
              optionValue="id"
              placeholder="Unassigned"
              [showClear]="true"
              [filter]="true"
              filterBy="full_name"
              appendTo="body"
              class="w-full"
            />
          </div>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex items-center justify-end gap-2">
            <p-button
              label="Cancel"
              severity="secondary"
              [outlined]="true"
              (onClick)="close()"
            />
            <p-button
              label="Save Changes"
              icon="pi pi-check"
              [loading]="isSaving()"
              (onClick)="save()"
            />
          </div>
        </ng-template>
      }
    </p-dialog>
  `,
})
export class TicketBoardQuickEditComponent implements OnChanges {
  private ticketService = inject(TicketService);
  private toastService = inject(ToastService);

  @Input() ticket: Ticket | null = null;
  @Input() statuses: TicketStatus[] = [];
  @Input() priorities: TicketPriority[] = [];
  @Input() agents: Partial<Profile>[] = [];
  @Output() saved = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  protected visible = false;
  protected editStatusId = '';
  protected editPriorityId = '';
  protected editAssigneeId: string | null = null;
  protected readonly isSaving = signal(false);

  ngOnChanges(): void {
    if (this.ticket) {
      this.editStatusId = this.ticket.status_id;
      this.editPriorityId = this.ticket.priority_id;
      this.editAssigneeId = this.ticket.assignee_id;
      this.visible = true;
    }
  }

  async save(): Promise<void> {
    if (!this.ticket) return;
    this.isSaving.set(true);
    try {
      const result = await this.ticketService.updateTicket(this.ticket.id, {
        status_id: this.editStatusId,
        priority_id: this.editPriorityId,
        assignee_id: this.editAssigneeId ?? undefined,
      });
      if (result.success) {
        this.saved.emit();
        this.close();
      }
    } finally {
      this.isSaving.set(false);
    }
  }

  protected close(): void {
    this.visible = false;
    this.closed.emit();
  }
}
