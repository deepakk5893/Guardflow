#!/usr/bin/env python3
"""
Script to create admin user in the database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models.user import User
from app.core.security import generate_api_token, hash_api_token
from app.core.config import settings

# Create session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_admin_user():
    db = SessionLocal()
    try:
        # Check if admin user already exists
        existing_admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if existing_admin:
            print(f"Admin user {settings.ADMIN_EMAIL} already exists!")
            print(f"User ID: {existing_admin.id}")
            print(f"API Token: {existing_admin.token_hash}")
            return
        
        # Generate API token for admin
        api_token = generate_api_token()
        token_hash = hash_api_token(api_token)
        
        # Create admin user
        admin_user = User(
            email=settings.ADMIN_EMAIL,
            name="Admin User",
            token_hash=token_hash,
            daily_quota=50000,  # Higher quota for admin
            monthly_quota=1000000,  # Higher quota for admin
            requests_per_hour=500,  # Higher rate limit for admin
            is_active=True,
            is_blocked=False
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("✅ Admin user created successfully!")
        print(f"Email: {admin_user.email}")
        print(f"User ID: {admin_user.id}")
        print(f"API Token: {api_token}")
        print(f"Token Hash (stored): {token_hash}")
        print("\n📝 Admin login credentials:")
        print(f"Email: {settings.ADMIN_EMAIL}")
        print(f"Password: {settings.ADMIN_PASSWORD}")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()