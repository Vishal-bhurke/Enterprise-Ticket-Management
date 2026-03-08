/**
 * Test credentials and configuration for all 4 roles.
 * Set via environment variables for security — never hardcode real passwords.
 */
export const TEST_USERS = {
  super_admin: {
    email: process.env['TEST_SUPER_ADMIN_EMAIL'] || 'test_superadmin@playwright.local',
    password: process.env['TEST_SUPER_ADMIN_PASSWORD'] || 'PlaywrightTest123!',
    role: 'super_admin',
  },
  admin: {
    email: process.env['TEST_ADMIN_EMAIL'] || 'test_admin@playwright.local',
    password: process.env['TEST_ADMIN_PASSWORD'] || 'PlaywrightTest123!',
    role: 'admin',
  },
  agent: {
    email: process.env['TEST_AGENT_EMAIL'] || 'test_agent@playwright.local',
    password: process.env['TEST_AGENT_PASSWORD'] || 'PlaywrightTest123!',
    role: 'agent',
  },
  end_user: {
    email: process.env['TEST_END_USER_EMAIL'] || 'test_enduser@playwright.local',
    password: process.env['TEST_END_USER_PASSWORD'] || 'PlaywrightTest123!',
    role: 'end_user',
  },
} as const;

export type RoleName = keyof typeof TEST_USERS;

export const SUPABASE_URL = process.env['SUPABASE_URL'] || 'https://zffdggwlhzgkkfrknkoy.supabase.co';
// Service key must be set via SUPABASE_SERVICE_KEY environment variable — never hardcode
export const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_KEY'] || '';
export const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] || 'sb_publishable_JVyDuLbGwRGeS-oSmanaEA_yNBliwtk';

/** Routes accessible by all roles */
export const PUBLIC_ROUTES = ['/dashboard', '/tickets', '/tickets/create', '/profile', '/notifications', '/notifications/templates'];

/** Routes restricted to admin and above */
export const ADMIN_ROUTES = [
  '/masters/users', '/masters/roles', '/masters/departments', '/masters/categories',
  '/masters/priorities', '/masters/statuses', '/masters/ticket-types', '/masters/queues',
  '/masters/service-catalog', '/masters/custom-fields', '/masters/escalation-matrix',
  '/masters/approval-rules', '/sla', '/sla/business-hours',
  '/reports', '/reports/sla', '/reports/agents', '/audit',
];

/** Routes restricted to super_admin only */
export const SUPER_ADMIN_ROUTES = [
  '/workflow', '/automation', '/integrations', '/integrations/api-keys', '/overview',
];

/** Performance thresholds in milliseconds */
export const PERF_THRESHOLDS = {
  dashboard: 3000,
  ticketList: 2000,
  ticketDetail: 2000,
  masterList: 2000,
  report: 5000,
  api: 1000,
};
