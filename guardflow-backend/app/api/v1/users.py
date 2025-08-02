from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.api.deps import get_current_user_from_api_token
from app.models.user import User
from app.models.log import Log
from app.models.user_task import UserTask
from app.schemas.user import UserProfileResponse
from app.schemas.log import LogResponse
from app.schemas.task import TaskResponse

router = APIRouter()


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user_from_api_token),
    db: Session = Depends(get_db)
):
    """Get current user's profile and usage statistics"""
    # Calculate usage statistics
    today_usage = db.query(Log).filter(
        Log.user_id == current_user.id,
        Log.timestamp >= datetime.utcnow().date()
    ).count()
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "daily_quota": current_user.daily_quota,
        "monthly_quota": current_user.monthly_quota,
        "current_daily_usage": current_user.current_daily_usage,
        "current_monthly_usage": current_user.current_monthly_usage,
        "deviation_score": current_user.deviation_score,
        "is_blocked": current_user.is_blocked,
        "blocked_reason": current_user.blocked_reason,
        "last_activity": current_user.last_activity,
        "created_at": current_user.created_at
    }


@router.get("/usage", response_model=List[LogResponse])
async def get_user_usage(
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_user_from_api_token),
    db: Session = Depends(get_db)
):
    """Get current user's usage history"""
    logs = db.query(Log).filter(
        Log.user_id == current_user.id
    ).order_by(Log.timestamp.desc()).offset(skip).limit(limit).all()
    
    return logs


@router.get("/tasks", response_model=List[TaskResponse])
async def get_user_tasks(
    current_user: User = Depends(get_current_user_from_api_token),
    db: Session = Depends(get_db)
):
    """Get tasks assigned to current user"""
    user_tasks = db.query(UserTask).filter(
        UserTask.user_id == current_user.id,
        UserTask.is_active == True
    ).all()
    
    tasks = [ut.task for ut in user_tasks]
    return tasks


@router.get("/quota")
async def get_quota_status(
    current_user: User = Depends(get_current_user_from_api_token)
):
    """Get current quota status"""
    daily_remaining = max(0, current_user.daily_quota - current_user.current_daily_usage)
    monthly_remaining = max(0, current_user.monthly_quota - current_user.current_monthly_usage)
    
    daily_percentage = (current_user.current_daily_usage / current_user.daily_quota) * 100
    monthly_percentage = (current_user.current_monthly_usage / current_user.monthly_quota) * 100
    
    return {
        "daily": {
            "used": current_user.current_daily_usage,
            "limit": current_user.daily_quota,
            "remaining": daily_remaining,
            "percentage": round(daily_percentage, 2)
        },
        "monthly": {
            "used": current_user.current_monthly_usage,
            "limit": current_user.monthly_quota,
            "remaining": monthly_remaining,
            "percentage": round(monthly_percentage, 2)
        },
        "deviation_score": float(current_user.deviation_score),
        "is_blocked": current_user.is_blocked
    }