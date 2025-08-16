from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime
from enum import Enum


class ScopeEnum(str, Enum):
    """Available API key scopes"""
    LLM_CALL = "llm:call"
    USAGE_READ = "usage:read" 
    LOGS_READ = "logs:read"
    PROFILE_READ = "profile:read"
    KEYS_MANAGE = "keys:manage"


class APIKeyCreate(BaseModel):
    """Schema for creating a new API key"""
    name: str = Field(..., min_length=1, max_length=255, description="User-friendly name for the API key")
    scopes: List[ScopeEnum] = Field(..., min_items=1, description="List of scopes/permissions for this key")
    expires_at: Optional[datetime] = Field(None, description="Optional expiration date")
    
    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty or just whitespace')
        return v.strip()
    
    @validator('scopes')
    def validate_scopes(cls, v):
        if not v:
            raise ValueError('At least one scope is required')
        # Remove duplicates while preserving order
        seen = set()
        unique_scopes = []
        for scope in v:
            if scope not in seen:
                seen.add(scope)
                unique_scopes.append(scope)
        return unique_scopes


class APIKeyUpdate(BaseModel):
    """Schema for updating an API key (only name can be updated)"""
    name: str = Field(..., min_length=1, max_length=255, description="Updated name for the API key")
    
    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty or just whitespace')
        return v.strip()


class APIKeyResponse(BaseModel):
    """Schema for API key responses (without the actual key)"""
    id: str
    name: str
    scopes: List[str]
    is_active: bool
    last_used_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Additional computed fields
    is_expired: Optional[bool] = None
    days_since_last_used: Optional[int] = None
    
    class Config:
        from_attributes = True


class APIKeyCreateResponse(APIKeyResponse):
    """Schema for API key creation response (includes the actual key)"""
    api_key: str = Field(..., description="The actual API key - store this securely!")
    
    class Config:
        from_attributes = True


class APIKeyList(BaseModel):
    """Schema for listing API keys with pagination"""
    api_keys: List[APIKeyResponse]
    total: int
    active_count: int
    expired_count: int


class APIKeyStats(BaseModel):
    """Schema for API key usage statistics"""
    total_keys: int
    active_keys: int
    expired_keys: int
    last_7_days_usage: int
    last_30_days_usage: int
    most_used_key: Optional[str] = None
    least_used_key: Optional[str] = None


class APIKeyUsage(BaseModel):
    """Schema for individual API key usage statistics"""
    key_id: str
    key_name: str
    total_requests: int
    last_7_days: int
    last_30_days: int
    last_used_at: Optional[datetime]
    scopes: List[str]


class ScopeInfo(BaseModel):
    """Schema for scope information and descriptions"""
    scope: str
    name: str
    description: str
    category: str


# Available scopes with descriptions
AVAILABLE_SCOPES = [
    ScopeInfo(
        scope="llm:call",
        name="LLM API Access",
        description="Make requests to the LLM proxy endpoint (/api/v1/chat/completions)",
        category="Core"
    ),
    ScopeInfo(
        scope="usage:read", 
        name="Usage Statistics",
        description="View personal usage statistics and quota information",
        category="Analytics"
    ),
    ScopeInfo(
        scope="logs:read",
        name="Request Logs",
        description="Access personal request history and logs",
        category="Analytics"
    ),
    ScopeInfo(
        scope="profile:read",
        name="Profile Information", 
        description="View basic profile information and account details",
        category="Account"
    ),
    ScopeInfo(
        scope="keys:manage",
        name="API Key Management",
        description="Create, update, and delete your own API keys",
        category="Security"
    )
]


class ScopeListResponse(BaseModel):
    """Schema for listing available scopes"""
    scopes: List[ScopeInfo] = AVAILABLE_SCOPES