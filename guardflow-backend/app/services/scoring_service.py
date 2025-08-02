from typing import Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from app.core.config import settings
from app.models.user import User
from app.models.task import Task
from app.models.log import Log

logger = logging.getLogger(__name__)


class ScoringService:
    def __init__(self, db: Session):
        self.db = db

    async def calculate_deviation_score(
        self,
        user: User,
        task: Task,
        intent_classification: str,
        confidence: float
    ) -> float:
        """Calculate deviation score for a user's request"""
        
        score_delta = 0.0
        
        # Check if intent is allowed for this task
        if task.allowed_intents and intent_classification not in task.allowed_intents:
            if intent_classification == "off_topic":
                score_delta += 1.0  # Major penalty for off-topic
            else:
                score_delta += 0.3  # Minor penalty for wrong category
        
        # Confidence-based scoring
        if confidence < 0.3:
            score_delta += 0.1  # Uncertain classification
        
        # Pattern analysis - check for sudden topic switches
        recent_logs = self.db.query(Log).filter(
            Log.user_id == user.id,
            Log.timestamp >= datetime.utcnow() - timedelta(hours=1)
        ).order_by(Log.timestamp.desc()).limit(5).all()
        
        if len(recent_logs) >= 3:
            # Check for topic switching
            recent_intents = [log.intent_classification for log in recent_logs]
            unique_intents = set(recent_intents)
            
            if len(unique_intents) >= 3:  # 3+ different topics in last hour
                score_delta += 0.5
        
        # Frequency analysis - check for rapid requests
        requests_last_10_min = self.db.query(Log).filter(
            Log.user_id == user.id,
            Log.timestamp >= datetime.utcnow() - timedelta(minutes=10)
        ).count()
        
        if requests_last_10_min > 20:  # More than 20 requests in 10 minutes
            score_delta += 0.2
        
        return score_delta

    async def check_and_block_user(self, user: User) -> None:
        """Check if user should be blocked based on deviation score"""
        
        if user.deviation_score >= settings.DEVIATION_THRESHOLD:
            if not user.is_blocked:
                user.is_blocked = True
                user.blocked_reason = f"Automatic block: deviation score {user.deviation_score} exceeded threshold {settings.DEVIATION_THRESHOLD}"
                user.blocked_at = datetime.utcnow()
                
                logger.warning(f"User {user.id} ({user.email}) automatically blocked due to high deviation score")
                
                self.db.commit()
        
        elif user.deviation_score >= settings.WARNING_THRESHOLD:
            # Log warning but don't block
            logger.info(f"User {user.id} ({user.email}) approaching deviation threshold: {user.deviation_score}")

    async def reset_user_score(self, user_id: int) -> Dict[str, Any]:
        """Reset a user's deviation score (admin function)"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        old_score = float(user.deviation_score)
        user.deviation_score = 0.0
        
        self.db.commit()
        
        logger.info(f"Reset deviation score for user {user_id} from {old_score} to 0.0")
        
        return {
            "user_id": user_id,
            "old_score": old_score,
            "new_score": 0.0,
            "reset_at": datetime.utcnow().isoformat()
        }

    async def get_user_behavior_analysis(self, user_id: int, days: int = 7) -> Dict[str, Any]:
        """Get detailed behavior analysis for a user"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        # Get logs from last N days
        since_date = datetime.utcnow() - timedelta(days=days)
        logs = self.db.query(Log).filter(
            Log.user_id == user_id,
            Log.timestamp >= since_date
        ).all()
        
        if not logs:
            return {
                "user_id": user_id,
                "analysis_period_days": days,
                "total_requests": 0,
                "message": "No activity in the analysis period"
            }
        
        # Analyze patterns
        intent_distribution = {}
        hourly_distribution = {}
        daily_tokens = {}
        
        for log in logs:
            # Intent distribution
            intent = log.intent_classification or "unknown"
            intent_distribution[intent] = intent_distribution.get(intent, 0) + 1
            
            # Hourly distribution
            hour = log.timestamp.hour
            hourly_distribution[hour] = hourly_distribution.get(hour, 0) + 1
            
            # Daily token usage
            date_str = log.timestamp.date().isoformat()
            tokens = log.openai_tokens_used or 0
            daily_tokens[date_str] = daily_tokens.get(date_str, 0) + tokens
        
        # Calculate metrics
        total_requests = len(logs)
        avg_requests_per_day = total_requests / days
        total_tokens = sum(daily_tokens.values())
        avg_tokens_per_request = total_tokens / total_requests if total_requests > 0 else 0
        
        # Risk indicators
        risk_indicators = []
        
        if user.deviation_score > settings.WARNING_THRESHOLD:
            risk_indicators.append(f"High deviation score: {user.deviation_score}")
        
        off_topic_ratio = intent_distribution.get("off_topic", 0) / total_requests
        if off_topic_ratio > 0.3:
            risk_indicators.append(f"High off-topic ratio: {off_topic_ratio:.2%}")
        
        max_daily_requests = max([hourly_distribution.get(h, 0) for h in range(24)])
        if max_daily_requests > 50:
            risk_indicators.append(f"High hourly request volume: {max_daily_requests}")
        
        return {
            "user_id": user_id,
            "analysis_period_days": days,
            "current_deviation_score": float(user.deviation_score),
            "total_requests": total_requests,
            "avg_requests_per_day": round(avg_requests_per_day, 2),
            "total_tokens_used": total_tokens,
            "avg_tokens_per_request": round(avg_tokens_per_request, 2),
            "intent_distribution": intent_distribution,
            "hourly_distribution": hourly_distribution,
            "daily_token_usage": daily_tokens,
            "risk_indicators": risk_indicators,
            "risk_level": "high" if len(risk_indicators) >= 2 else "medium" if len(risk_indicators) == 1 else "low"
        }