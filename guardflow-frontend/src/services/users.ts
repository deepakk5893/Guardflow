import { apiService } from './api';
import type { User } from '../types/auth';

export interface CreateUserRequest {
  email: string;
  name: string;
  daily_quota?: number;
  monthly_quota?: number;
  requests_per_hour?: number;
}

export interface UpdateUserRequest {
  name?: string;
  daily_quota?: number;
  monthly_quota?: number;
  requests_per_hour?: number;
  is_active?: boolean;
}

export interface BlockUserRequest {
  reason: string;
}

export class UserService {
  // Get all users
  static async getUsers(): Promise<User[]> {
    return apiService.get<User[]>('/admin/users');
  }

  // Get user by ID
  static async getUser(userId: number): Promise<User> {
    return apiService.get<User>(`/admin/users/${userId}`);
  }

  // Create new user
  static async createUser(userData: CreateUserRequest): Promise<User> {
    return apiService.post<User>('/admin/users', userData);
  }

  // Update user
  static async updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    return apiService.put<User>(`/admin/users/${userId}`, userData);
  }

  // Block user
  static async blockUser(userId: number, reason: string): Promise<{ message: string }> {
    return apiService.post<{ message: string }>(`/admin/users/${userId}/block?reason=${encodeURIComponent(reason)}`);
  }

  // Unblock user
  static async unblockUser(userId: number): Promise<{ message: string }> {
    return apiService.post<{ message: string }>(`/admin/users/${userId}/unblock`);
  }
}