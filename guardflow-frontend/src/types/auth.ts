export interface User {
  id: number;
  email: string;
  name: string;
  daily_quota: number;
  monthly_quota: number;
  current_daily_usage: number;
  current_monthly_usage: number;
  deviation_score: number;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason?: string;
  last_activity?: string;
  created_at: string;
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