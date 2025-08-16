from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.api.deps import get_current_admin_user
from app.models.user import User
from app.models.task import Task
from app.models.log import Log
from app.models.api_key import APIKey
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
    """Get all users in the current tenant (admin only)"""
    # Filter by tenant_id and exclude the current admin user
    users = db.query(User).filter(
        User.tenant_id == current_admin.tenant_id,
        User.id != current_admin.id  # Exclude current admin user
    ).offset(skip).limit(limit).all()
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
    """Get user by ID within the current tenant (admin only)"""
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    return user


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Update user within the current tenant (admin only)"""
    # First verify the user exists in the current tenant
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    
    admin_service = AdminService(db)
    return await admin_service.update_user(user_id, user_data)


@router.post("/users/{user_id}/block")
async def block_user(
    user_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Block a user within the current tenant (admin only)"""
    # First verify the user exists in the current tenant
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    
    admin_service = AdminService(db)
    return await admin_service.block_user(user_id, reason)


@router.post("/users/{user_id}/unblock")
async def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Unblock a user within the current tenant (admin only)"""
    # First verify the user exists in the current tenant
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    
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
    task_data: dict,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Create a new task or dummy API access task (admin only)"""
    # Check if this is a dummy task creation request
    if task_data.get("is_dummy_task"):
        return await create_dummy_task(task_data, db, current_admin)
    
    # Regular task creation
    admin_service = AdminService(db)
    task_create = TaskCreate(**task_data)
    return await admin_service.create_task(task_create, current_admin.id)


async def create_dummy_task(
    dummy_data: dict,
    db: Session,
    current_admin: User
) -> dict:
    """Create a dummy task for API access"""
    user_id = dummy_data.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="user_id is required for dummy task creation"
        )
    
    # Verify user exists in current tenant
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    
    # Check if user already has a dummy task
    from app.models.user_task import UserTask
    
    existing_dummy = db.query(Task).filter(
        Task.is_dummy_task == True,
        Task.created_by == current_admin.id
    ).join(
        UserTask,
        Task.id == UserTask.task_id
    ).filter(
        UserTask.user_id == user_id,
        UserTask.is_active == True
    ).first()
    
    if existing_dummy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {target_user.name} already has an active API access task"
        )
    
    # Create dummy task using the Task model's helper method
    dummy_task = Task.create_dummy_task(
        user_id=user_id,
        tenant_id=current_admin.tenant_id,
        user_name=target_user.name
    )
    dummy_task.created_by = current_admin.id
    
    db.add(dummy_task)
    db.flush()  # Get the task ID
    
    # Auto-assign the task to the user
    from datetime import datetime
    
    assignment = UserTask(
        user_id=user_id,
        task_id=dummy_task.id,
        assigned_by=current_admin.id,
        assigned_at=datetime.utcnow(),
        progress_notes="Automatic assignment for API access",
        is_active=True
    )
    
    db.add(assignment)
    db.commit()
    db.refresh(dummy_task)
    
    # Return task response
    return {
        "id": dummy_task.id,
        "title": dummy_task.title,
        "description": dummy_task.description,
        "category": dummy_task.category,
        "difficulty_level": dummy_task.difficulty_level,
        "estimated_hours": dummy_task.estimated_hours,
        "token_limit": dummy_task.token_limit,
        "max_tokens_per_request": dummy_task.max_tokens_per_request,
        "is_active": dummy_task.is_active,
        "is_dummy_task": dummy_task.is_dummy_task,
        "allowed_intents": dummy_task.allowed_intents or [],
        "task_scope": dummy_task.task_scope,
        "created_by": dummy_task.created_by,
        "created_at": dummy_task.created_at.isoformat(),
        "updated_at": dummy_task.updated_at.isoformat(),
        "assigned_user": {
            "id": target_user.id,
            "name": target_user.name,
            "email": target_user.email
        }
    }


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


# Admin-Controlled API Key Management Endpoints

@router.post("/users/{user_id}/api-key")
async def admin_create_api_key_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Admin creates an API key for a user (MVP: one key per user)"""
    
    # Verify user exists and belongs to current tenant
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    
    try:
        # Create API key using the model's helper method
        api_key = APIKey.create_admin_key_for_user(
            user_id=user_id,
            tenant_id=current_admin.tenant_id,
            admin_user_id=current_admin.id,
            db_session=db
        )
        
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        
        return {
            "message": f"API key created for {target_user.name}",
            "api_key": api_key.get_raw_key(),  # Return the raw key for admin
            "key_id": api_key.id,
            "user_id": user_id,
            "user_name": target_user.name,
            "user_email": target_user.email,
            "scopes": api_key.get_scopes(),
            "created_at": api_key.created_at.isoformat()
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/users/{user_id}/api-key/regenerate")
async def admin_regenerate_api_key_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Admin regenerates an API key for a user (revokes old, creates new)"""
    
    # Verify user exists and belongs to current tenant
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    
    try:
        # Regenerate API key using the model's helper method
        api_key = APIKey.regenerate_user_key(
            user_id=user_id,
            tenant_id=current_admin.tenant_id,
            admin_user_id=current_admin.id,
            db_session=db
        )
        
        db.add(api_key)
        db.commit()
        db.refresh(api_key)
        
        return {
            "message": f"API key regenerated for {target_user.name}",
            "api_key": api_key.get_raw_key(),  # Return the new raw key
            "key_id": api_key.id,
            "user_id": user_id,
            "user_name": target_user.name,
            "user_email": target_user.email,
            "scopes": api_key.get_scopes(),
            "created_at": api_key.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate API key: {str(e)}"
        )


@router.delete("/users/{user_id}/api-key")
async def admin_revoke_api_key_for_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Admin revokes a user's API key"""
    
    # Verify user exists and belongs to current tenant
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    
    # Find active API key
    api_key = db.query(APIKey).filter(
        APIKey.user_id == user_id,
        APIKey.is_active == True
    ).first()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active API key found for this user"
        )
    
    # Revoke the key
    api_key.is_active = False
    db.commit()
    
    return {
        "message": f"API key revoked for {target_user.name}",
        "user_id": user_id,
        "user_name": target_user.name,
        "revoked_at": api_key.updated_at.isoformat()
    }


@router.get("/users/{user_id}/api-key")
async def admin_get_user_api_key_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user)
):
    """Admin gets API key status for a user"""
    
    # Verify user exists and belongs to current tenant
    target_user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == current_admin.tenant_id
    ).first()
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in your organization"
        )
    
    # Find API key (active or inactive)
    api_key = db.query(APIKey).filter(
        APIKey.user_id == user_id
    ).order_by(APIKey.created_at.desc()).first()
    
    if not api_key:
        return {
            "user_id": user_id,
            "user_name": target_user.name,
            "user_email": target_user.email,
            "has_api_key": False,
            "api_key_status": None
        }
    
    return {
        "user_id": user_id,
        "user_name": target_user.name,
        "user_email": target_user.email,
        "has_api_key": True,
        "api_key_status": {
            "id": api_key.id,
            "name": api_key.name,
            "is_active": api_key.is_active,
            "scopes": api_key.get_scopes(),
            "created_at": api_key.created_at.isoformat(),
            "last_used_at": api_key.last_used_at.isoformat() if api_key.last_used_at else None,
            "expires_at": api_key.expires_at.isoformat() if api_key.expires_at else None,
            "is_expired": api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc) if api_key.expires_at else False
        }
    }