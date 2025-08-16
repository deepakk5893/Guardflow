from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant_admin_user, get_tenant_from_user
from app.models import LLMProvider, User, Tenant
from app.schemas.llm_provider import (
    LLMProviderCreate,
    LLMProviderUpdate,
    LLMProviderResponse,
    LLMProviderTest,
    LLMProviderTestResult,
    ModelOption
)
from app.services.llm_router import SimpleLLMRouter

router = APIRouter()


@router.get("", response_model=List[LLMProviderResponse])
def list_providers(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """List all LLM providers for the tenant"""
    providers = db.query(LLMProvider).filter(
        LLMProvider.tenant_id == tenant.id
    ).all()
    return providers


@router.post("", response_model=LLMProviderResponse)
def create_provider(
    provider_data: LLMProviderCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Create a new LLM provider"""
    llm_router = SimpleLLMRouter(db)
    
    # Check if provider with same name and instance name already exists
    existing = db.query(LLMProvider).filter(
        LLMProvider.tenant_id == tenant.id,
        LLMProvider.provider_name == provider_data.provider_name,
        LLMProvider.provider_instance_name == provider_data.provider_instance_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Provider with this name already exists"
        )
    
    # Encrypt API key
    encrypted_key = llm_router.encrypt_api_key(provider_data.api_key)
    
    # Create provider
    provider = LLMProvider(
        tenant_id=tenant.id,
        provider_name=provider_data.provider_name,
        provider_instance_name=provider_data.provider_instance_name,
        api_key_encrypted=encrypted_key,
        api_endpoint=provider_data.api_endpoint,
        enabled_models=provider_data.enabled_models,
        is_default=provider_data.is_default,
        is_active=provider_data.is_active
    )
    
    # Test connection and get available models
    test_result = llm_router.test_provider_connection(provider)
    if test_result["success"]:
        provider.available_models = test_result["available_models"]
        # If no enabled models specified, enable all available ones
        if not provider.enabled_models:
            provider.enabled_models = test_result["available_models"]
    
    # If this is set as default, unset other defaults
    if provider.is_default:
        db.query(LLMProvider).filter(
            LLMProvider.tenant_id == tenant.id,
            LLMProvider.provider_name == provider.provider_name,
            LLMProvider.is_default == True
        ).update({"is_default": False})
    
    db.add(provider)
    db.commit()
    db.refresh(provider)
    
    return provider


@router.get("/{provider_id}", response_model=LLMProviderResponse)
def get_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Get specific LLM provider"""
    provider = db.query(LLMProvider).filter(
        LLMProvider.id == provider_id,
        LLMProvider.tenant_id == tenant.id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return provider


@router.put("/{provider_id}", response_model=LLMProviderResponse)
def update_provider(
    provider_id: str,
    provider_data: LLMProviderUpdate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Update LLM provider"""
    provider = db.query(LLMProvider).filter(
        LLMProvider.id == provider_id,
        LLMProvider.tenant_id == tenant.id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    llm_router = SimpleLLMRouter(db)
    update_data = provider_data.dict(exclude_unset=True)
    
    # Handle API key encryption if provided
    if "api_key" in update_data:
        update_data["api_key_encrypted"] = llm_router.encrypt_api_key(update_data["api_key"])
        del update_data["api_key"]
    
    # Handle default provider logic
    if update_data.get("is_default"):
        db.query(LLMProvider).filter(
            LLMProvider.tenant_id == tenant.id,
            LLMProvider.provider_name == provider.provider_name,
            LLMProvider.id != provider_id,
            LLMProvider.is_default == True
        ).update({"is_default": False})
    
    # Update provider
    for field, value in update_data.items():
        setattr(provider, field, value)
    
    # Re-test connection if API key or endpoint changed
    if "api_key_encrypted" in update_data or "api_endpoint" in update_data:
        test_result = llm_router.test_provider_connection(provider)
        if test_result["success"]:
            provider.available_models = test_result["available_models"]
    
    db.commit()
    db.refresh(provider)
    
    return provider


@router.delete("/{provider_id}")
def delete_provider(
    provider_id: str,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Delete LLM provider"""
    provider = db.query(LLMProvider).filter(
        LLMProvider.id == provider_id,
        LLMProvider.tenant_id == tenant.id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Check if any tasks are using this provider
    from app.models import Task
    tasks_using_provider = db.query(Task).filter(
        Task.llm_provider_id == provider_id
    ).count()
    
    if tasks_using_provider > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete provider: {tasks_using_provider} tasks are using it"
        )
    
    db.delete(provider)
    db.commit()
    
    return {"message": "Provider deleted successfully"}


@router.post("/test", response_model=LLMProviderTestResult)
def test_provider(
    test_data: LLMProviderTest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Test LLM provider connection without saving"""
    # Create temporary provider for testing
    temp_provider = LLMProvider(
        provider_name=test_data.provider_name,
        provider_instance_name="test",
        api_key_encrypted="",  # Will be set below
        api_endpoint=test_data.api_endpoint
    )
    
    llm_router = SimpleLLMRouter(db)
    temp_provider.api_key_encrypted = llm_router.encrypt_api_key(test_data.api_key)
    
    result = llm_router.test_provider_connection(temp_provider)
    
    return LLMProviderTestResult(
        success=result["success"],
        available_models=result["available_models"],
        error=result.get("error")
    )


@router.get("/{provider_id}/models", response_model=List[ModelOption])
def get_provider_models(
    provider_id: str,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Get available models for a provider as dropdown options"""
    provider = db.query(LLMProvider).filter(
        LLMProvider.id == provider_id,
        LLMProvider.tenant_id == tenant.id
    ).first()
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return provider.get_model_options()


@router.get("/models/all", response_model=List[ModelOption])
def get_all_models(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Get all available models from all active providers for task creation"""
    providers = db.query(LLMProvider).filter(
        LLMProvider.tenant_id == tenant.id,
        LLMProvider.is_active == True
    ).all()
    
    model_options = []
    for provider in providers:
        model_options.extend(provider.get_model_options())
    
    return model_options