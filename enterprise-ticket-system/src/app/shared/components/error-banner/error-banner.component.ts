import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule, ButtonModule, MessageModule],
  template: `
    <div class="flex flex-col items-center justify-center py-16 gap-4">
      <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg w-full text-center">
        <i class="pi pi-exclamation-triangle text-4xl text-red-500 mb-3 block"></i>
        <h3 class="text-red-700 font-semibold text-lg mb-1">Something went wrong</h3>
        <p class="text-red-600 text-sm mb-4">{{ message }}</p>
        @if (showRetry) {
          <p-button
            label="Try Again"
            icon="pi pi-refresh"
            severity="danger"
            [outlined]="true"
            size="small"
            (onClick)="retry.emit()"
          />
        }
      </div>
    </div>
  `,
})
export class ErrorBannerComponent {
  @Input({ required: true }) message!: string;
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();
}
