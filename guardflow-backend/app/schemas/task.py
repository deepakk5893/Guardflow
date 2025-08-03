from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "other"
    difficulty_level: str = "beginner"
    estimated_hours: Optional[float] = None
    token_limit: Optional[int] = 10000
    max_tokens_per_request: Optional[int] = 1000
    is_active: bool = True


class TaskCreate(TaskBase):
    allowed_intents: List[str] = []
    task_scope: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty_level: Optional[str] = None
    estimated_hours: Optional[float] = None
    token_limit: Optional[int] = None
    max_tokens_per_request: Optional[int] = None
    allowed_intents: Optional[List[str]] = None
    task_scope: Optional[str] = None
    is_active: Optional[bool] = None


class TaskResponse(TaskBase):
    id: int
    allowed_intents: List[str]
    task_scope: Optional[str] = None
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True