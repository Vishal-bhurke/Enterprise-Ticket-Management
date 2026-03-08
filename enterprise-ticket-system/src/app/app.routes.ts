import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  // Auth routes (public)
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },

  // Protected app shell
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
      },
      {
        path: 'tickets',
        loadChildren: () => import('./features/tickets/tickets.routes').then(m => m.TICKET_ROUTES),
      },
      {
        path: 'workflow',
        canActivate: [roleGuard(['super_admin'])],
        loadChildren: () => import('./features/workflow/workflow.routes').then(m => m.WORKFLOW_ROUTES),
      },
      {
        path: 'sla',
        canActivate: [roleGuard(['super_admin', 'admin'])],
        loadChildren: () => import('./features/sla/sla.routes').then(m => m.SLA_ROUTES),
      },
      {
        path: 'automation',
        canActivate: [roleGuard(['super_admin'])],
        loadChildren: () => import('./features/automation/automation.routes').then(m => m.AUTOMATION_ROUTES),
      },
      {
        path: 'masters',
        canActivate: [roleGuard(['super_admin', 'admin'])],
        loadChildren: () => import('./features/masters/masters.routes').then(m => m.MASTER_ROUTES),
      },
      {
        path: 'reports',
        canActivate: [roleGuard(['super_admin', 'admin'])],
        loadChildren: () => import('./features/reports/reports.routes').then(m => m.REPORT_ROUTES),
      },
      {
        path: 'audit',
        canActivate: [roleGuard(['super_admin', 'admin'])],
        loadChildren: () => import('./features/audit/audit.routes').then(m => m.AUDIT_ROUTES),
      },
      {
        path: 'notifications',
        loadChildren: () => import('./features/notifications/notifications.routes').then(m => m.NOTIFICATION_ROUTES),
      },
      {
        path: 'integrations',
        canActivate: [roleGuard(['super_admin'])],
        loadChildren: () => import('./features/integrations/integrations.routes').then(m => m.INTEGRATION_ROUTES),
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.routes').then(m => m.PROFILE_ROUTES),
      },
      {
        path: 'overview',
        canActivate: [roleGuard(['super_admin'])],
        loadComponent: () =>
          import('./features/overview/overview.component').then(m => m.OverviewComponent),
      },
      {
        path: 'system-testing',
        canActivate: [roleGuard(['super_admin'])],
        loadComponent: () =>
          import('./features/system-testing/system-testing.component').then(m => m.SystemTestingComponent),
      },
    ],
  },

  // Error pages
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/errors/unauthorized.component').then(m => m.UnauthorizedComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./features/errors/not-found.component').then(m => m.NotFoundComponent),
  },
];
