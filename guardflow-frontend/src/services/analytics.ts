import { apiService } from './api';

export interface UsageStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  blocked_requests: number;
  total_tokens_used: number;
  average_response_time: number;
  unique_users: number;
  period: string;
}

export interface DailyUsage {
  date: string;
  tokens: number;
  unique_users: number;
}

export interface IntentDistribution {
  intent: string;
  count: number;
  percentage: number;
}

export interface UserUsageStats {
  user_id: number;
  user_name: string;
  total_requests: number;
  total_tokens: number;
  average_deviation_score: number;
  last_request: string;
}

export interface DeviationTrends {
  date: string;
  average_score: number;
  high_risk_users: number;
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  user_id?: number;
}

export class AnalyticsService {
  // Get overall usage statistics
  static async getUsageStats(filters: AnalyticsFilters = {}): Promise<UsageStats> {
    const params = new URLSearchParams();
    
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/admin/analytics/usage?${queryString}` : '/admin/analytics/usage';
    
    return apiService.get<UsageStats>(endpoint);
  }

  // Get daily usage trends
  static async getDailyUsage(filters: AnalyticsFilters = {}): Promise<DailyUsage[]> {
    const params = new URLSearchParams();
    
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/admin/analytics/daily-usage?${queryString}` : '/admin/analytics/daily-usage';
    
    return apiService.get<DailyUsage[]>(endpoint);
  }

  // Get intent classification distribution
  static async getIntentDistribution(filters: AnalyticsFilters = {}): Promise<IntentDistribution[]> {
    const params = new URLSearchParams();
    
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/admin/analytics/intent-distribution?${queryString}` : '/admin/analytics/intent-distribution';
    
    return apiService.get<IntentDistribution[]>(endpoint);
  }

  // Get top users by usage
  static async getTopUsers(filters: AnalyticsFilters = {}, limit: number = 10): Promise<UserUsageStats[]> {
    const params = new URLSearchParams();
    
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    params.append('limit', limit.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/admin/analytics/top-users?${queryString}` : '/admin/analytics/top-users';
    
    return apiService.get<UserUsageStats[]>(endpoint);
  }

  // Get deviation score trends
  static async getDeviationTrends(filters: AnalyticsFilters = {}): Promise<DeviationTrends[]> {
    const params = new URLSearchParams();
    
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/admin/analytics/deviation-trends?${queryString}` : '/admin/analytics/deviation-trends';
    
    return apiService.get<DeviationTrends[]>(endpoint);
  }

  // Get system health metrics
  static async getSystemHealth(): Promise<{
    uptime: number;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    active_connections: number;
    queue_size: number;
  }> {
    return apiService.get('/admin/analytics/system-health');
  }
}