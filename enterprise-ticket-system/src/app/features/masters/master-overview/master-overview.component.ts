import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

interface MasterCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-master-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, PageHeaderComponent],
  template: `
    <app-page-header
      title="Master Management"
      subtitle="Configure and manage all system masters and reference data"
      [breadcrumbs]="['Home', 'Masters']"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      @for (card of masterCards; track card.route) {
        <a
          [routerLink]="card.route"
          class="group bg-white rounded-xl border border-surface-200 p-5 hover:shadow-md hover:border-primary-300 transition-all duration-200 cursor-pointer no-underline"
        >
          <div class="flex items-start gap-4">
            <div [class]="'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + card.color">
              <i [class]="card.icon + ' text-xl'"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-semibold text-surface-900 group-hover:text-primary-600 transition-colors text-sm mb-1">
                {{ card.title }}
              </h3>
              <p class="text-xs text-surface-500 leading-relaxed">{{ card.description }}</p>
            </div>
          </div>
          <div class="mt-4 flex items-center gap-1 text-xs text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Manage</span>
            <i class="pi pi-arrow-right text-xs"></i>
          </div>
        </a>
      }
    </div>
  `,
})
export class MasterOverviewComponent {
  readonly masterCards: MasterCard[] = [
    {
      title: 'Users',
      description: 'Manage user profiles, roles, departments, and account status',
      icon: 'pi pi-users text-blue-600',
      route: 'users',
      color: 'bg-blue-50',
    },
    {
      title: 'Roles',
      description: 'Define roles and permissions for system access control',
      icon: 'pi pi-shield text-purple-600',
      route: 'roles',
      color: 'bg-purple-50',
    },
    {
      title: 'Departments',
      description: 'Organize users into departments with hierarchy and heads',
      icon: 'pi pi-building text-green-600',
      route: 'departments',
      color: 'bg-green-50',
    },
    {
      title: 'Categories',
      description: 'Classify tickets into categories and sub-categories',
      icon: 'pi pi-tag text-orange-600',
      route: 'categories',
      color: 'bg-orange-50',
    },
    {
      title: 'Priorities',
      description: 'Configure ticket priority levels with SLA multipliers',
      icon: 'pi pi-exclamation-triangle text-red-600',
      route: 'priorities',
      color: 'bg-red-50',
    },
    {
      title: 'Statuses',
      description: 'Define ticket lifecycle statuses and their transitions',
      icon: 'pi pi-circle-fill text-teal-600',
      route: 'statuses',
      color: 'bg-teal-50',
    },
    {
      title: 'Ticket Types',
      description: 'Configure different ticket types for categorization',
      icon: 'pi pi-ticket text-indigo-600',
      route: 'ticket-types',
      color: 'bg-indigo-50',
    },
    {
      title: 'Queues',
      description: 'Manage ticket queues and assign team leads',
      icon: 'pi pi-list text-cyan-600',
      route: 'queues',
      color: 'bg-cyan-50',
    },
    {
      title: 'Service Catalog',
      description: 'Define services available for user requests',
      icon: 'pi pi-book text-amber-600',
      route: 'service-catalog',
      color: 'bg-amber-50',
    },
    {
      title: 'Custom Fields',
      description: 'Create additional fields to capture ticket metadata',
      icon: 'pi pi-sliders-h text-pink-600',
      route: 'custom-fields',
      color: 'bg-pink-50',
    },
    {
      title: 'Escalation Matrix',
      description: 'Configure escalation rules for unresolved tickets',
      icon: 'pi pi-sort-amount-up text-lime-600',
      route: 'escalation-matrix',
      color: 'bg-lime-50',
    },
    {
      title: 'Approval Rules',
      description: 'Define approval workflows for ticket categories',
      icon: 'pi pi-check-circle text-emerald-600',
      route: 'approval-rules',
      color: 'bg-emerald-50',
    },
  ];
}
