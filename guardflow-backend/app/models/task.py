from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Task(Base):
    __tablename__ = "tasks"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Multi-tenant fields
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=True)  # Nullable for migration
    llm_provider_id = Column(String(36), ForeignKey("llm_providers.id"), nullable=True)  # Nullable for migration
    
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
    is_dummy_task = Column(Boolean, default=False, index=True)  # For API access tasks
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="tasks")
    llm_provider = relationship("LLMProvider", back_populates="tasks")
    creator = relationship("User", back_populates="created_tasks")
    user_tasks = relationship("UserTask", back_populates="task")
    logs = relationship("Log", back_populates="task")
    alerts = relationship("Alert", back_populates="task")
    
    @classmethod
    def create_dummy_task(cls, user_id: int, tenant_id: str, user_name: str):
        """Create a dummy task for API access"""
        return cls(
            title=f"API Access - {user_name}",
            description="General API access without specific work restrictions",
            category="api_access",
            is_dummy_task=True,
            created_by=user_id,
            tenant_id=tenant_id,
            allowed_intents=[],  # No intent restrictions
            token_limit=0,  # Will be set dynamically from user quota
            max_tokens_per_request=4000,  # Reasonable per-request limit
            is_active=True
        )
    
    def is_api_access_task(self) -> bool:
        """Check if this is a dummy task for API access"""
        return self.is_dummy_task or self.category == "api_access"
    
    def requires_intent_classification(self) -> bool:
        """Check if this task requires intent classification"""
        return not self.is_dummy_task and bool(self.allowed_intents)
    
    def requires_deviation_scoring(self) -> bool:
        """Check if this task requires deviation scoring"""
        return not self.is_dummy_task
    
    def get_effective_token_limit(self, user_quota: int) -> int:
        """Get the effective token limit for this task"""
        if self.is_dummy_task:
            # For dummy tasks, use user's quota
            return user_quota
        return self.token_limit
    
    def __repr__(self):
        task_type = "Dummy" if self.is_dummy_task else "Regular"
        return f"<Task(id={self.id}, title='{self.title}', type='{task_type}', is_active={self.is_active})>"