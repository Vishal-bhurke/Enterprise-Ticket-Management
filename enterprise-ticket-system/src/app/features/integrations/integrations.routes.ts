import { Routes } from '@angular/router';

export const INTEGRATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./webhook-list/webhook-list.component').then(m => m.WebhookListComponent),
  },
  {
    path: 'api-keys',
    loadComponent: () => import('./api-keys/api-keys.component').then(m => m.ApiKeysComponent),
  },
];
