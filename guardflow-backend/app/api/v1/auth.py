from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.response import Token
from app.core.config import settings
from app.api.deps import get_current_user_from_jwt, get_current_user_with_tenant

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")


@router.post("/login", response_model=Token)
async def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """Login endpoint for both admin and regular users"""
    # Get user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user has a password set
    if not user.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No password set for this user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password using bcrypt
    if not verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create access token
    access_token = create_access_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "name": user.name,
            "email": user.email
        }
    }


@router.get("/me")
async def get_current_user(current_user: User = Depends(get_current_user_with_tenant)):
    """Get current user information with role data"""
    return {
        "name": current_user.name,
        "email": current_user.email,
        "id": current_user.id,
        "is_active": current_user.is_active,
        "is_blocked": current_user.is_blocked,
        "tenant_id": current_user.tenant_id,
        "role_id": current_user.role_id,
        "role": {
            "id": current_user.role.id,
            "name": current_user.role.name,
            "description": current_user.role.description,
            "permissions": current_user.role.permissions
        } if current_user.role else None
    }