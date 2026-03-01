import { Routes } from '@angular/router';

export const SLA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./sla-list/sla-list.component').then(m => m.SlaListComponent),
  },
  {
    path: 'business-hours',
    loadComponent: () => import('./business-hours/business-hours.component').then(m => m.BusinessHoursComponent),
  },
];
