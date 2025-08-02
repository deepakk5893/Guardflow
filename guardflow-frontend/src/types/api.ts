export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Task {
  id: number;
  name: string;
  description?: string;
  allowed_intents: string[];
  task_scope?: string;
  created_by?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Log {
  id: number;
  user_id: number;
  task_id?: number;
  prompt: string;
  response?: string;
  intent_classification?: string;
  confidence_score?: number;
  deviation_score_delta: number;
  user_score_before?: number;
  user_score_after?: number;
  openai_tokens_used?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  response_time_ms?: number;
  model: string;
  status: string;
  error_message?: string;
  timestamp: string;
}

export interface UsageAnalytics {
  analysis_period_days: number;
  total_requests: number;
  active_users: number;
  total_tokens_used: number;
  avg_requests_per_day: number;
  avg_tokens_per_request: number;
  intent_distribution: Record<string, number>;
  error_rate_percent: number;
}