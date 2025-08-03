from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import verify_password, create_access_token
from app.models.user import User
from app.schemas.response import Token
from app.core.config import settings
from app.api.deps import get_current_user_from_jwt

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
    
    # For admin login, check against admin credentials
    if user.email == settings.ADMIN_EMAIL:
        # Simple password check for admin (plain text comparison for now)
        if form_data.password != settings.ADMIN_PASSWORD:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        # For regular users, verify their password from the database
        if not user.password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No password set for this user",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # For now, compare plain text passwords (should be hashed in production)
        if form_data.password != user.password:
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
async def get_current_user(current_user: User = Depends(get_current_user_from_jwt)):
    """Get current user information"""
    return {
        "name": current_user.name,
        "email": current_user.email,
        "id": current_user.id,
        "is_active": current_user.is_active,
        "is_blocked": current_user.is_blocked
    }