from sqlalchemy import Column, String, Integer, BigInteger, DECIMAL, Boolean, DateTime, JSON, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Plan(Base):
    __tablename__ = "plans"
    
    # Primary key
    id = Column(String(36), primary_key=True, server_default=text("gen_random_uuid()::text"))
    
    # Plan details
    name = Column(String(100), nullable=False)  # Basic, Pro, Enterprise
    max_users = Column(Integer)
    max_tokens_per_month = Column(BigInteger)
    price_per_month = Column(DECIMAL(10, 2))
    
    # Features and configuration
    features = Column(JSON, default=list)  # ["api_proxy", "intent_classification", "analytics"]
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    tenants = relationship("Tenant", back_populates="plan")
    
    def __repr__(self):
        return f"<Plan(id={self.id}, name='{self.name}', price=${self.price_per_month})>"