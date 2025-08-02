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
    daily_quota: int
    monthly_quota: int
    current_daily_usage: int
    current_monthly_usage: int
    requests_per_hour: int
    deviation_score: Decimal
    is_active: bool
    is_blocked: bool
    blocked_reason: Optional[str]
    blocked_at: Optional[datetime]
    last_activity: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    id: int
    email: str
    name: str
    daily_quota: int
    monthly_quota: int
    current_daily_usage: int
    current_monthly_usage: int
    deviation_score: Decimal
    is_blocked: bool
    blocked_reason: Optional[str]
    last_activity: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True