from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey, UniqueConstraint, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class UserTask(Base):
    __tablename__ = "user_tasks"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    
    # Assignment details
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)
    assigned_by = Column(Integer, ForeignKey("users.id"))
    
    # Progress tracking
    progress_notes = Column(Text)
    completed_at = Column(DateTime(timezone=True))
    
    # No task-specific limits needed - use task.token_limit
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'task_id', name='unique_user_task'),
    )
    
    # Relationships
    user = relationship("User", back_populates="user_tasks", foreign_keys=[user_id])
    task = relationship("Task", back_populates="user_tasks")
    assigner = relationship("User", foreign_keys=[assigned_by])
    
    def __repr__(self):
        return f"<UserTask(user_id={self.user_id}, task_id={self.task_id}, is_active={self.is_active})>"