import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-6">
      <div class="flex items-center gap-2 text-sm text-surface-500 mb-1">
        @for (crumb of breadcrumbs; track crumb) {
          <span>{{ crumb }}</span>
          @if (!$last) {
            <i class="pi pi-chevron-right text-xs"></i>
          }
        }
      </div>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-surface-900">{{ title }}</h1>
          @if (subtitle) {
            <p class="text-surface-500 text-sm mt-1">{{ subtitle }}</p>
          }
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() breadcrumbs: string[] = [];
}
