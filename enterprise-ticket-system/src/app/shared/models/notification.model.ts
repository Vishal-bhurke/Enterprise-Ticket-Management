export type NotificationType =
  | 'ticket_update'
  | 'assignment'
  | 'sla_breach'
  | 'mention'
  | 'system'
  | 'escalation'
  | 'approval';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  ticket_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  slug: string;
  channel: 'email' | 'in_app' | 'both';
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_event: AutomationTriggerEvent;
  trigger_config: Record<string, unknown>;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  run_order: number;
  stop_on_match: boolean;
  last_triggered: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export type AutomationTriggerEvent =
  | 'ticket_created'
  | 'ticket_updated'
  | 'ticket_assigned'
  | 'ticket_resolved'
  | 'ticket_closed'
  | 'comment_added'
  | 'sla_breached'
  | 'status_changed'
  | 'priority_changed'
  | 'scheduled';

export interface AutomationCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'contains' | 'gt' | 'lt';
  value: unknown;
  logic?: 'AND' | 'OR';
}

export interface AutomationAction {
  type: 'assign_to' | 'assign_round_robin' | 'set_priority' | 'change_status' | 'add_tag' | 'send_notification' | 'call_webhook' | 'add_watcher';
  params: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string | null;
  actor_ip: string | null;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { id: string; full_name: string; email: string };
}
