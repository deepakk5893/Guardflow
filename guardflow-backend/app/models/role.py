from sqlalchemy import Column, String, Text, DateTime, JSON, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Role(Base):
    __tablename__ = "roles"
    
    # Primary key
    id = Column(String(36), primary_key=True, server_default=text("gen_random_uuid()::text"))
    
    # Role details
    name = Column(String(50), unique=True, nullable=False)  # super_admin, admin, user
    description = Column(Text)
    permissions = Column(JSON, default=list)  # ["manage_tenants", "manage_users", etc.]
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    users = relationship("User", back_populates="role")
    
    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}')>"
    
    def has_permission(self, permission: str) -> bool:
        """Check if role has specific permission"""
        return permission in (self.permissions or [])