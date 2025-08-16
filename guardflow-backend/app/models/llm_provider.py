from sqlalchemy import Column, String, Text, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class LLMProvider(Base):
    __tablename__ = "llm_providers"
    
    # Primary key
    id = Column(String(36), primary_key=True, server_default=text("gen_random_uuid()::text"))
    
    # Tenant association
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # Provider details
    provider_name = Column(String(50), nullable=False)  # 'openai', 'anthropic', 'azure_openai'
    provider_instance_name = Column(String(100), nullable=False)  # 'My OpenAI Key', 'Team API Key'
    
    # API configuration
    api_key_encrypted = Column(Text, nullable=False)
    api_endpoint = Column(String(255))  # For Azure/custom endpoints
    
    # Model configuration
    available_models = Column(JSON, default=list)  # Auto-detected: ["gpt-4", "gpt-3.5-turbo"]
    enabled_models = Column(JSON, default=list)    # What tenant wants to use
    
    # Status and settings
    is_default = Column(Boolean, default=False)    # Default key for this provider
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="llm_providers")
    tasks = relationship("Task", back_populates="llm_provider")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint('tenant_id', 'provider_name', 'provider_instance_name', 
                        name='uq_tenant_provider_instance'),
    )
    
    def __repr__(self):
        return f"<LLMProvider(id={self.id}, provider='{self.provider_name}', instance='{self.provider_instance_name}')>"
    
    def get_model_options(self):
        """Get formatted model options for dropdowns"""
        options = []
        for model in self.enabled_models or []:
            options.append({
                "value": f"{self.id}:{model}",
                "label": f"{model.upper()} ({self.provider_instance_name})"
            })
        return options