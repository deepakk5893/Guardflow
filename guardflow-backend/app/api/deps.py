from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from redis import Redis

from app.database import get_db
from app.core.config import settings
from app.core.security import verify_token, verify_password
from app.models import User, Tenant, Role, APIKey
import redis

# Security scheme
security = HTTPBearer(auto_error=False)

# Redis connection
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)


def get_redis() -> Redis:
    """Get Redis client"""
    return redis_client


def get_current_user_from_jwt(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current user from JWT token (for admin endpoints)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify token
    subject = verify_token(credentials.credentials)
    if subject is None:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.id == int(subject)).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user


def get_current_user_from_api_token(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current user from API token (for proxy endpoints)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Get user by token hash
    user = db.query(User).filter(User.token_hash == credentials.credentials).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is blocked: {user.blocked_reason}"
        )
    
    return user


def get_current_admin_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current admin user (requires admin privileges)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify token
    subject = verify_token(credentials.credentials)
    if subject is None:
        raise credentials_exception
    
    # Get user with relationships (tenant and role)
    user = db.query(User).join(Tenant).join(Role).filter(User.id == int(subject)).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Check admin privileges
    if user.role.name not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return user


def check_rate_limit(
    user: User,
    redis_client: Redis = Depends(get_redis)
) -> None:
    """Check if user has exceeded rate limit"""
    # Rate limit key
    rate_limit_key = f"rate_limit:{user.id}"
    
    # Get current request count
    current_count = redis_client.get(rate_limit_key)
    if current_count is None:
        current_count = 0
    else:
        current_count = int(current_count)
    
    # Check if rate limit exceeded
    if current_count >= user.requests_per_hour:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )
    
    # Increment counter
    redis_client.incr(rate_limit_key)
    redis_client.expire(rate_limit_key, 3600)  # 1 hour TTL


def check_task_quota(chat_tokens_used: int, task_token_limit: int, estimated_tokens: int = 0) -> None:
    """Check if task has sufficient token quota remaining"""
    total_needed = chat_tokens_used + estimated_tokens
    
    if total_needed > task_token_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Task token limit exceeded. Used: {chat_tokens_used}, Need: {estimated_tokens}, Limit: {task_token_limit}"
        )


# Multi-Tenant Dependencies

def get_current_user_with_tenant(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current user with tenant and role information loaded"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify token
    subject = verify_token(credentials.credentials)
    if subject is None:
        raise credentials_exception
    
    # Get user with relationships
    user = db.query(User).join(Tenant).join(Role).filter(User.id == int(subject)).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    return user


def get_current_user_api_with_tenant(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """Get current user from API token with tenant information"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Get user by token hash with relationships
    user = db.query(User).join(Tenant).join(Role).filter(User.token_hash == credentials.credentials).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is blocked: {user.blocked_reason}"
        )
    
    # Check tenant status
    if user.tenant.status == 'suspended':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant account is suspended"
        )
    
    return user


def require_role(required_role: str):
    """Dependency factory for role-based access control"""
    def check_role(user: User = Depends(get_current_user_with_tenant)) -> User:
        if user.role.name != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {required_role}"
            )
        return user
    return check_role


def require_permission(required_permission: str):
    """Dependency factory for permission-based access control"""
    def check_permission(user: User = Depends(get_current_user_with_tenant)) -> User:
        if not user.role.has_permission(required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required permission: {required_permission}"
            )
        return user
    return check_permission


def get_super_admin_user(user: User = Depends(require_role("super_admin"))) -> User:
    """Get current super admin user"""
    return user


def get_tenant_admin_user(user: User = Depends(require_role("admin"))) -> User:
    """Get current tenant admin user"""
    return user


def get_tenant_from_user(user: User = Depends(get_current_user_with_tenant)) -> Tenant:
    """Get tenant from current user"""
    if not user.tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with any tenant"
        )
    return user.tenant


# Enhanced Authentication with API Key Support

def get_current_user_from_api_key(
    request: Request,
    db: Session = Depends(get_db)
) -> tuple[User, APIKey]:
    """Get current user from API key in X-API-Key header"""
    api_key_header = request.headers.get("X-API-Key")
    
    if not api_key_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key header required",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    # Find API key by hash
    # here
    api_key = None
    print(f'api_key_header => {api_key_header}')
    for key in db.query(APIKey).filter(APIKey.is_active == True).all():
        print(f'key => {key}')
        print(f'key.verify_key(api_key_header) => {key.verify_key(api_key_header)}')
        if key.verify_key(api_key_header):
            api_key = key
            break
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    # Check if key is valid (not expired)
    if not api_key.is_valid():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key expired or inactive",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    # Get user with relationships
    user = db.query(User).join(Tenant).join(Role).filter(User.id == api_key.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for API key"
        )
    
    # Check user status
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User account is blocked: {user.blocked_reason}"
        )
    
    # Check tenant status
    if user.tenant.status == 'suspended':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant account is suspended"
        )
    
    # Update last used timestamp
    api_key.mark_as_used()
    db.commit()
    
    return user, api_key


def get_current_user_dual_auth(
    request: Request,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> tuple[User, Optional[APIKey]]:
    """Get current user from either JWT token or API key"""
    
    # Try API key first (X-API-Key header)
    api_key_header = request.headers.get("X-API-Key")
    if api_key_header:
        user, api_key = get_current_user_from_api_key(request, db)
        return user, api_key
    
    # Try JWT token (Authorization: Bearer header)
    if credentials:
        try:
            user = get_current_user_with_tenant(db, credentials)
            return user, None
        except HTTPException:
            pass
    
    # No valid authentication found
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide either X-API-Key header or Authorization: Bearer token",
        headers={"WWW-Authenticate": "Bearer, ApiKey"},
    )


def require_scope(required_scope: str):
    """Dependency factory for scope-based access control with API keys"""
    def check_scope(
        request: Request,
        db: Session = Depends(get_db),
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> User:
        user, api_key = get_current_user_dual_auth(request, db, credentials)
        
        # If using API key, check scopes
        if api_key:
            if not api_key.has_scope(required_scope):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"API key missing required scope: {required_scope}"
                )
        
        # JWT tokens have full access for now
        return user

    return check_scope


def require_scopes(required_scopes: List[str]):
    """Dependency factory for multiple scope requirements"""
    def check_scopes(
        request: Request,
        db: Session = Depends(get_db),
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> User:
        user, api_key = get_current_user_dual_auth(request, db, credentials)
        
        # If using API key, check all required scopes
        if api_key:
            for scope in required_scopes:
                if not api_key.has_scope(scope):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"API key missing required scope: {scope}"
                    )
        
        # JWT tokens have full access for now
        return user
    
    return check_scopes


# Enhanced role dependencies with dual auth support

def get_current_user_enhanced(
    request: Request,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> User:
    """Enhanced user dependency with dual auth support"""
    user, _ = get_current_user_dual_auth(request, db, credentials)
    return user


def get_tenant_admin_user_enhanced(
    user: User = Depends(get_current_user_enhanced)
) -> User:
    """Enhanced tenant admin dependency with dual auth support"""
    if user.role.name not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return user