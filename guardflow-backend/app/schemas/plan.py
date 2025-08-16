from typing import Optional, List
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime


class PlanBase(BaseModel):
    name: str
    max_users: Optional[int] = None
    max_tokens_per_month: Optional[int] = None
    price_per_month: Optional[Decimal] = None
    features: List[str] = []
    is_active: bool = True


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    max_users: Optional[int] = None
    max_tokens_per_month: Optional[int] = None
    price_per_month: Optional[Decimal] = None
    features: Optional[List[str]] = None
    is_active: Optional[bool] = None


class PlanResponse(PlanBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True