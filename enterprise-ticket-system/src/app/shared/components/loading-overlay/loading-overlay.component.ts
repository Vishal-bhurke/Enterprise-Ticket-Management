import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  template: `
    <div class="flex flex-col items-center justify-center py-16 gap-4">
      <p-progressSpinner
        strokeWidth="4"
        animationDuration="0.8s"
        styleClass="w-12 h-12"
      />
      <p class="text-surface-500 text-sm">{{ message }}</p>
    </div>
  `,
})
export class LoadingOverlayComponent {
  @Input() message = 'Loading...';
}
