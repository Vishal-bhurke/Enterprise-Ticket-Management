export interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: Record<string, boolean>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  head_id: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  head?: Partial<Profile>;
  parent?: Partial<Department>;
}

export interface Profile {
  id: string;
  employee_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  department_id: string | null;
  role_id: string;
  is_active: boolean;
  timezone: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  role?: Role;
  department?: Department;
}

export type RoleSlug = 'super_admin' | 'admin' | 'agent' | 'end_user';

export interface CreateProfileDto {
  email: string;
  full_name: string;
  role_id: string;
  department_id?: string;
  employee_id?: string;
  phone?: string;
  timezone?: string;
}

export interface UpdateProfileDto {
  full_name?: string;
  phone?: string;
  department_id?: string;
  role_id?: string;
  is_active?: boolean;
  timezone?: string;
  preferences?: Record<string, unknown>;
  avatar_url?: string;
}
