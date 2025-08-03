from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Basic info
    title = Column(String(255), nullable=False)  # Changed from 'name' to 'title'
    description = Column(Text)
    
    # Task categorization
    category = Column(String(50), default="other")
    difficulty_level = Column(String(20), default="beginner")
    
    # Task limits and quotas
    estimated_hours = Column(Float)
    token_limit = Column(Integer, default=10000)
    max_tokens_per_request = Column(Integer, default=1000)  # Prevent single expensive requests
    
    # Task configuration (keeping existing fields for compatibility)
    allowed_intents = Column(JSON, default=list)  # ["coding", "testing", "documentation"]
    task_scope = Column(Text)  # Description of allowed work
    
    # Metadata
    created_by = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="created_tasks")
    user_tasks = relationship("UserTask", back_populates="task")
    logs = relationship("Log", back_populates="task")
    alerts = relationship("Alert", back_populates="task")
    
    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', is_active={self.is_active})>"