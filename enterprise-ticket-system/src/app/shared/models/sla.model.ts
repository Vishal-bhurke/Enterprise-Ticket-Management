export interface BusinessHours {
  id: string;
  name: string;
  timezone: string;
  schedule: BusinessHoursSchedule;
  holidays: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHoursSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  is_working: boolean;
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
}

export interface SlaPolicy {
  id: string;
  name: string;
  description: string | null;
  priority_id: string | null;
  ticket_type_id: string | null;
  response_time_hours: number;
  resolution_time_hours: number;
  business_hours_id: string | null;
  escalation_matrix_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  priority?: { id: string; name: string; color: string };
  business_hours?: BusinessHours;
}

export interface EscalationMatrix {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  rules?: EscalationRule[];
}

export interface EscalationRule {
  id: string;
  escalation_matrix_id: string;
  level: number;
  trigger_after_mins: number;
  escalate_to_role: string | null;
  escalate_to_user_id: string | null;
  action: 'notify' | 'reassign' | 'change_priority';
  notification_template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlaTimerStatus {
  status: 'safe' | 'warning' | 'breached' | 'met';
  remainingMs: number;
  displayText: string;
  colorClass: string;
}
