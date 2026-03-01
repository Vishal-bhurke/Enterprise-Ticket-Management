import { Routes } from '@angular/router';

export const WORKFLOW_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./workflow-list/workflow-list.component').then(m => m.WorkflowListComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./workflow-detail/workflow-detail.component').then(m => m.WorkflowDetailComponent),
  },
];
