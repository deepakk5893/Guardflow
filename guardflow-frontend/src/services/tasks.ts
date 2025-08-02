import { apiService } from './api';

export interface Task {
  id: number;
  title: string;
  description: string;
  category: 'coding' | 'testing' | 'documentation' | 'research' | 'other';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  max_tokens_per_request: number;
  daily_quota_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  assigned_users_count?: number;
  total_requests?: number;
  success_rate?: number;
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  category: 'coding' | 'testing' | 'documentation' | 'research' | 'other';
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_hours: number;
  max_tokens_per_request: number;
  daily_quota_limit: number;
  is_active?: boolean;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: number;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  user_id: number;
  assigned_by: number;
  assigned_at: string;
  status: 'active' | 'completed' | 'cancelled';
  progress_notes?: string;
  completion_date?: string;
  user_name?: string;
  task_title?: string;
}

export interface AssignTaskRequest {
  task_id: number;
  user_id: number;
  progress_notes?: string;
}

export interface TaskFilters {
  category?: string;
  difficulty_level?: string;
  is_active?: boolean;
  search?: string;
}

export interface UserTaskStats {
  user_id: number;
  user_name: string;
  active_tasks: number;
  completed_tasks: number;
  total_requests: number;
  average_success_rate: number;
  last_activity: string;
}

export class TasksService {
  // Get all tasks with optional filtering
  static async getTasks(filters: TaskFilters = {}): Promise<Task[]> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.difficulty_level) params.append('difficulty_level', filters.difficulty_level);
    if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters.search) params.append('search', filters.search);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/admin/tasks?${queryString}` : '/admin/tasks';
    
    return apiService.get<Task[]>(endpoint);
  }

  // Get task by ID
  static async getTask(taskId: number): Promise<Task> {
    return apiService.get<Task>(`/admin/tasks/${taskId}`);
  }

  // Create new task
  static async createTask(task: CreateTaskRequest): Promise<Task> {
    return apiService.post<Task>('/admin/tasks', task);
  }

  // Update existing task
  static async updateTask(taskId: number, updates: Partial<CreateTaskRequest>): Promise<Task> {
    return apiService.put<Task>(`/admin/tasks/${taskId}`, updates);
  }

  // Delete task
  static async deleteTask(taskId: number): Promise<void> {
    return apiService.delete(`/admin/tasks/${taskId}`);
  }

  // Toggle task active status
  static async toggleTaskStatus(taskId: number): Promise<Task> {
    return apiService.patch<Task>(`/admin/tasks/${taskId}/toggle-status`);
  }

  // Get task assignments
  static async getTaskAssignments(taskId?: number): Promise<TaskAssignment[]> {
    const endpoint = taskId ? `/admin/tasks/${taskId}/assignments` : '/admin/task-assignments';
    return apiService.get<TaskAssignment[]>(endpoint);
  }

  // Assign task to user
  static async assignTask(assignment: AssignTaskRequest): Promise<TaskAssignment> {
    return apiService.post<TaskAssignment>('/admin/task-assignments', assignment);
  }

  // Update task assignment
  static async updateTaskAssignment(
    assignmentId: number, 
    updates: { status?: 'active' | 'completed' | 'cancelled'; progress_notes?: string }
  ): Promise<TaskAssignment> {
    return apiService.put<TaskAssignment>(`/admin/task-assignments/${assignmentId}`, updates);
  }

  // Remove task assignment
  static async removeTaskAssignment(assignmentId: number): Promise<void> {
    return apiService.delete(`/admin/task-assignments/${assignmentId}`);
  }

  // Get user task statistics
  static async getUserTaskStats(): Promise<UserTaskStats[]> {
    return apiService.get<UserTaskStats[]>('/admin/tasks/user-stats');
  }

  // Get task categories and difficulty levels for dropdowns
  static getTaskCategories(): Array<{ value: string; label: string }> {
    return [
      { value: 'coding', label: 'Coding' },
      { value: 'testing', label: 'Testing' },
      { value: 'documentation', label: 'Documentation' },
      { value: 'research', label: 'Research' },
      { value: 'other', label: 'Other' },
    ];
  }

  static getDifficultyLevels(): Array<{ value: string; label: string }> {
    return [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
    ];
  }
}