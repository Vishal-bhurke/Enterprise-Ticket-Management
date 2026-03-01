import { Routes } from '@angular/router';

export const NOTIFICATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./notification-list/notification-list.component').then(m => m.NotificationListComponent),
  },
  {
    path: 'templates',
    loadComponent: () => import('./template-list/template-list.component').then(m => m.TemplateListComponent),
  },
];
