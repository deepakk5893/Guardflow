from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class LLMProviderBase(BaseModel):
    provider_name: str = Field(..., description="Provider type: openai, anthropic, azure_openai")
    provider_instance_name: str = Field(..., description="Display name for this provider instance")
    api_endpoint: Optional[str] = Field(None, description="Custom API endpoint (for Azure)")
    enabled_models: List[str] = Field(default_factory=list, description="Models enabled for use")
    is_default: bool = Field(False, description="Default provider for this type")
    is_active: bool = Field(True, description="Provider is active")


class LLMProviderCreate(LLMProviderBase):
    api_key: str = Field(..., description="API key (will be encrypted)")


class LLMProviderUpdate(BaseModel):
    provider_instance_name: Optional[str] = None
    api_key: Optional[str] = None
    api_endpoint: Optional[str] = None
    enabled_models: Optional[List[str]] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class LLMProviderResponse(LLMProviderBase):
    id: str
    tenant_id: str
    available_models: List[str] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


class LLMProviderTest(BaseModel):
    """Schema for testing provider connection"""
    provider_name: str
    api_key: str
    api_endpoint: Optional[str] = None


class LLMProviderTestResult(BaseModel):
    """Result of provider connection test"""
    success: bool
    available_models: List[str] = []
    error: Optional[str] = None


class ModelOption(BaseModel):
    """Model selection option for UI"""
    value: str = Field(..., description="provider_id:model_name")
    label: str = Field(..., description="Display label for UI")
    provider_name: str
    provider_instance_name: str


class LLMRequest(BaseModel):
    """Request to LLM provider"""
    messages: List[Dict[str, str]]
    model: Optional[str] = None
    max_tokens: Optional[int] = 1024
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = 1.0


class LLMResponse(BaseModel):
    """Response from LLM provider"""
    content: str
    usage: Dict[str, int]
    model: str
    provider_name: str