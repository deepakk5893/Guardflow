from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


# Request Schemas
class ChatCreateRequest(BaseModel):
    task_id: int
    title: Optional[str] = "New Chat"


class MessageSendRequest(BaseModel):
    chat_id: uuid.UUID
    content: str = Field(..., min_length=1, max_length=10000)


# Response Schemas
class MessageResponse(BaseModel):
    id: uuid.UUID
    content: str
    is_user: bool
    tokens_used: int
    intent: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    id: uuid.UUID
    title: str
    task_id: Optional[int]
    total_tokens_used: int
    status: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ChatWithMessagesResponse(BaseModel):
    id: uuid.UUID
    title: str
    task_id: Optional[int]
    total_tokens_used: int
    status: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse]
    
    class Config:
        from_attributes = True


class SendMessageResponse(BaseModel):
    message: MessageResponse
    response: MessageResponse
    remaining_tokens: int
    chat_updated: ChatResponse


# Task Info for Context
class TaskContext(BaseModel):
    id: int
    title: str
    description: str
    category: str
    token_limit: int