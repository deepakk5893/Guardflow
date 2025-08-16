from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class AlertType(str, enum.Enum):
    LARGE_REQUEST = "large_request"
    MULTIPLE_LARGE_REQUESTS = "multiple_large_requests"
    RAPID_USAGE = "rapid_usage"
    SUSPICIOUS_CONTENT = "suspicious_content"
    QUOTA_ABUSE = "quota_abuse"


class AlertStatus(str, enum.Enum):
    ACTIVE = "active"
    REVIEWED = "reviewed"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class Alert(Base):
    __tablename__ = "alerts"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Multi-tenant field
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=True)  # Nullable for migration
    
    # Alert details
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=True)
    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    
    # Alert content
    title = Column(String(255), nullable=False)
    description = Column(Text)
    alert_metadata = Column(Text)  # JSON string with additional context
    
    # Status tracking
    status = Column(Enum(AlertStatus), default=AlertStatus.ACTIVE, index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="alerts")
    user = relationship("User", foreign_keys=[user_id], back_populates="alerts")
    task = relationship("Task", back_populates="alerts")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    
    def __repr__(self):
        return f"<Alert(id={self.id}, type='{self.alert_type}', user_id={self.user_id}, status='{self.status}')>"