import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastModule, ConfirmDialogModule, ProgressSpinnerModule],
  template: `
    <p-toast position="top-right" />
    <p-confirmDialog />

    <!-- Global app-initialization loading screen
         Shown while AuthService restores session + loads profile from Supabase.
         Prevents a flash of the login page or an unauthenticated shell. -->
    @if (isInitializing()) {
      <div class="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999] gap-5">
        <!-- Brand mark -->
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <i class="pi pi-ticket text-white text-xl"></i>
          </div>
          <div class="leading-tight">
            <p class="font-bold text-surface-900 text-lg leading-none">Enterprise Ticket</p>
            <p class="text-primary-500 text-sm font-medium">System</p>
          </div>
        </div>

        <!-- Spinner -->
        <p-progressSpinner
          strokeWidth="4"
          animationDuration="0.75s"
          styleClass="w-10 h-10"
        />

        <p class="text-surface-400 text-sm">Loading your workspace&hellip;</p>
      </div>
    } @else {
      <router-outlet />
    }
  `,
})
export class AppComponent {
  protected isInitializing = inject(AuthService).isInitializing;
}
