export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  transitions?: WorkflowTransition[];
}

export interface WorkflowTransition {
  id: string;
  workflow_id: string;
  name: string;
  from_status_id: string | null;
  to_status_id: string;
  allowed_roles: string[];
  requires_approval: boolean;
  approval_rule_id: string | null;
  conditions: WorkflowCondition[];
  sort_order: number;
  is_active: boolean;
  from_status?: { id: string; name: string; color: string };
  to_status?: { id: string; name: string; color: string };
}

export interface WorkflowCondition {
  field: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'contains' | 'gt' | 'lt';
  value: unknown;
}

export interface ApprovalRule {
  id: string;
  name: string;
  description: string | null;
  approval_type: 'sequential' | 'parallel' | 'any_one';
  approver_roles: string[];
  approver_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  ticket_id: string;
  transition_id: string;
  approval_rule_id: string;
  requested_by: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decided_by: string | null;
  decision_at: string | null;
  comments: string | null;
  created_at: string;
}
