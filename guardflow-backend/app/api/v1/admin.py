from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.api.deps import get_current_admin_user
from app.models.user import User
from app.models.task import Task
from app.models.log import Log
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.schemas.log import LogResponse
from app.services.admin_service import AdminService

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get all users (admin only)"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Create a new user (admin only)"""
    admin_service = AdminService(db)
    return await admin_service.create_user(user_data)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get user by ID (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Update user (admin only)"""
    admin_service = AdminService(db)
    return await admin_service.update_user(user_id, user_data)


@router.post("/users/{user_id}/block")
async def block_user(
    user_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Block a user (admin only)"""
    admin_service = AdminService(db)
    return await admin_service.block_user(user_id, reason)


@router.post("/users/{user_id}/unblock")
async def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Unblock a user (admin only)"""
    admin_service = AdminService(db)
    return await admin_service.unblock_user(user_id)


@router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get all tasks (admin only)"""
    tasks = db.query(Task).offset(skip).limit(limit).all()
    return tasks


@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Create a new task (admin only)"""
    admin_service = AdminService(db)
    return await admin_service.create_task(task_data, current_admin.id)


@router.get("/logs", response_model=List[LogResponse])
async def get_logs(
    user_id: Optional[int] = None,
    task_id: Optional[int] = None,
    limit: int = 100,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get system logs with optional filtering (admin only)"""
    query = db.query(Log)
    
    if user_id:
        query = query.filter(Log.user_id == user_id)
    if task_id:
        query = query.filter(Log.task_id == task_id)
    
    logs = query.order_by(Log.timestamp.desc()).offset(skip).limit(limit).all()
    return logs


@router.get("/analytics/usage")
async def get_usage_analytics(
    days: int = 7,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get usage analytics (admin only)"""
    admin_service = AdminService(db)
    return await admin_service.get_usage_analytics(days)


@router.get("/analytics/users")
async def get_user_analytics(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get user analytics (admin only)"""
    admin_service = AdminService(db)
    return await admin_service.get_user_analytics()