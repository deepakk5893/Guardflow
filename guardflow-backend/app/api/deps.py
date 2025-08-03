from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from redis import Redis

from app.database import get_db
from app.core.config import settings
from app.core.security import verify_token, verify_password
from app.models.user import User
import redis

# Security scheme
security = HTTPBearer()

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
    current_user: User = Depends(get_current_user_from_jwt)
) -> User:
    """Get current admin user (requires admin privileges)"""
    # For now, check if user email matches admin email
    # In production, you might want a proper role system
    if current_user.email != settings.ADMIN_EMAIL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


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