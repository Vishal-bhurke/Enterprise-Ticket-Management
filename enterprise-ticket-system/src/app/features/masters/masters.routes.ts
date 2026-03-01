import { Routes } from '@angular/router';

export const MASTER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./master-overview/master-overview.component').then(m => m.MasterOverviewComponent),
  },
  {
    path: 'users',
    loadComponent: () => import('./users/user-master.component').then(m => m.UserMasterComponent),
  },
  {
    path: 'roles',
    loadComponent: () => import('./roles/role-master.component').then(m => m.RoleMasterComponent),
  },
  {
    path: 'departments',
    loadComponent: () => import('./departments/department-master.component').then(m => m.DepartmentMasterComponent),
  },
  {
    path: 'categories',
    loadComponent: () => import('./categories/category-master.component').then(m => m.CategoryMasterComponent),
  },
  {
    path: 'priorities',
    loadComponent: () => import('./priorities/priority-master.component').then(m => m.PriorityMasterComponent),
  },
  {
    path: 'statuses',
    loadComponent: () => import('./statuses/status-master.component').then(m => m.StatusMasterComponent),
  },
  {
    path: 'ticket-types',
    loadComponent: () => import('./ticket-types/ticket-type-master.component').then(m => m.TicketTypeMasterComponent),
  },
  {
    path: 'queues',
    loadComponent: () => import('./queues/queue-master.component').then(m => m.QueueMasterComponent),
  },
  {
    path: 'service-catalog',
    loadComponent: () => import('./service-catalog/service-catalog-master.component').then(m => m.ServiceCatalogMasterComponent),
  },
  {
    path: 'custom-fields',
    loadComponent: () => import('./custom-fields/custom-field-master.component').then(m => m.CustomFieldMasterComponent),
  },
  {
    path: 'escalation-matrix',
    loadComponent: () => import('./escalation-matrix/escalation-matrix-master.component').then(m => m.EscalationMatrixMasterComponent),
  },
  {
    path: 'approval-rules',
    loadComponent: () => import('./approval-rules/approval-rule-master.component').then(m => m.ApprovalRuleMasterComponent),
  },
];
