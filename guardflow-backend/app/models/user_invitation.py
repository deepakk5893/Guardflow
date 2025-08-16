from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta, timezone
import secrets

from app.database import Base


class UserInvitation(Base):
    __tablename__ = "user_invitations"
    
    # Primary key
    id = Column(String(36), primary_key=True, server_default=text("gen_random_uuid()::text"))
    
    # Foreign keys
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Invitation details
    email = Column(String(255), nullable=False)
    invitation_token = Column(String(255), unique=True, nullable=False)
    status = Column(String(20), default='pending')  # pending, accepted, expired, cancelled
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True))
    
    # Relationships
    tenant = relationship("Tenant", back_populates="invitations")
    role = relationship("Role")
    inviter = relationship("User", foreign_keys=[invited_by])
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.invitation_token:
            self.invitation_token = secrets.token_urlsafe(32)
        if not self.expires_at:
            self.expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    def is_expired(self) -> bool:
        """Check if invitation has expired"""
        return datetime.now(timezone.utc) > self.expires_at
    
    def can_be_accepted(self) -> bool:
        """Check if invitation can still be accepted"""
        return self.status == 'pending' and not self.is_expired()
    
    def mark_as_accepted(self):
        """Mark invitation as accepted"""
        self.status = 'accepted'
        self.accepted_at = datetime.now(timezone.utc)
    
    def __repr__(self):
        return f"<UserInvitation(id={self.id}, email='{self.email}', status='{self.status}')>"