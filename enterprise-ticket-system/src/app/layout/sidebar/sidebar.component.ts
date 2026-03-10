import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  children?: NavItem[];
  roles?: string[];
  separator?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  host: { class: 'flex h-full flex-shrink-0' },
  template: `
    <aside
      class="flex flex-col h-full bg-surface-900 text-white transition-all duration-300 ease-in-out overflow-hidden"
      [class.w-64]="!collapsed"
      [class.w-16]="collapsed"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-4 py-5 border-b border-surface-700">
        <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <i class="pi pi-ticket text-white text-sm"></i>
        </div>
        @if (!collapsed) {
          <span class="font-bold text-white text-sm leading-tight">
            Enterprise<br><span class="text-primary-400">Ticket System</span>
          </span>
        }
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        @for (item of visibleNavItems; track item.label) {
          @if (item.separator) {
            <div class="mx-4 my-2 border-t border-surface-700"></div>
          } @else if (item.children) {
            <!-- Section with children -->
            <div class="mb-1">
              @if (!collapsed) {
                <div class="px-4 py-1 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  {{ item.label }}
                </div>
              }
              @for (child of visibleChildren(item.children); track child.label) {
                <a
                  [routerLink]="child.route"
                  routerLinkActive="bg-surface-700 text-white"
                  [routerLinkActiveOptions]="{ exact: child.route === '/dashboard' }"
                  class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-surface-300 hover:bg-surface-800 hover:text-white transition-colors text-sm"
                >
                  <i [class]="child.icon + ' text-base w-4 flex-shrink-0'"></i>
                  @if (!collapsed) {
                    <span>{{ child.label }}</span>
                  }
                </a>
              }
            </div>
          } @else {
            <!-- Single nav item -->
            <a
              [routerLink]="item.route"
              routerLinkActive="bg-surface-700 text-white"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              class="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-surface-300 hover:bg-surface-800 hover:text-white transition-colors text-sm"
              [title]="collapsed ? item.label : ''"
            >
              <i [class]="item.icon + ' text-base w-4 flex-shrink-0'"></i>
              @if (!collapsed) {
                <span>{{ item.label }}</span>
              }
            </a>
          }
        }
      </nav>

      <!-- User info at bottom -->
      @if (!collapsed) {
        <div class="border-t border-surface-700 p-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-white">
                {{ currentUser()?.full_name?.charAt(0)?.toUpperCase() || 'U' }}
              </span>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ currentUser()?.full_name || 'User' }}</p>
              <p class="text-xs text-surface-400 truncate">{{ currentUser()?.role?.name || '' }}</p>
            </div>
          </div>
        </div>
      }
    </aside>
  `,
})
export class SidebarComponent {
  @Input() collapsed = false;

  private authService = inject(AuthService);
  protected currentUser = this.authService.currentUser;
  private userRole = this.authService.userRole;

  private navConfig: NavItem[] = [
    {
      label: 'Overview',
      icon: 'pi pi-th-large',
      route: '/overview',
      roles: ['super_admin'],
    },
    {
      label: 'System Testing',
      icon: 'pi pi-verified',
      route: '/system-testing',
      roles: ['super_admin'],
    },
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      route: '/dashboard',
    },
    {
      label: 'Tickets',
      icon: 'pi pi-ticket',
      children: [
        { label: 'All Tickets', icon: 'pi pi-list', route: '/tickets', roles: ['super_admin', 'admin', 'agent'] },
        { label: 'My Tickets', icon: 'pi pi-user', route: '/tickets/my' },
        { label: 'Board', icon: 'pi pi-th-large', route: '/tickets/board', roles: ['super_admin', 'admin', 'agent'] },
        { label: 'Create Ticket', icon: 'pi pi-plus-circle', route: '/tickets/create' },
      ],
    },
    { separator: true, label: '', icon: '' },
    {
      label: 'Administration',
      icon: 'pi pi-cog',
      children: [
        { label: 'Masters', icon: 'pi pi-database', route: '/masters', roles: ['super_admin', 'admin'] },
        { label: 'Workflow Builder', icon: 'pi pi-sitemap', route: '/workflow', roles: ['super_admin'] },
        { label: 'SLA Management', icon: 'pi pi-clock', route: '/sla', roles: ['super_admin', 'admin'] },
        { label: 'Automation Rules', icon: 'pi pi-bolt', route: '/automation', roles: ['super_admin'] },
        { label: 'Integrations', icon: 'pi pi-link', route: '/integrations', roles: ['super_admin'] },
      ],
    },
    { separator: true, label: '', icon: '' },
    {
      label: 'Analytics',
      icon: 'pi pi-chart-bar',
      children: [
        { label: 'Reports', icon: 'pi pi-chart-line', route: '/reports', roles: ['super_admin', 'admin'] },
        { label: 'Audit Logs', icon: 'pi pi-history', route: '/audit', roles: ['super_admin', 'admin'] },
      ],
    },
    { separator: true, label: '', icon: '' },
    {
      label: 'Notifications',
      icon: 'pi pi-bell',
      route: '/notifications',
    },
    {
      label: 'Profile',
      icon: 'pi pi-user',
      route: '/profile',
    },
  ];

  get visibleNavItems(): NavItem[] {
    const role = this.userRole();

    // First pass: filter items (keep separators tentatively)
    const filtered = this.navConfig.filter(item => {
      if (item.separator) return true;
      if (item.roles && role && !item.roles.includes(role)) return false;
      if (item.children) return this.visibleChildren(item.children).length > 0;
      return true;
    });

    // Second pass: remove leading, trailing, and consecutive separators
    return filtered.filter((item, idx, arr) => {
      if (!item.separator) return true;
      const prev = arr[idx - 1];
      const next = arr[idx + 1];
      if (!prev || !next) return false;           // leading or trailing
      if (prev.separator || next.separator) return false; // consecutive
      return true;
    });
  }

  visibleChildren(children: NavItem[]): NavItem[] {
    const role = this.userRole();
    return children.filter(child => {
      if (!child.roles) return true;
      return role && child.roles.includes(role);
    });
  }
}
