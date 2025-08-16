import { apiService } from './api';

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expires_at?: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  is_expired?: boolean;
  days_since_last_used?: number;
}

export interface ApiKeyCreateResponse extends ApiKeyResponse {
  api_key: string;
}

export interface ApiKeyListResponse {
  api_keys: ApiKeyResponse[];
  total: number;
  active_count: number;
  expired_count: number;
}

export interface ApiKeyStats {
  total_keys: number;
  active_keys: number;
  expired_keys: number;
  last_7_days_usage: number;
  last_30_days_usage: number;
  most_used_key: string | null;
  least_used_key: string | null;
}

export interface ScopeInfo {
  scope: string;
  name: string;
  description: string;
  category: string;
}

export interface ScopeListResponse {
  scopes: ScopeInfo[];
}

export interface ApiKeyUpdateRequest {
  name: string;
}

export class ApiKeyService {
  static async createApiKey(keyData: CreateApiKeyRequest): Promise<ApiKeyCreateResponse> {
    return await apiService.post('/auth/api-keys', keyData);
  }

  static async listApiKeys(
    skip: number = 0,
    limit: number = 50,
    includeInactive: boolean = false
  ): Promise<ApiKeyListResponse> {
    const params = new URLSearchParams();
    params.set('skip', skip.toString());
    params.set('limit', limit.toString());
    params.set('include_inactive', includeInactive.toString());

    return await apiService.get(`/auth/api-keys?${params}`);
  }

  static async getApiKey(keyId: string): Promise<ApiKeyResponse> {
    return await apiService.get(`/auth/api-keys/${keyId}`);
  }

  static async updateApiKey(keyId: string, updateData: ApiKeyUpdateRequest): Promise<ApiKeyResponse> {
    return await apiService.put(`/auth/api-keys/${keyId}`, updateData);
  }

  static async deleteApiKey(keyId: string): Promise<{ message: string }> {
    return await apiService.delete(`/auth/api-keys/${keyId}`);
  }

  static async getApiKeyStats(): Promise<ApiKeyStats> {
    return await apiService.get('/auth/api-keys/stats/usage');
  }

  static async getAvailableScopes(): Promise<ScopeListResponse> {
    return await apiService.get('/auth/api-keys/info/scopes');
  }

  // Admin endpoints (for admin dashboard)
  static async adminListUserApiKeys(
    userId: number,
    skip: number = 0,
    limit: number = 50,
    includeInactive: boolean = true
  ): Promise<ApiKeyListResponse> {
    const params = new URLSearchParams();
    params.set('skip', skip.toString());
    params.set('limit', limit.toString());
    params.set('include_inactive', includeInactive.toString());

    return await apiService.get(`/auth/api-keys/admin/users/${userId}/keys?${params}`);
  }

  static async adminRevokeUserApiKey(userId: number, keyId: string): Promise<{ message: string }> {
    return await apiService.delete(`/auth/api-keys/admin/users/${userId}/keys/${keyId}`);
  }

  static async adminToggleUserApiKey(
    userId: number, 
    keyId: string
  ): Promise<{ message: string; is_active: boolean }> {
    return await apiService.put(`/auth/api-keys/admin/users/${userId}/keys/${keyId}/toggle`);
  }
}