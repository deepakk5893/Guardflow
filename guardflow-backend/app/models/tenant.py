from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Tenant(Base):
    __tablename__ = "tenants"
    
    # Primary key
    id = Column(String(36), primary_key=True, server_default=text("gen_random_uuid()::text"))
    
    # Basic info
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    status = Column(String(20), default='trial')  # trial, active, suspended
    
    # Billing and plan info
    plan_id = Column(String(36), ForeignKey("plans.id"))
    billing_email = Column(String(255))
    contact_name = Column(String(255))
    
    # Trial info
    trial_expires_at = Column(DateTime(timezone=True))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    plan = relationship("Plan", back_populates="tenants")
    users = relationship("User", back_populates="tenant")
    tasks = relationship("Task", back_populates="tenant")
    logs = relationship("Log", back_populates="tenant")
    chats = relationship("Chat", back_populates="tenant")
    alerts = relationship("Alert", back_populates="tenant")
    llm_providers = relationship("LLMProvider", back_populates="tenant", cascade="all, delete-orphan")
    invitations = relationship("UserInvitation", back_populates="tenant", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="tenant", cascade="all, delete-orphan")
    
    def is_trial_active(self) -> bool:
        """Check if trial period is still active"""
        if not self.trial_expires_at:
            return False
        return datetime.utcnow() < self.trial_expires_at
    
    def is_subscription_active(self) -> bool:
        """Check if tenant has active subscription"""
        return self.status in ['trial', 'active']
    
    def can_invite_users(self) -> bool:
        """Check if tenant can invite more users based on plan limits"""
        if not self.plan or not self.plan.max_users:
            return True  # No limit
        
        current_user_count = len([u for u in self.users if u.is_active])
        pending_invitations = len([i for i in self.invitations if i.status == 'pending'])
        
        return (current_user_count + pending_invitations) < self.plan.max_users
    
    def get_user_limit_info(self) -> dict:
        """Get user limit information for the tenant"""
        if not self.plan:
            return {"current": 0, "limit": None, "pending": 0, "available": None}
        
        current_users = len([u for u in self.users if u.is_active])
        pending_invitations = len([i for i in self.invitations if i.status == 'pending'])
        limit = self.plan.max_users
        available = max(0, limit - current_users - pending_invitations) if limit else None
        
        return {
            "current": current_users,
            "pending": pending_invitations,
            "limit": limit,
            "available": available
        }
    
    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}', status='{self.status}')>"