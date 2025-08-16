from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_tenant_admin_user, get_tenant_from_user
from app.models import User, Tenant, Role, UserInvitation
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("/users", response_model=List[UserResponse])
def list_tenant_users(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """List all users in the tenant"""
    
    query = db.query(User).filter(User.tenant_id == tenant.id)
    
    if not include_inactive:
        query = query.filter(User.is_active == True)
    
    users = query.all()
    return users


@router.delete("/users/{user_id}")
def remove_user(
    user_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Remove a user from the tenant"""
    
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself"
        )
    
    # Check if user is super_admin
    if user.role and user.role.name == 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove super admin user"
        )
    
    # Soft delete - just deactivate the user
    user.is_active = False
    db.commit()
    
    return {"message": f"User {user.email} has been removed from the organization"}


@router.put("/users/{user_id}/role")
def change_user_role(
    user_id: int,
    role_id: str,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Change a user's role"""
    
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify role exists and is valid
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified"
        )
    
    if role.name == 'super_admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign super_admin role"
        )
    
    # Prevent changing own role to non-admin
    if user.id == current_user.id and role.name != 'admin':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove admin role from yourself"
        )
    
    user.role_id = role_id
    db.commit()
    
    return {
        "message": f"User {user.email} role changed to {role.name}",
        "user_id": user.id,
        "new_role": role.name
    }


@router.post("/users/{user_id}/reactivate")
def reactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Reactivate a deactivated user"""
    
    user = db.query(User).filter(
        User.id == user_id,
        User.tenant_id == tenant.id,
        User.is_active == False
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inactive user not found"
        )
    
    # Check user limits
    if not tenant.can_invite_users():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot reactivate user: user limit reached"
        )
    
    user.is_active = True
    db.commit()
    
    return {"message": f"User {user.email} has been reactivated"}


@router.get("/users/summary")
def get_user_summary(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Get summary of users and invitations"""
    
    # Count active users by role
    active_users = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.is_active == True
    ).all()
    
    inactive_users = db.query(User).filter(
        User.tenant_id == tenant.id,
        User.is_active == False
    ).count()
    
    # Count pending invitations
    pending_invitations = db.query(UserInvitation).filter(
        UserInvitation.tenant_id == tenant.id,
        UserInvitation.status == 'pending'
    ).count()
    
    # Group users by role
    role_counts = {}
    for user in active_users:
        role_name = user.role.name if user.role else 'unassigned'
        role_counts[role_name] = role_counts.get(role_name, 0) + 1
    
    user_limit_info = tenant.get_user_limit_info()
    
    return {
        "active_users": len(active_users),
        "inactive_users": inactive_users,
        "pending_invitations": pending_invitations,
        "role_breakdown": role_counts,
        "user_limits": user_limit_info,
        "can_invite_more": tenant.can_invite_users(),
        "plan_name": tenant.plan.name if tenant.plan else None,
        "subscription_status": tenant.subscription_status,
        "trial_active": tenant.is_trial_active()
    }