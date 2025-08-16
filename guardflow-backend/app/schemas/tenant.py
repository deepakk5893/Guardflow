from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class TenantBase(BaseModel):
    name: str
    slug: str
    status: str = 'trial'
    billing_email: Optional[str] = None
    contact_name: Optional[str] = None


class TenantCreate(TenantBase):
    plan_id: Optional[str] = None
    trial_expires_at: Optional[datetime] = None


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    billing_email: Optional[str] = None
    contact_name: Optional[str] = None
    plan_id: Optional[str] = None
    trial_expires_at: Optional[datetime] = None


class TenantResponse(TenantBase):
    id: str
    plan_id: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    subscription_status: str = 'trial'
    stripe_customer_id: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class TenantWithStats(TenantResponse):
    user_count: int = 0
    task_count: int = 0
    monthly_token_usage: int = 0
    provider_count: int = 0
    pending_invitations: int = 0
    user_limit_info: Optional[Dict[str, Any]] = None
    is_trial_active: bool = False
    plan_name: Optional[str] = None