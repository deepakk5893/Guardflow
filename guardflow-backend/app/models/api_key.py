from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Integer, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta, timezone
import secrets
import string
from passlib.context import CryptContext

from app.database import Base

# Password context for hashing API keys
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class APIKey(Base):
    __tablename__ = "api_keys"
    
    # Primary key
    id = Column(String(36), primary_key=True, server_default=text("gen_random_uuid()::text"))
    
    # Foreign keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    
    # API key details
    name = Column(String(255), nullable=False)  # User-friendly name like "My App Key"
    key_hash = Column(String(255), nullable=False)  # Hashed API key
    scopes = Column(Text, nullable=False)  # JSON array as string: ["llm:call", "usage:read"]
    
    # Status and usage tracking
    is_active = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime(timezone=True))
    expires_at = Column(DateTime(timezone=True))  # Optional expiration
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    tenant = relationship("Tenant", back_populates="api_keys")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Generate API key if not provided
        if 'raw_key' not in kwargs and not self.key_hash:
            raw_key = self.generate_api_key()
            self.key_hash = self.hash_key(raw_key)
            self._raw_key = raw_key  # Store temporarily for return to user
    
    @staticmethod
    def generate_api_key(length: int = 32) -> str:
        """Generate a secure random API key"""
        # Use URL-safe base64 encoding for clean API keys
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def hash_key(raw_key: str) -> str:
        """Hash an API key using bcrypt"""
        return pwd_context.hash(raw_key)
    
    def verify_key(self, raw_key: str) -> bool:
        """Verify a raw API key against the stored hash"""
        return pwd_context.verify(raw_key, self.key_hash)
    
    def get_scopes(self) -> list:
        """Parse scopes from JSON string to list"""
        import json
        try:
            return json.loads(self.scopes) if self.scopes else []
        except json.JSONDecodeError:
            return []
    
    def set_scopes(self, scope_list: list):
        """Set scopes from list to JSON string"""
        import json
        self.scopes = json.dumps(scope_list)
    
    def has_scope(self, required_scope: str) -> bool:
        """Check if this API key has a specific scope"""
        return required_scope in self.get_scopes()
    
    def is_valid(self) -> bool:
        """Check if API key is valid (active and not expired)"""
        if not self.is_active:
            return False
        
        if self.expires_at and datetime.now(timezone.utc) > self.expires_at:
            return False
            
        return True
    
    def mark_as_used(self):
        """Update last_used_at timestamp"""
        self.last_used_at = datetime.now(timezone.utc)
    
    def get_raw_key(self) -> str:
        """Get the raw key (only available immediately after creation)"""
        return getattr(self, '_raw_key', None)
    
    @classmethod
    def create_admin_key_for_user(cls, user_id: int, tenant_id: str, admin_user_id: int, db_session):
        """
        Create a single API key for a user (admin-controlled MVP)
        
        Enforces one-key-per-user constraint and creates a simple key
        with default LLM access scope.
        """
        # Check if user already has an active key
        existing_key = db_session.query(cls).filter(
            cls.user_id == user_id,
            cls.is_active == True
        ).first()
        
        if existing_key:
            raise ValueError(f"User already has an active API key: {existing_key.name}")
        
        # Create new key with default settings
        api_key = cls(
            user_id=user_id,
            tenant_id=tenant_id,
            name="API Access Key",  # Simple default name
            scopes='["llm:call"]',  # Default LLM access scope
            is_active=True
        )
        
        # Store admin who created the key (for audit trail)
        api_key._created_by_admin = admin_user_id
        
        return api_key
    
    @classmethod
    def regenerate_user_key(cls, user_id: int, tenant_id: str, admin_user_id: int, db_session):
        """
        Regenerate API key for a user (revokes old, creates new)
        """
        # Revoke existing key
        existing_key = db_session.query(cls).filter(
            cls.user_id == user_id,
            cls.is_active == True
        ).first()
        
        if existing_key:
            existing_key.is_active = False
            db_session.flush()
        
        # Create new key
        return cls.create_admin_key_for_user(user_id, tenant_id, admin_user_id, db_session)
    
    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.name}', user_id={self.user_id}, active={self.is_active})>"