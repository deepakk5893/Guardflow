export interface User {
  id: number;
  email: string;
  name: string;
  token_hash?: string;
  daily_quota?: number | null;
  monthly_quota?: number | null;
  current_daily_usage?: number | null;
  current_monthly_usage?: number | null;
  requests_per_hour?: number | null;
  deviation_score?: number | null;
  is_active?: boolean | null;
  is_blocked?: boolean | null;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  last_activity?: string | null;
  created_at: string;
  updated_at: string;
  tenant_id?: number | null;
  role_id?: number | null;
  // Role-based admin system
  role?: {
    id: number;
    name: string;
    description: string;
    permissions: string[];
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginUser {
  name: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: LoginUser;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}