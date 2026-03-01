import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  template: `
    <div class="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div class="w-16 h-16 rounded-full bg-surface-100 flex items-center justify-center mb-2">
        <i [class]="icon + ' text-3xl text-surface-400'"></i>
      </div>
      <h3 class="text-lg font-semibold text-surface-700">{{ title }}</h3>
      <p class="text-surface-500 text-sm max-w-xs">{{ description }}</p>
      @if (actionLabel) {
        <p-button
          [label]="actionLabel"
          [icon]="actionIcon || 'pi pi-plus'"
          severity="primary"
          (onClick)="action.emit()"
          class="mt-2"
        />
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() icon = 'pi pi-inbox';
  @Input({ required: true }) title!: string;
  @Input() description = 'No records found.';
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Output() action = new EventEmitter<void>();
}
