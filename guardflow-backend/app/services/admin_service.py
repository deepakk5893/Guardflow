from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.models.user import User
from app.models.task import Task
from app.models.log import Log
from app.models.user_task import UserTask
from app.schemas.user import UserCreate, UserUpdate
from app.schemas.task import TaskCreate, TaskUpdate
from app.core.security import generate_api_token, hash_api_token


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    async def create_user(self, user_data: UserCreate) -> User:
        """Create a new user with API token"""
        
        # Generate API token
        api_token = generate_api_token()
        token_hash = hash_api_token(api_token)
        
        # Create user
        user = User(
            email=user_data.email,
            name=user_data.name,
            token_hash=token_hash,
            daily_quota=user_data.daily_quota,
            monthly_quota=user_data.monthly_quota,
            requests_per_hour=user_data.requests_per_hour
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Store the plain token temporarily for return
        user.plain_token = api_token
        
        return user

    async def update_user(self, user_id: int, user_data: UserUpdate) -> User:
        """Update user information"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Update fields
        for field, value in user_data.dict(exclude_unset=True).items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        return user

    async def block_user(self, user_id: int, reason: str) -> Dict[str, Any]:
        """Block a user"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        user.is_blocked = True
        user.blocked_reason = reason
        user.blocked_at = datetime.utcnow()
        
        self.db.commit()
        
        return {
            "user_id": user_id,
            "blocked": True,
            "reason": reason,
            "blocked_at": user.blocked_at.isoformat()
        }

    async def unblock_user(self, user_id: int) -> Dict[str, Any]:
        """Unblock a user"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        user.is_blocked = False
        user.blocked_reason = None
        user.blocked_at = None
        user.deviation_score = 0.0  # Reset score when unblocking
        
        self.db.commit()
        
        return {
            "user_id": user_id,
            "blocked": False,
            "unblocked_at": datetime.utcnow().isoformat()
        }

    async def create_task(self, task_data: TaskCreate, created_by: int) -> Task:
        """Create a new task"""
        
        task = Task(
            name=task_data.name,
            description=task_data.description,
            allowed_intents=task_data.allowed_intents,
            task_scope=task_data.task_scope,
            created_by=created_by
        )
        
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        
        return task

    async def assign_task_to_user(self, user_id: int, task_id: int, assigned_by: int) -> UserTask:
        """Assign a task to a user"""
        
        # Check if assignment already exists
        existing = self.db.query(UserTask).filter(
            UserTask.user_id == user_id,
            UserTask.task_id == task_id
        ).first()
        
        if existing:
            if not existing.is_active:
                existing.is_active = True
                existing.assigned_at = datetime.utcnow()
                existing.assigned_by = assigned_by
                self.db.commit()
                return existing
            else:
                raise ValueError("User is already assigned to this task")
        
        # Create new assignment
        user_task = UserTask(
            user_id=user_id,
            task_id=task_id,
            assigned_by=assigned_by
        )
        
        self.db.add(user_task)
        self.db.commit()
        self.db.refresh(user_task)
        
        return user_task

    async def get_usage_analytics(self, days: int = 7) -> Dict[str, Any]:
        """Get system usage analytics"""
        
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Total requests
        total_requests = self.db.query(Log).filter(Log.timestamp >= since_date).count()
        
        # Unique active users
        active_users = self.db.query(Log.user_id).filter(
            Log.timestamp >= since_date
        ).distinct().count()
        
        # Total tokens used
        total_tokens = self.db.query(Log).filter(
            Log.timestamp >= since_date
        ).with_entities(Log.openai_tokens_used).all()
        total_tokens = sum([t[0] for t in total_tokens if t[0] is not None])
        
        # Intent distribution
        intent_data = self.db.query(Log.intent_classification, Log.id).filter(
            Log.timestamp >= since_date
        ).all()
        
        intent_distribution = {}
        for intent, _ in intent_data:
            intent = intent or "unknown"
            intent_distribution[intent] = intent_distribution.get(intent, 0) + 1
        
        # Error rate
        error_count = self.db.query(Log).filter(
            Log.timestamp >= since_date,
            Log.status == "error"
        ).count()
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "analysis_period_days": days,
            "total_requests": total_requests,
            "active_users": active_users,
            "total_tokens_used": total_tokens,
            "avg_requests_per_day": round(total_requests / days, 2),
            "avg_tokens_per_request": round(total_tokens / total_requests, 2) if total_requests > 0 else 0,
            "intent_distribution": intent_distribution,
            "error_rate_percent": round(error_rate, 2)
        }

    async def get_user_analytics(self) -> Dict[str, Any]:
        """Get user analytics"""
        
        # Total users
        total_users = self.db.query(User).count()
        active_users = self.db.query(User).filter(User.is_active == True).count()
        blocked_users = self.db.query(User).filter(User.is_blocked == True).count()
        
        # Users by deviation score ranges
        high_risk_users = self.db.query(User).filter(User.deviation_score >= 1.5).count()
        medium_risk_users = self.db.query(User).filter(
            User.deviation_score >= 0.5,
            User.deviation_score < 1.5
        ).count()
        low_risk_users = self.db.query(User).filter(User.deviation_score < 0.5).count()
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "blocked_users": blocked_users,
            "user_risk_distribution": {
                "high_risk": high_risk_users,
                "medium_risk": medium_risk_users,
                "low_risk": low_risk_users
            }
        }