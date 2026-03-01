import { Component, inject } from '@angular/core';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ConfirmDialogModule],
  template: `<p-confirmDialog />`,
})
export class ConfirmDialogComponent {
  private confirmationService = inject(ConfirmationService);

  confirm(options: {
    message: string;
    header?: string;
    onAccept: () => void;
    onReject?: () => void;
  }): void {
    this.confirmationService.confirm({
      message: options.message,
      header: options.header ?? 'Confirm Action',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: options.onAccept,
      reject: options.onReject,
    });
  }
}
