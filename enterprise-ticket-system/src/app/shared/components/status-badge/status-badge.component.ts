import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketStatus } from '../../models/ticket.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      [style.backgroundColor]="hexToRgba(status.color, 0.15)"
      [style.color]="status.color"
      [style.borderColor]="hexToRgba(status.color, 0.3)"
      style="border: 1px solid"
    >
      <span
        class="w-1.5 h-1.5 rounded-full inline-block"
        [style.backgroundColor]="status.color"
      ></span>
      {{ status.name }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: TicketStatus;

  hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(100,116,139,${alpha})`;
    return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
  }
}
