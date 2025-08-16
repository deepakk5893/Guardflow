import { apiService } from './api';

export interface CreateInvitationRequest {
  email: string;
  role: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  invitation_token: string;
  status: string;
  expires_at: string;
  inviter_name: string;
  role_name: string;
  created_at: string;
}

export interface InvitationListResponse {
  invitations: InvitationResponse[];
  total: number;
  pending_count: number;
  expired_count: number;
}

export interface InvitationStats {
  total_sent: number;
  pending: number;
  accepted: number;
  expired: number;
  cancelled: number;
}

export class InvitationService {
  static async createInvitation(invitationData: CreateInvitationRequest): Promise<InvitationResponse> {
    return await apiService.post('/admin/invitations', invitationData);
  }

  static async getInvitations(
    status?: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<InvitationListResponse> {
    const params = new URLSearchParams();
    if (status) params.set('status_filter', status);
    params.set('skip', skip.toString());
    params.set('limit', limit.toString());

    return await apiService.get(`/admin/invitations?${params}`);
  }

  static async cancelInvitation(invitationId: string): Promise<{ message: string }> {
    return await apiService.delete(`/admin/invitations/${invitationId}`);
  }

  static async resendInvitation(invitationId: string): Promise<InvitationResponse> {
    return await apiService.post(`/admin/invitations/${invitationId}/resend`);
  }

  static async getInvitationStats(): Promise<InvitationStats> {
    return await apiService.get('/admin/invitations/stats');
  }

  // Public endpoints (no auth required)
  static async getInvitationDetails(token: string) {
    const response = await fetch(`http://localhost:8000/api/v1/invitations/public/${token}/details`);
    if (!response.ok) {
      throw new Error('Invitation not found or expired');
    }
    return response.json();
  }

  static async acceptInvitation(token: string, data: { name: string; password: string }) {
    const response = await fetch(`http://localhost:8000/api/v1/invitations/public/${token}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to accept invitation');
    }
    
    return response.json();
  }
}