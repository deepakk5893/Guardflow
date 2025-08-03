import { apiService } from './api';

export interface UsageStats {
  total_requests: number;
  active_users: number;
  total_tokens_used: number;
  avg_requests_per_day: number;
  avg_tokens_per_request: number;
  intent_distribution: Record<string, number>;
  error_rate_percent: number;
  analysis_period_days: number;
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
    // Calculate days for the backend endpoint
    let days = 7; // default
    if (filters.start_date && filters.end_date) {
      const start = new Date(filters.start_date);
      const end = new Date(filters.end_date);
      days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const endpoint = `/admin/analytics/usage?days=${days}`;
    return apiService.get<UsageStats>(endpoint);
  }

  // Get daily usage trends - simulate with current data
  static async getDailyUsage(filters: AnalyticsFilters = {}): Promise<DailyUsage[]> {
    // For now, return empty array since backend doesn't have this endpoint
    // TODO: Implement proper daily usage endpoint in backend
    return [];
  }

  // Get intent classification distribution
  static async getIntentDistribution(filters: AnalyticsFilters = {}): Promise<IntentDistribution[]> {
    // Get usage stats which includes intent_distribution
    const usageStats = await this.getUsageStats(filters);
    
    // Convert intent_distribution object to array format
    const intentData: IntentDistribution[] = [];
    const totalIntents = Object.values(usageStats.intent_distribution || {}).reduce((sum, count) => sum + count, 0);
    
    for (const [intent, count] of Object.entries(usageStats.intent_distribution || {})) {
      intentData.push({
        intent,
        count,
        percentage: totalIntents > 0 ? (count / totalIntents) * 100 : 0
      });
    }
    
    return intentData;
  }

  // Get top users by usage
  static async getTopUsers(filters: AnalyticsFilters = {}, limit: number = 10): Promise<UserUsageStats[]> {
    // For now, return empty array since backend doesn't have this endpoint
    // TODO: Implement proper top users endpoint in backend
    return [];
  }

  // Get deviation score trends
  static async getDeviationTrends(filters: AnalyticsFilters = {}): Promise<DeviationTrends[]> {
    // For now, return empty array since backend doesn't have this endpoint
    // TODO: Implement proper deviation trends endpoint in backend
    return [];
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
    // For now, return mock data since backend doesn't have this endpoint
    // TODO: Implement proper system health endpoint in backend
    return {
      uptime: 86400, // 1 day in seconds
      cpu_usage: 15.5,
      memory_usage: 45.2,
      disk_usage: 68.7,
      active_connections: 12,
      queue_size: 0
    };
  }
}