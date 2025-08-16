from sqlalchemy import Column, Integer, String, Text, DECIMAL, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import INET

from app.database import Base


class Log(Base):
    __tablename__ = "logs"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Multi-tenant field
    tenant_id = Column(String(36), ForeignKey("tenants.id"), nullable=True)  # Nullable for migration
    
    # Request context
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True)
    
    # Request data
    prompt = Column(Text, nullable=False)
    system_message = Column(Text)
    model = Column(String(50), default="gpt-3.5-turbo")
    
    # Response data
    response = Column(Text)
    intent_classification = Column(String(100), index=True)
    confidence_score = Column(DECIMAL(3, 2))
    
    # Scoring
    deviation_score_delta = Column(DECIMAL(5, 2), default=0.0)
    user_score_before = Column(DECIMAL(5, 2))
    user_score_after = Column(DECIMAL(5, 2))
    
    # Usage metrics
    openai_tokens_used = Column(Integer)
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    response_time_ms = Column(Integer)
    
    # Request metadata
    ip_address = Column(INET)
    user_agent = Column(Text)
    request_id = Column(String(50))
    
    # Status
    status = Column(String(20), default="success", index=True)  # success, blocked, error
    error_message = Column(Text)
    
    # Timestamps
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    tenant = relationship("Tenant", back_populates="logs")
    user = relationship("User", back_populates="logs")
    task = relationship("Task", back_populates="logs")
    
    def __repr__(self):
        return f"<Log(id={self.id}, user_id={self.user_id}, status='{self.status}', timestamp={self.timestamp})>"