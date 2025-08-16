from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.api.deps import (
    get_current_user_enhanced,
    get_tenant_admin_user_enhanced,
    require_scope,
    get_current_user_dual_auth
)
from app.models import APIKey, User, Tenant
from app.schemas.api_key import (
    APIKeyCreate,
    APIKeyCreateResponse,
    APIKeyResponse,
    APIKeyUpdate,
    APIKeyList,
    APIKeyStats,
    ScopeListResponse
)

router = APIRouter()


@router.post("", response_model=APIKeyCreateResponse)
def create_api_key(
    key_data: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_scope("keys:manage"))
):
    """DISABLED: Users cannot create API keys (admin-controlled MVP)"""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="API key creation is disabled. Contact your administrator to request an API key."
    )


@router.get("", response_model=APIKeyList)
def list_api_keys(
    skip: int = 0,
    limit: int = 50,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_scope("keys:manage"))
):
    """List current user's API key (read-only for MVP)"""
    
    # For MVP: Users can only view their single API key
    query = db.query(APIKey).filter(APIKey.user_id == current_user.id)
    
    if not include_inactive:
        query = query.filter(APIKey.is_active == True)
    
    total = query.count()
    api_keys = query.order_by(APIKey.created_at.desc()).limit(1).all()  # Limit to 1 for MVP
    
    # Count active and expired keys
    active_count = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.is_active == True
    ).count()
    
    expired_count = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.expires_at < datetime.now(timezone.utc)
    ).count()
    
    # Process keys for response (should be max 1 key for MVP)
    key_responses = []
    for key in api_keys:
        # Create response data with parsed scopes
        key_data = {
            'id': key.id,
            'name': key.name,
            'scopes': key.get_scopes(),  # Parse JSON string to list
            'is_active': key.is_active,
            'last_used_at': key.last_used_at,
            'expires_at': key.expires_at,
            'created_at': key.created_at,
            'updated_at': key.updated_at,
            'is_expired': key.expires_at and datetime.now(timezone.utc) > key.expires_at
        }
        
        if key.last_used_at:
            days_diff = (datetime.now(timezone.utc) - key.last_used_at).days
            key_data['days_since_last_used'] = days_diff
            
        key_response = APIKeyResponse(**key_data)
        key_responses.append(key_response)
    
    return APIKeyList(
        api_keys=key_responses,
        total=total,
        active_count=active_count,
        expired_count=expired_count
    )


@router.get("/{key_id}", response_model=APIKeyResponse)
def get_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_scope("keys:manage"))
):
    """Get details of a specific API key"""
    
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Create response data with parsed scopes
    key_data = {
        'id': api_key.id,
        'name': api_key.name,
        'scopes': api_key.get_scopes(),  # Parse JSON string to list
        'is_active': api_key.is_active,
        'last_used_at': api_key.last_used_at,
        'expires_at': api_key.expires_at,
        'created_at': api_key.created_at,
        'updated_at': api_key.updated_at,
        'is_expired': api_key.expires_at and datetime.now(timezone.utc) > api_key.expires_at
    }
    
    if api_key.last_used_at:
        days_diff = (datetime.now(timezone.utc) - api_key.last_used_at).days
        key_data['days_since_last_used'] = days_diff
    
    return APIKeyResponse(**key_data)


@router.put("/{key_id}", response_model=APIKeyResponse)
def update_api_key(
    key_id: str,
    key_update: APIKeyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_scope("keys:manage"))
):
    """Update an API key (only name can be updated)"""
    
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Check for duplicate name
    existing_name = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.name == key_update.name,
        APIKey.id != key_id
    ).first()
    
    if existing_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="API key with this name already exists"
        )
    
    # Update the key
    api_key.name = key_update.name
    db.commit()
    db.refresh(api_key)
    
    # Create response data with parsed scopes
    key_data = {
        'id': api_key.id,
        'name': api_key.name,
        'scopes': api_key.get_scopes(),  # Parse JSON string to list
        'is_active': api_key.is_active,
        'last_used_at': api_key.last_used_at,
        'expires_at': api_key.expires_at,
        'created_at': api_key.created_at,
        'updated_at': api_key.updated_at,
        'is_expired': api_key.expires_at and datetime.now(timezone.utc) > api_key.expires_at
    }
    
    return APIKeyResponse(**key_data)


@router.delete("/{key_id}")
def delete_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_scope("keys:manage"))
):
    """DISABLED: Users cannot delete API keys (admin-controlled MVP)"""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="API key deletion is disabled. Contact your administrator to revoke your API key."
    )


@router.get("/stats/usage", response_model=APIKeyStats)
def get_api_key_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_scope("keys:manage"))
):
    """Get API key usage statistics for current user"""
    
    total_keys = db.query(APIKey).filter(APIKey.user_id == current_user.id).count()
    active_keys = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.is_active == True
    ).count()
    expired_keys = db.query(APIKey).filter(
        APIKey.user_id == current_user.id,
        APIKey.expires_at < datetime.now(timezone.utc)
    ).count()
    
    # For now, set usage counts to 0 - will be implemented with actual usage tracking
    return APIKeyStats(
        total_keys=total_keys,
        active_keys=active_keys,
        expired_keys=expired_keys,
        last_7_days_usage=0,
        last_30_days_usage=0,
        most_used_key=None,
        least_used_key=None
    )


@router.get("/info/scopes", response_model=ScopeListResponse)
def get_available_scopes():
    """Get list of available scopes and their descriptions"""
    return ScopeListResponse()


# Admin endpoints for managing user API keys

@router.get("/admin/users/{user_id}/keys", response_model=APIKeyList)
def admin_list_user_api_keys(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    include_inactive: bool = True,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_tenant_admin_user_enhanced)
):
    """Admin endpoint to list a user's API keys"""
    
    # Check if user exists and belongs to same tenant
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == admin_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    query = db.query(APIKey).filter(APIKey.user_id == user_id)
    
    if not include_inactive:
        query = query.filter(APIKey.is_active == True)
    
    total = query.count()
    api_keys = query.order_by(APIKey.created_at.desc()).offset(skip).limit(limit).all()
    
    # Count active and expired keys
    active_count = db.query(APIKey).filter(
        APIKey.user_id == user_id,
        APIKey.is_active == True
    ).count()
    
    expired_count = db.query(APIKey).filter(
        APIKey.user_id == user_id,
        APIKey.expires_at < datetime.now(timezone.utc)
    ).count()
    
    # Process keys for response
    key_responses = []
    for key in api_keys:
        # Create response data with parsed scopes
        key_data = {
            'id': key.id,
            'name': key.name,
            'scopes': key.get_scopes(),  # Parse JSON string to list
            'is_active': key.is_active,
            'last_used_at': key.last_used_at,
            'expires_at': key.expires_at,
            'created_at': key.created_at,
            'updated_at': key.updated_at,
            'is_expired': key.expires_at and datetime.now(timezone.utc) > key.expires_at
        }
        
        if key.last_used_at:
            days_diff = (datetime.now(timezone.utc) - key.last_used_at).days
            key_data['days_since_last_used'] = days_diff
            
        key_response = APIKeyResponse(**key_data)
        key_responses.append(key_response)
    
    return APIKeyList(
        api_keys=key_responses,
        total=total,
        active_count=active_count,
        expired_count=expired_count
    )


@router.delete("/admin/users/{user_id}/keys/{key_id}")
def admin_revoke_user_api_key(
    user_id: int,
    key_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_tenant_admin_user_enhanced)
):
    """Admin endpoint to revoke a user's API key"""
    
    # Check if user exists and belongs to same tenant
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == admin_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Find the API key
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == user_id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Revoke the key
    api_key.is_active = False
    db.commit()
    
    return {"message": f"API key '{api_key.name}' revoked successfully"}


@router.put("/admin/users/{user_id}/keys/{key_id}/toggle")
def admin_toggle_user_api_key(
    user_id: int,
    key_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_tenant_admin_user_enhanced)
):
    """Admin endpoint to enable/disable a user's API key"""
    
    # Check if user exists and belongs to same tenant
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == admin_user.tenant_id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Find the API key
    api_key = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.user_id == user_id
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    # Toggle the key status
    api_key.is_active = not api_key.is_active
    action = "enabled" if api_key.is_active else "disabled"
    db.commit()
    
    return {"message": f"API key '{api_key.name}' {action} successfully", "is_active": api_key.is_active}