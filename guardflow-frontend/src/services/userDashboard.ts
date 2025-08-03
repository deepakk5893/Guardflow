import { apiService } from './api';

export interface UserStats {
  total_tokens_used: number;
  current_deviation_score: number;
}

export interface UserDailyUsage {
  date: string;
  tokens: number;
}

export interface UserActivityLog {
  id: number;
  timestamp: string;
  prompt: string;
  response?: string;
  status: 'success' | 'error' | 'blocked';
  tokens_used: number;
  intent_classification?: string;
  task_id?: number;
  task_title?: string;
}

export interface UserTask {
  id: number;
  task_id: number;
  task_title: string;
  task_description: string;
  task_category: string;
  task_difficulty: string;
  assigned_at: string;
  status: 'active' | 'completed' | 'cancelled';
  progress_notes?: string;
  completion_date?: string;
  estimated_hours: number;
  token_limit: number;
  tokens_used: number;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  created_at: string;
  last_login?: string;
  is_blocked: boolean;
  current_deviation_score: number;
  total_tokens_used: number;
}

export interface UserQuotaStatus {
  deviation_score: number;
  warnings: {
    high_deviation_score: boolean;
    blocked_status: boolean;
  };
}

export interface UserLogFilters {
  task_id?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export class UserDashboardService {
  // Get user's overview statistics
  static async getUserStats(): Promise<UserStats> {
    return apiService.get<UserStats>('/user/stats');
  }

  // Get user's daily usage for the last 30 days
  static async getUserDailyUsage(days: number = 30): Promise<UserDailyUsage[]> {
    return apiService.get<UserDailyUsage[]>(`/user/daily-usage?days=${days}`);
  }

  // Get user's request history with filtering
  static async getUserLogs(
    filters: UserLogFilters = {}, 
    limit: number = 50, 
    skip: number = 0
  ): Promise<UserActivityLog[]> {
    const params = new URLSearchParams();
    
    if (filters.task_id) params.append('task_id', filters.task_id.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.search) params.append('search', filters.search);
    
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/user/logs?${queryString}` : '/user/logs';
    
    return apiService.get<UserActivityLog[]>(endpoint);
  }

  // Get user's assigned tasks
  static async getUserTasks(): Promise<UserTask[]> {
    return apiService.get<UserTask[]>('/user/tasks');
  }

  // Get user's profile information
  static async getUserProfile(): Promise<UserProfile> {
    return apiService.get<UserProfile>('/user/profile');
  }

  // Get user's quota status and warnings
  static async getUserQuotaStatus(): Promise<UserQuotaStatus> {
    return apiService.get<UserQuotaStatus>('/user/quota-status');
  }

  // Update user profile (limited fields)
  static async updateUserProfile(updates: {
    name?: string;
    // Users can only update certain fields
  }): Promise<UserProfile> {
    return apiService.put<UserProfile>('/user/profile', updates);
  }

  // Change user's own password
  static async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/user/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  }

  // Export user's request history
  static async exportUserLogs(filters: UserLogFilters = {}): Promise<string> {
    const params = new URLSearchParams();
    
    if (filters.task_id) params.append('task_id', filters.task_id.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.search) params.append('search', filters.search);
    
    params.append('format', 'csv');
    
    const queryString = params.toString();
    const endpoint = queryString ? `/user/logs/export?${queryString}` : '/user/logs/export';
    
    return apiService.get<string>(endpoint);
  }

  // Update task progress notes (for assigned tasks)
  static async updateTaskProgress(taskAssignmentId: number, notes: string): Promise<UserTask> {
    return apiService.put<UserTask>(`/user/tasks/${taskAssignmentId}/progress`, { progress_notes: notes });
  }

  // Mark task as completed
  static async completeTask(taskAssignmentId: number): Promise<UserTask> {
    return apiService.patch<UserTask>(`/user/tasks/${taskAssignmentId}/complete`);
  }
}

export const userDashboardService = UserDashboardService;