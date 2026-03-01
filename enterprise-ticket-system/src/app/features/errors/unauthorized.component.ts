import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div class="text-center">
        <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <i class="pi pi-lock text-4xl text-red-500"></i>
        </div>
        <h1 class="text-3xl font-bold text-surface-800 mb-2">Access Denied</h1>
        <p class="text-surface-500 mb-8 max-w-md">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <div class="flex items-center justify-center gap-3">
          <p-button
            label="Go Back"
            icon="pi pi-arrow-left"
            severity="secondary"
            [outlined]="true"
            (onClick)="goBack()"
          />
          <p-button
            label="Go to Dashboard"
            icon="pi pi-home"
            routerLink="/dashboard"
          />
        </div>
      </div>
    </div>
  `,
})
export class UnauthorizedComponent {
  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
