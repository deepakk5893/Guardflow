from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class LogResponse(BaseModel):
    id: int
    user_id: int
    task_id: Optional[int]
    prompt: str
    response: Optional[str]
    intent_classification: Optional[str]
    confidence_score: Optional[Decimal]
    deviation_score_delta: Decimal
    user_score_before: Optional[Decimal]
    user_score_after: Optional[Decimal]
    openai_tokens_used: Optional[int]
    prompt_tokens: Optional[int]
    completion_tokens: Optional[int]
    response_time_ms: Optional[int]
    model: str
    status: str
    error_message: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True