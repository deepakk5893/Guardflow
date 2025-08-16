from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str


class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    task_id: int
    model: Optional[str] = "gpt-3.5-turbo"
    max_tokens: Optional[int] = None
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 1.0
    format: Optional[str] = "full"  # "full" or "minimal"


class ChatChoice(BaseModel):
    index: int
    message: ChatMessage
    finish_reason: Optional[str] = None


class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatChoice]
    usage: Usage
    
    # Guardflow-specific fields
    intent_classification: Optional[str] = None
    confidence_score: Optional[float] = None
    deviation_score_delta: Optional[float] = None


class MinimalResponse(BaseModel):
    content: str
    # usage: Usage