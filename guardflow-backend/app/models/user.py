from sqlalchemy import Column, Integer, String, Boolean, DECIMAL, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic info
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password = Column(String(255), nullable=True)  # For dashboard login
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    
    # Quotas and limits
    daily_quota = Column(Integer, default=10000)
    monthly_quota = Column(Integer, default=300000)
    current_daily_usage = Column(Integer, default=0)
    current_monthly_usage = Column(Integer, default=0)
    
    # Rate limiting
    requests_per_hour = Column(Integer, default=100)
    
    # Behavior tracking
    deviation_score = Column(DECIMAL(5, 2), default=0.0)
    last_activity = Column(DateTime(timezone=True))
    
    # Status
    is_active = Column(Boolean, default=True)
    is_blocked = Column(Boolean, default=False)
    blocked_reason = Column(Text)
    blocked_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user_tasks = relationship("UserTask", back_populates="user", foreign_keys="[UserTask.user_id]")
    logs = relationship("Log", back_populates="user")
    created_tasks = relationship("Task", back_populates="creator")
    assigned_tasks = relationship("UserTask", back_populates="assigner", foreign_keys="[UserTask.assigned_by]")
    chats = relationship("Chat", back_populates="user")
    alerts = relationship("Alert", foreign_keys="[Alert.user_id]", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', is_active={self.is_active})>"