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


@router.get("/tasks")
async def get_tasks(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    difficulty_level: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get all tasks with assignment status and filtering (admin only)"""
    from app.models.user_task import UserTask
    from sqlalchemy import func, or_
    
    # Start with base query
    query = db.query(Task)
    
    # Apply filters
    if category:
        query = query.filter(Task.category == category)
    
    if difficulty_level:
        query = query.filter(Task.difficulty_level == difficulty_level)
    
    if is_active is not None:
        query = query.filter(Task.is_active == is_active)
    
    if search:
        query = query.filter(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%")
            )
        )
    
    tasks = query.offset(skip).limit(limit).all()
    
    # Get assignment counts for each task
    assignment_counts = db.query(
        UserTask.task_id,
        func.count(UserTask.id).label('assigned_users_count')
    ).filter(
        UserTask.is_active == True
    ).group_by(UserTask.task_id).all()
    
    # Convert to dict for easy lookup
    assignment_dict = {task_id: count for task_id, count in assignment_counts}
    
    # Build response with assignment status
    result = []
    for task in tasks:
        assigned_count = assignment_dict.get(task.id, 0)
        result.append({
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "category": task.category,
            "difficulty_level": task.difficulty_level,
            "estimated_hours": task.estimated_hours,
            "token_limit": task.token_limit,
            "is_active": task.is_active,
            "allowed_intents": task.allowed_intents or [],
            "task_scope": task.task_scope,
            "created_by": task.created_by,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
            "assigned_users_count": assigned_count,
            "has_assignments": assigned_count > 0
        })
    
    return result


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


# Task Assignment Endpoints
@router.get("/task-assignments")
async def get_task_assignments(
    task_id: Optional[int] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get task assignments with optional filtering"""
    from app.models.user_task import UserTask
    
    query = db.query(UserTask)
    
    if task_id:
        query = query.filter(UserTask.task_id == task_id)
    if user_id:
        query = query.filter(UserTask.user_id == user_id)
    
    assignments = query.all()
    
    # Format response to match frontend interface
    result = []
    for assignment in assignments:
        result.append({
            "id": assignment.id,
            "user_id": assignment.user_id,
            "user_name": assignment.user.name,
            "user_email": assignment.user.email,
            "task_id": assignment.task_id,
            "task_title": assignment.task.title,
            "task_category": assignment.task.category,
            "assigned_at": assignment.assigned_at.isoformat(),
            "assigned_by": assignment.assigned_by,
            "status": "completed" if assignment.completed_at else ("active" if assignment.is_active else "cancelled"),
            "progress_notes": assignment.progress_notes,
            "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
            "token_limit": assignment.task.token_limit
        })
    
    return result


@router.post("/task-assignments")
async def assign_task(
    assignment_data: dict,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Assign a task to a user"""
    from app.models.user_task import UserTask
    from datetime import datetime
    
    user_id = assignment_data.get("user_id")
    task_id = assignment_data.get("task_id")
    # Token limit is defined by the task, not per assignment
    progress_notes = assignment_data.get("progress_notes", "")
    
    # Check if assignment already exists
    existing = db.query(UserTask).filter(
        UserTask.user_id == user_id,
        UserTask.task_id == task_id,
        UserTask.is_active == True
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already assigned to this task"
        )
    
    # Create new assignment
    assignment = UserTask(
        user_id=user_id,
        task_id=task_id,
        assigned_by=current_admin.id,
        assigned_at=datetime.utcnow(),
        progress_notes=progress_notes,
        is_active=True
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    
    # Return formatted response
    return {
        "id": assignment.id,
        "user_id": assignment.user_id,
        "user_name": assignment.user.name,
        "user_email": assignment.user.email,
        "task_id": assignment.task_id,
        "task_title": assignment.task.title,
        "task_category": assignment.task.category,
        "assigned_at": assignment.assigned_at.isoformat(),
        "assigned_by": assignment.assigned_by,
        "status": "active",
        "progress_notes": assignment.progress_notes,
        "completed_at": None,
        "daily_quota_limit": assignment.daily_quota_limit or assignment.task.daily_quota_limit
    }


@router.put("/task-assignments/{assignment_id}")
async def update_task_assignment(
    assignment_id: int,
    updates: dict,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Update a task assignment"""
    from app.models.user_task import UserTask
    from datetime import datetime
    
    assignment = db.query(UserTask).filter(UserTask.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task assignment not found"
        )
    
    # Update fields
    if "status" in updates:
        status_value = updates["status"]
        if status_value == "completed":
            assignment.completed_at = datetime.utcnow()
            assignment.is_active = False
        elif status_value == "cancelled":
            assignment.is_active = False
            assignment.completed_at = None
        elif status_value == "active":
            assignment.is_active = True
            assignment.completed_at = None
    
    if "progress_notes" in updates:
        assignment.progress_notes = updates["progress_notes"]
    
    # Token limit is defined by the task, not per assignment
    
    
    db.commit()
    db.refresh(assignment)
    
    # Return formatted response
    return {
        "id": assignment.id,
        "user_id": assignment.user_id,
        "user_name": assignment.user.name,
        "user_email": assignment.user.email,
        "task_id": assignment.task_id,
        "task_title": assignment.task.title,
        "task_category": assignment.task.category,
        "assigned_at": assignment.assigned_at.isoformat(),
        "assigned_by": assignment.assigned_by,
        "status": "completed" if assignment.completed_at else ("active" if assignment.is_active else "cancelled"),
        "progress_notes": assignment.progress_notes,
        "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
        "daily_quota_limit": assignment.daily_quota_limit or assignment.task.daily_quota_limit
    }


@router.delete("/task-assignments/{assignment_id}")
async def remove_task_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Remove a task assignment"""
    from app.models.user_task import UserTask
    
    assignment = db.query(UserTask).filter(UserTask.id == assignment_id).first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task assignment not found"
        )
    
    db.delete(assignment)
    db.commit()
    
    return {"message": "Task assignment removed successfully"}


@router.get("/tasks/{task_id}/assignments")
async def get_task_assignments_by_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Get assignments for a specific task"""
    return await get_task_assignments(task_id=task_id, db=db, current_admin=current_admin)