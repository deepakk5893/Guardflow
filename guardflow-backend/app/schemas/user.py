from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    daily_quota: Optional[int] = 10000
    monthly_quota: Optional[int] = 300000
    requests_per_hour: Optional[int] = 100


class UserUpdate(BaseModel):
    name: Optional[str] = None
    daily_quota: Optional[int] = None
    monthly_quota: Optional[int] = None
    requests_per_hour: Optional[int] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    token_hash: str
    daily_quota: Optional[int] = None
    monthly_quota: Optional[int] = None
    current_daily_usage: Optional[int] = 0
    current_monthly_usage: Optional[int] = 0
    requests_per_hour: Optional[int] = 100
    deviation_score: Optional[Decimal] = Decimal('0.0')
    is_active: Optional[bool] = True
    is_blocked: Optional[bool] = False
    blocked_reason: Optional[str] = None
    blocked_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    daily_quota: Optional[int] = 10000
    monthly_quota: Optional[int] = 300000
    current_daily_usage: Optional[int] = 0
    current_monthly_usage: Optional[int] = 0
    deviation_score: Optional[Decimal] = Decimal('0.0')
    is_blocked: Optional[bool] = False
    blocked_reason: Optional[str] = None
    last_activity: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True