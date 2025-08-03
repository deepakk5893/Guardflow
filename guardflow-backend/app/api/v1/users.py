from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.api.deps import get_current_user_from_api_token, get_current_user_from_jwt
from app.models.user import User
from app.models.log import Log
from app.models.user_task import UserTask
from app.models.task import Task
from app.models.chat import Chat, Message
from app.schemas.user import UserProfileResponse
from app.schemas.log import LogResponse
from app.schemas.task import TaskResponse

router = APIRouter()


# User Dashboard API endpoints (JWT authentication)
@router.get("/stats")
async def get_user_stats(
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get user's overview statistics for dashboard"""
    # Calculate total tokens used from logs
    total_log_tokens_result = db.query(func.sum(Log.openai_tokens_used)).filter(
        Log.user_id == current_user.id
    ).scalar()
    total_log_tokens = total_log_tokens_result or 0
    
    # Calculate total tokens used from chat messages
    total_chat_tokens_result = db.query(func.sum(Message.tokens_used)).join(
        Chat, Message.chat_id == Chat.id
    ).filter(Chat.user_id == current_user.id).scalar()
    total_chat_tokens = total_chat_tokens_result or 0
    
    # Combined total tokens
    total_tokens_used = total_log_tokens + total_chat_tokens
    
    return {
        "total_tokens_used": total_tokens_used,
        "current_deviation_score": float(current_user.deviation_score)
    }


@router.get("/quota-status")
async def get_quota_status(
    current_user: User = Depends(get_current_user_from_jwt)
):
    """Get current user status and warnings"""
    high_deviation_score = float(current_user.deviation_score) >= 0.7
    blocked_status = current_user.is_blocked
    
    return {
        "deviation_score": float(current_user.deviation_score),
        "warnings": {
            "high_deviation_score": high_deviation_score,
            "blocked_status": blocked_status
        }
    }


@router.get("/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get current user's profile information"""
    # Calculate total requests and tokens from logs
    total_requests = db.query(Log).filter(Log.user_id == current_user.id).count()
    total_log_tokens_result = db.query(func.sum(Log.openai_tokens_used)).filter(
        Log.user_id == current_user.id
    ).scalar()
    total_log_tokens = total_log_tokens_result or 0
    
    # Calculate total tokens used from chat messages
    total_chat_tokens_result = db.query(func.sum(Message.tokens_used)).join(
        Chat, Message.chat_id == Chat.id
    ).filter(Chat.user_id == current_user.id).scalar()
    total_chat_tokens = total_chat_tokens_result or 0
    
    # Combined total tokens
    total_tokens_used = total_log_tokens + total_chat_tokens
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat(),
        "last_login": current_user.last_activity.isoformat() if current_user.last_activity else None,
        "is_blocked": current_user.is_blocked,
        "current_deviation_score": float(current_user.deviation_score),
        "total_requests": total_requests,
        "total_tokens_used": total_tokens_used
    }


@router.put("/profile")
async def update_user_profile(
    updates: dict,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Update user profile (limited fields)"""
    # Only allow updating name for now
    if "name" in updates:
        current_user.name = updates["name"]
        db.commit()
        db.refresh(current_user)
    
    # Return updated profile
    total_requests = db.query(Log).filter(Log.user_id == current_user.id).count()
    total_log_tokens_result = db.query(func.sum(Log.openai_tokens_used)).filter(
        Log.user_id == current_user.id
    ).scalar()
    total_log_tokens = total_log_tokens_result or 0
    
    # Calculate total tokens used from chat messages
    total_chat_tokens_result = db.query(func.sum(Message.tokens_used)).join(
        Chat, Message.chat_id == Chat.id
    ).filter(Chat.user_id == current_user.id).scalar()
    total_chat_tokens = total_chat_tokens_result or 0
    
    # Combined total tokens
    total_tokens_used = total_log_tokens + total_chat_tokens
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat(),
        "last_login": current_user.last_activity.isoformat() if current_user.last_activity else None,
        "is_blocked": current_user.is_blocked,
        "current_deviation_score": float(current_user.deviation_score),
        "total_requests": total_requests,
        "total_tokens_used": total_tokens_used
    }


@router.post("/change-password")
async def change_password(
    password_data: dict,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Change user's password"""
    current_password = password_data.get("current_password")
    new_password = password_data.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password and new password are required"
        )
    
    # Verify current password (plain text for now)
    if current_user.password != current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password (plain text for now)
    current_user.password = new_password
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.get("/daily-usage")
async def get_user_daily_usage(
    days: int = 30,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get user's daily usage for the last N days"""
    start_date = datetime.utcnow().date() - timedelta(days=days)
    
    # Query daily aggregated data from logs
    daily_log_stats = db.query(
        func.date(Log.timestamp).label('date'),
        func.sum(Log.openai_tokens_used).label('tokens')
    ).filter(
        Log.user_id == current_user.id,
        func.date(Log.timestamp) >= start_date
    ).group_by(
        func.date(Log.timestamp)
    ).order_by(
        func.date(Log.timestamp)
    ).all()
    
    # Query daily aggregated data from chat messages
    daily_chat_stats = db.query(
        func.date(Message.created_at).label('date'),
        func.sum(Message.tokens_used).label('tokens')
    ).join(
        Chat, Message.chat_id == Chat.id
    ).filter(
        Chat.user_id == current_user.id,
        func.date(Message.created_at) >= start_date
    ).group_by(
        func.date(Message.created_at)
    ).all()
    
    # Combine the results
    combined_stats = {}
    
    # Add log stats
    for stat in daily_log_stats:
        date_str = stat.date.isoformat()
        combined_stats[date_str] = {
            'date': date_str,
            'tokens': stat.tokens or 0
        }
    
    # Add chat tokens to existing dates or create new entries
    for stat in daily_chat_stats:
        date_str = stat.date.isoformat()
        if date_str in combined_stats:
            combined_stats[date_str]['tokens'] += stat.tokens or 0
        else:
            combined_stats[date_str] = {
                'date': date_str,
                'tokens': stat.tokens or 0
            }
    
    # Convert to sorted list
    daily_stats = sorted(combined_stats.values(), key=lambda x: x['date'])
    
    # Format results (daily_stats is now a list of dictionaries)
    result = []
    for stat in daily_stats:
        result.append({
            "date": stat['date'],
            "tokens": stat['tokens']
        })
    
    return result


@router.get("/logs")
async def get_user_logs(
    task_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get current user's request logs with filtering"""
    query = db.query(Log).filter(Log.user_id == current_user.id)
    
    # Apply filters
    if task_id:
        query = query.filter(Log.task_id == task_id)
    if status:
        query = query.filter(Log.status == status)
    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        query = query.filter(Log.timestamp >= start_dt)
    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query = query.filter(Log.timestamp <= end_dt)
    if search:
        query = query.filter(
            Log.prompt.ilike(f"%{search}%") |
            Log.response.ilike(f"%{search}%")
        )
    
    logs = query.order_by(Log.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Format results to match frontend interface
    result = []
    for log in logs:
        # Get task info if available
        task_title = None
        if log.task_id:
            task = db.query(Task).filter(Task.id == log.task_id).first()
            task_title = task.title if task else None
        
        result.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "model": log.model,
            "prompt": log.prompt,
            "response": log.response,
            "status": log.status,
            "tokens_used": log.openai_tokens_used or 0,
            "response_time_ms": log.response_time_ms or 0,
            "intent_classification": log.intent_classification,
            "confidence_score": float(log.confidence_score) if log.confidence_score else None,
            "deviation_score_delta": float(log.deviation_score_delta) if log.deviation_score_delta else 0.0,
            "error_message": log.error_message,
            "task_id": log.task_id,
            "task_title": task_title
        })
    
    return result


# Keep the existing endpoints for API token authentication (for actual API usage)
@router.get("/api-profile", response_model=UserProfileResponse)
async def get_user_api_profile(
    current_user: User = Depends(get_current_user_from_api_token),
    db: Session = Depends(get_db)
):
    """Get current user's profile and usage statistics (API token auth)"""
    # Calculate usage statistics
    today_usage = db.query(Log).filter(
        Log.user_id == current_user.id,
        Log.timestamp >= datetime.utcnow().date()
    ).count()
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "deviation_score": current_user.deviation_score,
        "is_blocked": current_user.is_blocked,
        "blocked_reason": current_user.blocked_reason,
        "last_activity": current_user.last_activity,
        "created_at": current_user.created_at
    }


@router.get("/api-usage", response_model=List[LogResponse])
async def get_user_api_usage(
    limit: int = 50,
    skip: int = 0,
    current_user: User = Depends(get_current_user_from_api_token),
    db: Session = Depends(get_db)
):
    """Get current user's usage history (API token auth)"""
    logs = db.query(Log).filter(
        Log.user_id == current_user.id
    ).order_by(Log.timestamp.desc()).offset(skip).limit(limit).all()
    
    return logs


@router.get("/tasks")
async def get_user_tasks(
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get tasks assigned to current user with assignment details"""
    print(f"DEBUG: Getting tasks for user_id={current_user.id}, email={current_user.email}")
    
    user_tasks = db.query(UserTask).filter(
        UserTask.user_id == current_user.id,
        UserTask.is_active == True
    ).all()
    
    print(f"DEBUG: Found {len(user_tasks)} user_tasks for user {current_user.id}")
    for ut in user_tasks:
        print(f"DEBUG: UserTask - id={ut.id}, user_id={ut.user_id}, task_id={ut.task_id}, is_active={ut.is_active}")
    
    # Format results to match frontend interface
    result = []
    for ut in user_tasks:
        task = ut.task
        # Calculate usage statistics for this task
        task_logs = db.query(Log).filter(
            Log.user_id == current_user.id,
            Log.task_id == task.id
        ).all()
        
        # Calculate tokens from logs
        log_tokens = sum(log.openai_tokens_used or 0 for log in task_logs)
        
        # Calculate tokens from chat messages for this task
        chat_tokens_result = db.query(func.sum(Message.tokens_used)).join(
            Chat, Message.chat_id == Chat.id
        ).filter(
            Chat.user_id == current_user.id,
            Chat.task_id == task.id
        ).scalar()
        chat_tokens = chat_tokens_result or 0
        
        tokens_used = log_tokens + chat_tokens
        
        result.append({
            "id": ut.id,
            "task_id": task.id,
            "task_title": task.title,
            "task_description": task.description,
            "task_category": task.category,
            "task_difficulty": task.difficulty_level,
            "assigned_at": ut.assigned_at.isoformat(),
            "status": "completed" if ut.completed_at else "active",
            "progress_notes": ut.progress_notes,
            "completion_date": ut.completed_at.isoformat() if ut.completed_at else None,
            "estimated_hours": task.estimated_hours,
            "token_limit": task.token_limit,
            "tokens_used": tokens_used
        })
    
    print(f"DEBUG: Returning {len(result)} tasks")
    return result


@router.get("/api-tasks", response_model=List[TaskResponse])
async def get_user_api_tasks(
    current_user: User = Depends(get_current_user_from_api_token),
    db: Session = Depends(get_db)
):
    """Get tasks assigned to current user (API token auth)"""
    user_tasks = db.query(UserTask).filter(
        UserTask.user_id == current_user.id,
        UserTask.is_active == True
    ).all()
    
    tasks = [ut.task for ut in user_tasks]
    return tasks


@router.get("/api-quota")
async def get_api_quota_status(
    current_user: User = Depends(get_current_user_from_api_token)
):
    """Get current user status (API token auth)"""
    return {
        "deviation_score": float(current_user.deviation_score),
        "is_blocked": current_user.is_blocked,
        "blocked_reason": current_user.blocked_reason
    }