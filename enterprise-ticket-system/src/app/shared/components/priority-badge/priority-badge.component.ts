import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketPriority } from '../../models/ticket.model';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide"
      [style.color]="priority.color"
      [style.backgroundColor]="hexToRgba(priority.color, 0.1)"
    >
      <i [class]="getPriorityIcon()"></i>
      {{ priority.name }}
    </span>
  `,
})
export class PriorityBadgeComponent {
  @Input({ required: true }) priority!: TicketPriority;

  getPriorityIcon(): string {
    const icons: Record<number, string> = {
      1: 'pi pi-chevron-double-up text-xs',
      2: 'pi pi-chevron-up text-xs',
      3: 'pi pi-minus text-xs',
      4: 'pi pi-chevron-down text-xs',
    };
    return icons[this.priority.level] ?? 'pi pi-minus text-xs';
  }

  hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(100,116,139,${alpha})`;
    return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
  }
}
