import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/role.guard';

export const TICKET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./ticket-list/ticket-list.component').then(m => m.TicketListComponent),
  },
  {
    path: 'my',
    loadComponent: () => import('./ticket-list/ticket-list.component').then(m => m.TicketListComponent),
    data: { myTickets: true },
  },
  {
    path: 'board',
    loadComponent: () => import('./ticket-board/ticket-board.component').then(m => m.TicketBoardComponent),
    canActivate: [roleGuard(['super_admin', 'admin', 'agent'])],
  },
  {
    path: 'create',
    loadComponent: () => import('./ticket-create/ticket-create.component').then(m => m.TicketCreateComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent),
  },
];
