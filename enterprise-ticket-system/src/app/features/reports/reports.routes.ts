import { Routes } from '@angular/router';

export const REPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ticket-analytics/ticket-analytics.component').then(m => m.TicketAnalyticsComponent),
  },
  {
    path: 'sla',
    loadComponent: () => import('./sla-report/sla-report.component').then(m => m.SlaReportComponent),
  },
  {
    path: 'agents',
    loadComponent: () => import('./agent-productivity/agent-productivity.component').then(m => m.AgentProductivityComponent),
  },
];
