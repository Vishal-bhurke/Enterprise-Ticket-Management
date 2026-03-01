import { Profile } from './user.model';

export interface TicketStatus {
  id: string;
  name: string;
  slug: string;
  category: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  color: string;
  is_default: boolean;
  is_closed: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface TicketPriority {
  id: string;
  name: string;
  slug: string;
  level: number;
  color: string;
  icon: string | null;
  sla_multiplier: number;
  is_active: boolean;
}

export interface TicketCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  parent?: Partial<TicketCategory>;
}

export interface TicketType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  default_priority_id: string | null;
  default_workflow_id: string | null;
  custom_field_schema: CustomFieldSchema[];
  is_active: boolean;
}

export interface CustomFieldSchema {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'select' | 'multi_select' | 'user';
  required: boolean;
  options?: { label: string; value: string }[];
}

export interface Queue {
  id: string;
  name: string;
  description: string | null;
  team_lead_id: string | null;
  is_active: boolean;
  team_lead?: Partial<Profile>;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  ticket_type_id: string;
  status_id: string;
  priority_id: string;
  category_id: string | null;
  department_id: string | null;
  queue_id: string | null;
  requester_id: string;
  assignee_id: string | null;
  parent_ticket_id: string | null;
  due_date: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  custom_fields: Record<string, unknown>;
  tags: string[];
  source: 'web' | 'email' | 'api' | 'phone';
  is_escalated: boolean;
  escalated_at: string | null;
  sla_policy_id: string | null;
  sla_response_due: string | null;
  sla_resolve_due: string | null;
  sla_response_met: boolean | null;
  sla_resolve_met: boolean | null;
  first_response_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  // Joined relations
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  department?: { id: string; name: string; code: string };
  assignee?: Partial<Profile>;
  requester?: Partial<Profile>;
  ticket_type?: TicketType;
}

export interface TicketDetail extends Ticket {
  comments?: TicketComment[];
  attachments?: TicketAttachment[];
  links?: TicketLink[];
  sla_events?: SlaEvent[];
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  mentions: string[];
  created_at: string;
  updated_at: string;
  author?: Partial<Profile>;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string | null;
  comment_id: string | null;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  uploader?: Partial<Profile>;
}

export interface TicketLink {
  id: string;
  source_id: string;
  target_id: string;
  link_type: 'relates_to' | 'blocks' | 'is_blocked_by' | 'duplicates' | 'is_duplicated_by' | 'parent_of' | 'child_of';
  created_at: string;
  target?: Partial<Ticket>;
  source?: Partial<Ticket>;
}

export interface SlaEvent {
  id: string;
  ticket_id: string;
  sla_policy_id: string;
  event_type: 'response' | 'resolution';
  due_at: string;
  met_at: string | null;
  is_breached: boolean;
  breached_at: string | null;
  paused_at: string | null;
  total_pause_mins: number;
}

export interface CreateTicketDto {
  title: string;
  description?: string;
  ticket_type_id: string;
  priority_id: string;
  category_id?: string;
  department_id?: string;
  queue_id?: string;
  assignee_id?: string;
  due_date?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  source?: 'web' | 'email' | 'api' | 'phone';
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  status_id?: string;
  priority_id?: string;
  category_id?: string;
  department_id?: string;
  queue_id?: string;
  assignee_id?: string;
  due_date?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

export interface TicketFilterParams {
  status_id?: string;
  priority_id?: string;
  category_id?: string;
  department_id?: string;
  assignee_id?: string;
  requester_id?: string;
  queue_id?: string;
  is_escalated?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export const DEFAULT_TICKET_FILTERS: TicketFilterParams = {
  page: 1,
  pageSize: 20,
  sortField: 'created_at',
  sortOrder: 'desc',
};
