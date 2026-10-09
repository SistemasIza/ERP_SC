export type UserRole = 'super_admin' | 'admin' | 'empresa' | 'staff' | 'agent';

export interface Organization {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  userCount?: number;
}

export interface SystemUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
  organizations?: {
    name: string;
  };
  password_hash?: string;
}

export interface CreateUserDTO {
  email: string;
  full_name: string;
  role: string;
  organization_id: string | null;
  password?: string;
}

export interface UpdateUserDTO {
  full_name?: string;
  role?: string;
  organization_id?: string | null;
  password?: string;
}
