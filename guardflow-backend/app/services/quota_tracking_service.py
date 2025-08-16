from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone
import logging

from app.models import User, Task, UserTask

logger = logging.getLogger(__name__)


class QuotaTrackingService:
    """Service for handling quota tracking for both regular and dummy tasks"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def update_task_usage(
        self, 
        user: User, 
        task: Task, 
        tokens_used: int,
        user_task: Optional[UserTask] = None
    ) -> dict:
        """
        Update usage tracking for both regular and dummy tasks
        
        For dummy tasks: Updates user quotas directly
        For regular tasks: Updates both task usage and user quotas
        
        Returns updated quota info
        """
        try:
            if task.is_dummy_task:
                return self._update_dummy_task_usage(user, task, tokens_used)
            else:
                return self._update_regular_task_usage(user, task, tokens_used, user_task)
        except Exception as e:
            logger.error(f"Error updating task usage: {e}")
            raise
    
    def _update_dummy_task_usage(self, user: User, task: Task, tokens_used: int) -> dict:
        """Update usage for dummy tasks - only user quotas"""
        
        # Update user's daily and monthly usage
        user.current_daily_usage = (user.current_daily_usage or 0) + tokens_used
        user.current_monthly_usage = (user.current_monthly_usage or 0) + tokens_used
        
        # Update last activity
        user.last_activity = datetime.now(timezone.utc)
        
        self.db.commit()
        
        logger.info(f"Updated dummy task usage - User {user.id}, Task {task.id}, Tokens: {tokens_used}")
        
        return {
            "task_type": "dummy",
            "user_daily_usage": user.current_daily_usage,
            "user_monthly_usage": user.current_monthly_usage,
            "user_daily_quota": user.daily_quota,
            "user_monthly_quota": user.monthly_quota,
            "daily_remaining": max(0, (user.daily_quota or 0) - (user.current_daily_usage or 0)),
            "monthly_remaining": max(0, (user.monthly_quota or 0) - (user.current_monthly_usage or 0))
        }
    
    def _update_regular_task_usage(
        self, 
        user: User, 
        task: Task, 
        tokens_used: int, 
        user_task: Optional[UserTask]
    ) -> dict:
        """Update usage for regular tasks - both task and user quotas"""
        
        # Update user's daily and monthly usage
        user.current_daily_usage = (user.current_daily_usage or 0) + tokens_used
        user.current_monthly_usage = (user.current_monthly_usage or 0) + tokens_used
        user.last_activity = datetime.now(timezone.utc)
        
        # Update task-specific usage if user_task exists
        task_usage = 0
        if user_task:
            user_task.tokens_used = (user_task.tokens_used or 0) + tokens_used
            task_usage = user_task.tokens_used
        
        self.db.commit()
        
        logger.info(f"Updated regular task usage - User {user.id}, Task {task.id}, Tokens: {tokens_used}")
        
        return {
            "task_type": "regular",
            "task_usage": task_usage,
            "task_limit": task.token_limit,
            "task_remaining": max(0, (task.token_limit or 0) - task_usage),
            "user_daily_usage": user.current_daily_usage,
            "user_monthly_usage": user.current_monthly_usage,
            "user_daily_quota": user.daily_quota,
            "user_monthly_quota": user.monthly_quota,
            "daily_remaining": max(0, (user.daily_quota or 0) - (user.current_daily_usage or 0)),
            "monthly_remaining": max(0, (user.monthly_quota or 0) - (user.current_monthly_usage or 0))
        }
    
    def check_quotas_before_request(
        self, 
        user: User, 
        task: Task, 
        estimated_tokens: int,
        user_task: Optional[UserTask] = None
    ) -> dict:
        """
        Check if user/task has sufficient quota before making request
        
        Returns: {
            "allowed": bool,
            "reason": str,
            "quota_info": dict
        }
        """
        try:
            # Check user daily quota
            user_daily_usage = user.current_daily_usage or 0
            user_daily_quota = user.daily_quota or 0
            if user_daily_quota > 0 and (user_daily_usage + estimated_tokens) > user_daily_quota:
                return {
                    "allowed": False,
                    "reason": f"Daily quota exceeded. Used: {user_daily_usage}, Quota: {user_daily_quota}, Needed: {estimated_tokens}",
                    "quota_type": "daily"
                }
            
            # Check user monthly quota
            user_monthly_usage = user.current_monthly_usage or 0
            user_monthly_quota = user.monthly_quota or 0
            if user_monthly_quota > 0 and (user_monthly_usage + estimated_tokens) > user_monthly_quota:
                return {
                    "allowed": False,
                    "reason": f"Monthly quota exceeded. Used: {user_monthly_usage}, Quota: {user_monthly_quota}, Needed: {estimated_tokens}",
                    "quota_type": "monthly"
                }
            
            # For regular tasks, also check task-specific limits
            if not task.is_dummy_task and user_task and task.token_limit:
                task_usage = user_task.tokens_used or 0
                if (task_usage + estimated_tokens) > task.token_limit:
                    return {
                        "allowed": False,
                        "reason": f"Task quota exceeded. Used: {task_usage}, Limit: {task.token_limit}, Needed: {estimated_tokens}",
                        "quota_type": "task"
                    }
            
            return {
                "allowed": True,
                "reason": "Quota check passed",
                "quota_info": {
                    "user_daily_remaining": max(0, user_daily_quota - user_daily_usage),
                    "user_monthly_remaining": max(0, user_monthly_quota - user_monthly_usage),
                    "task_remaining": max(0, (task.token_limit or 0) - (user_task.tokens_used or 0)) if user_task and not task.is_dummy_task else None
                }
            }
            
        except Exception as e:
            logger.error(f"Error checking quotas: {e}")
            return {
                "allowed": False,
                "reason": f"Error checking quotas: {str(e)}",
                "quota_type": "error"
            }
    
    def get_quota_status(self, user: User, task: Task, user_task: Optional[UserTask] = None) -> dict:
        """Get current quota status for user and task"""
        
        user_daily_usage = user.current_daily_usage or 0
        user_monthly_usage = user.current_monthly_usage or 0
        user_daily_quota = user.daily_quota or 0
        user_monthly_quota = user.monthly_quota or 0
        
        status = {
            "user_quotas": {
                "daily": {
                    "used": user_daily_usage,
                    "quota": user_daily_quota,
                    "remaining": max(0, user_daily_quota - user_daily_usage),
                    "percentage_used": (user_daily_usage / user_daily_quota * 100) if user_daily_quota > 0 else 0
                },
                "monthly": {
                    "used": user_monthly_usage,
                    "quota": user_monthly_quota,
                    "remaining": max(0, user_monthly_quota - user_monthly_usage),
                    "percentage_used": (user_monthly_usage / user_monthly_quota * 100) if user_monthly_quota > 0 else 0
                }
            },
            "task_type": "dummy" if task.is_dummy_task else "regular"
        }
        
        # Add task-specific quota info for regular tasks
        if not task.is_dummy_task and user_task and task.token_limit:
            task_usage = user_task.tokens_used or 0
            status["task_quotas"] = {
                "used": task_usage,
                "limit": task.token_limit,
                "remaining": max(0, task.token_limit - task_usage),
                "percentage_used": (task_usage / task.token_limit * 100) if task.token_limit > 0 else 0
            }
        
        return status
    
    def reset_daily_usage(self, user: User) -> bool:
        """Reset daily usage for a user (called by daily cron job)"""
        try:
            user.current_daily_usage = 0
            self.db.commit()
            logger.info(f"Reset daily usage for user {user.id}")
            return True
        except Exception as e:
            logger.error(f"Error resetting daily usage for user {user.id}: {e}")
            return False
    
    def reset_monthly_usage(self, user: User) -> bool:
        """Reset monthly usage for a user (called by monthly cron job)"""
        try:
            user.current_monthly_usage = 0
            self.db.commit()
            logger.info(f"Reset monthly usage for user {user.id}")
            return True
        except Exception as e:
            logger.error(f"Error resetting monthly usage for user {user.id}: {e}")
            return False