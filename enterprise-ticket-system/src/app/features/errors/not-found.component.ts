import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, ButtonModule],
  template: `
    <div class="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div class="text-center">
        <div class="text-9xl font-black text-surface-200 mb-4">404</div>
        <h1 class="text-3xl font-bold text-surface-800 mb-2">Page Not Found</h1>
        <p class="text-surface-500 mb-8 max-w-md">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <p-button
          label="Go to Dashboard"
          icon="pi pi-home"
          routerLink="/dashboard"
          size="large"
        />
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
