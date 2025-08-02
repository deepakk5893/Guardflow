from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TaskBase(BaseModel):
    name: str
    description: Optional[str] = None
    task_scope: Optional[str] = None


class TaskCreate(TaskBase):
    allowed_intents: List[str] = []


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    allowed_intents: Optional[List[str]] = None
    task_scope: Optional[str] = None
    is_active: Optional[bool] = None


class TaskResponse(TaskBase):
    id: int
    allowed_intents: List[str]
    created_by: Optional[int]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True