from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import json

from app.models.alert import Alert, AlertType, AlertStatus
from app.models.user import User
from app.models.task import Task
from app.models.log import Log
from app.models.chat import Message, Chat


class AlertService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_alert(
        self,
        user_id: int,
        alert_type: AlertType,
        title: str,
        description: str,
        severity: str = "medium",
        task_id: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> Alert:
        """Create a new security alert"""
        
        alert = Alert(
            user_id=user_id,
            task_id=task_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            description=description,
            alert_metadata=json.dumps(metadata) if metadata else None,
            status=AlertStatus.ACTIVE
        )
        
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        
        # Auto-block user for critical alerts
        if severity == "critical":
            self._auto_block_user(user_id, f"Auto-blocked due to critical alert: {title}")
        
        return alert
    
    def check_suspicious_activity(self, user_id: int, request_tokens: int, task_id: int) -> None:
        """Check for suspicious patterns and create alerts"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return
        
        # Get recent activity (last hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        # Check 1: Unusually large single request
        avg_tokens = self._get_user_average_tokens(user_id)
        if request_tokens > max(avg_tokens * 10, 2000):  # 10x average or 2K minimum threshold
            self.create_alert(
                user_id=user_id,
                task_id=task_id,
                alert_type=AlertType.LARGE_REQUEST,
                title="Unusually Large Request",
                description=f"User requested {request_tokens} tokens, 10x their average of {avg_tokens:.0f}",
                severity="high",
                metadata={
                    "request_tokens": request_tokens,
                    "average_tokens": avg_tokens,
                    "ratio": request_tokens / max(avg_tokens, 1)
                }
            )
        
        # Check 2: Multiple large requests in short time
        recent_large_requests = self.db.query(Message).join(Chat).filter(
            Chat.user_id == user_id,
            Message.created_at >= one_hour_ago,
            Message.tokens_used > 1000
        ).count()
        
        if recent_large_requests >= 5:
            self.create_alert(
                user_id=user_id,
                task_id=task_id,
                alert_type=AlertType.MULTIPLE_LARGE_REQUESTS,
                title="Multiple Large Requests",
                description=f"User made {recent_large_requests} large requests (>1000 tokens) in the last hour",
                severity="high",
                metadata={
                    "large_requests_count": recent_large_requests,
                    "time_window": "1 hour"
                }
            )
        
        # Check 3: Rapid token consumption
        recent_total_tokens = self.db.query(Message).join(Chat).filter(
            Chat.user_id == user_id,
            Message.created_at >= one_hour_ago
        ).with_entities(Message.tokens_used).all()
        
        total_recent_tokens = sum(tokens[0] or 0 for tokens in recent_total_tokens)
        if total_recent_tokens > 5000:  # 5K tokens in 1 hour
            self.create_alert(
                user_id=user_id,
                task_id=task_id,
                alert_type=AlertType.RAPID_USAGE,
                title="Rapid Token Consumption",
                description=f"User consumed {total_recent_tokens} tokens in the last hour",
                severity="medium",
                metadata={
                    "tokens_consumed": total_recent_tokens,
                    "time_window": "1 hour",
                    "requests_count": len(recent_total_tokens)
                }
            )
    
    def _get_user_average_tokens(self, user_id: int) -> float:
        """Calculate user's average tokens per request over last 30 days"""
        
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        # Get tokens from both logs and chat messages
        log_tokens = self.db.query(Log.openai_tokens_used).filter(
            Log.user_id == user_id,
            Log.timestamp >= thirty_days_ago,
            Log.openai_tokens_used.isnot(None)
        ).all()
        
        chat_tokens = self.db.query(Message.tokens_used).join(Chat).filter(
            Chat.user_id == user_id,
            Message.created_at >= thirty_days_ago,
            Message.tokens_used.isnot(None)
        ).all()
        
        all_tokens = [t[0] for t in log_tokens if t[0]] + [t[0] for t in chat_tokens if t[0]]
        
        if not all_tokens:
            return 100  # Default for new users
        
        return sum(all_tokens) / len(all_tokens)
    
    def _auto_block_user(self, user_id: int, reason: str) -> None:
        """Automatically block a user for critical security violations"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and not user.is_blocked:
            user.is_blocked = True
            user.blocked_reason = reason
            self.db.commit()
    
    def get_active_alerts(self, limit: int = 50) -> List[Alert]:
        """Get all active alerts for admin review"""
        
        return self.db.query(Alert).filter(
            Alert.status == AlertStatus.ACTIVE
        ).order_by(Alert.created_at.desc()).limit(limit).all()
    
    def resolve_alert(self, alert_id: int, reviewed_by: int, resolution_notes: str) -> Alert:
        """Mark an alert as resolved"""
        
        alert = self.db.query(Alert).filter(Alert.id == alert_id).first()
        if not alert:
            raise ValueError("Alert not found")
        
        alert.status = AlertStatus.RESOLVED
        alert.reviewed_by = reviewed_by
        alert.reviewed_at = datetime.utcnow()
        alert.resolution_notes = resolution_notes
        
        self.db.commit()
        self.db.refresh(alert)
        
        return alert
    
    def get_user_alerts(self, user_id: int, limit: int = 20) -> List[Alert]:
        """Get alerts for a specific user"""
        
        return self.db.query(Alert).filter(
            Alert.user_id == user_id
        ).order_by(Alert.created_at.desc()).limit(limit).all()