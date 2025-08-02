import { apiService } from './api';
import type { Log } from '../types/api';

export interface LogsFilters {
  user_id?: number;
  task_id?: number;
  status?: string;
  intent_classification?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface LogsResponse {
  logs: Log[];
  total: number;
  page: number;
  limit: number;
}

export class LogsService {
  // Get logs with filtering and pagination
  static async getLogs(filters: LogsFilters = {}, limit: number = 50, skip: number = 0): Promise<Log[]> {
    const params = new URLSearchParams();
    
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    if (filters.task_id) params.append('task_id', filters.task_id.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.intent_classification) params.append('intent_classification', filters.intent_classification);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.search) params.append('search', filters.search);
    
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/admin/logs?${queryString}` : '/admin/logs';
    
    return apiService.get<Log[]>(endpoint);
  }

  // Get log by ID
  static async getLog(logId: number): Promise<Log> {
    return apiService.get<Log>(`/admin/logs/${logId}`);
  }

  // Export logs (returns CSV data)
  static async exportLogs(filters: LogsFilters = {}): Promise<string> {
    const params = new URLSearchParams();
    
    if (filters.user_id) params.append('user_id', filters.user_id.toString());
    if (filters.task_id) params.append('task_id', filters.task_id.toString());
    if (filters.status) params.append('status', filters.status);
    if (filters.intent_classification) params.append('intent_classification', filters.intent_classification);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.search) params.append('search', filters.search);
    
    params.append('format', 'csv');
    
    const queryString = params.toString();
    const endpoint = queryString ? `/admin/logs/export?${queryString}` : '/admin/logs/export';
    
    return apiService.get<string>(endpoint);
  }
}