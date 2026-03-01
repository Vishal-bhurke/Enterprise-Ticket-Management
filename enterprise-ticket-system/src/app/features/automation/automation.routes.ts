import { Routes } from '@angular/router';

export const AUTOMATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./rule-list/rule-list.component').then(m => m.RuleListComponent),
  },
  {
    path: 'create',
    loadComponent: () => import('./rule-builder/rule-builder.component').then(m => m.RuleBuilderComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./rule-builder/rule-builder.component').then(m => m.RuleBuilderComponent),
  },
];
