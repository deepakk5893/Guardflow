from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserInvitationBase(BaseModel):
    email: EmailStr
    role: str = Field(..., description="Role name for the invited user (user/admin)")


class UserInvitationCreate(UserInvitationBase):
    pass


class UserInvitationResponse(BaseModel):
    id: str
    tenant_id: str
    email: str
    invited_by: int
    invitation_token: str
    status: str
    expires_at: datetime
    created_at: datetime
    accepted_at: Optional[datetime] = None
    
    # Related data
    inviter_name: Optional[str] = None
    role_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class InvitationAcceptance(BaseModel):
    """Schema for accepting an invitation"""
    password: str = Field(..., min_length=8, description="Password for the new user account")
    name: str = Field(..., min_length=1, description="Full name of the user")


class InvitationDetails(BaseModel):
    """Public details shown when validating an invitation token"""
    id: str
    email: str
    company_name: str
    role_name: str
    inviter_name: str
    expires_at: datetime
    is_valid: bool
    
    
class UserInvitationList(BaseModel):
    """List of invitations with pagination info"""
    invitations: list[UserInvitationResponse]
    total: int
    pending_count: int
    expired_count: int


class InvitationStats(BaseModel):
    """Statistics about invitations for a tenant"""
    total_sent: int
    pending: int
    accepted: int
    expired: int
    cancelled: int