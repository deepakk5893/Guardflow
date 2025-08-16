from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets

from app.api.deps import get_db, get_tenant_admin_user, get_tenant_from_user
from app.models import UserInvitation, User, Tenant, Role
from app.schemas.user_invitation import (
    UserInvitationCreate,
    UserInvitationResponse,
    UserInvitationList,
    InvitationAcceptance,
    InvitationDetails,
    InvitationStats
)
from app.core.security import get_password_hash
from app.services.email_service import email_service

router = APIRouter()


@router.post("", response_model=UserInvitationResponse)
def create_invitation(
    invitation_data: UserInvitationCreate,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Create a new user invitation"""
    
    # Check if tenant can invite more users
    if not tenant.can_invite_users():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User limit reached. Current plan allows {tenant.plan.max_users if tenant.plan else 'unlimited'} users."
        )
    
    # Check if user is already invited or exists
    existing_user = db.query(User).filter(
        User.email == invitation_data.email,
        User.tenant_id == tenant.id
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists in your organization"
        )
    
    existing_invitation = db.query(UserInvitation).filter(
        UserInvitation.email == invitation_data.email,
        UserInvitation.tenant_id == tenant.id,
        UserInvitation.status == 'pending'
    ).first()
    
    if existing_invitation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already has a pending invitation"
        )
    
    # Convert role name to role_id and validate
    valid_roles = {'user', 'admin'}
    if invitation_data.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    role = db.query(Role).filter(Role.name == invitation_data.role).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role not found in system"
        )
    
    # Create invitation
    invitation = UserInvitation(
        tenant_id=tenant.id,
        email=invitation_data.email,
        role_id=role.id,  # Use the resolved role_id
        invited_by=current_user.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    
    # Send invitation email
    email_sent = email_service.send_invitation_email(
        recipient_email=invitation.email,
        company_name=tenant.name,
        inviter_name=current_user.name,
        role_name=role.name,
        invitation_token=invitation.invitation_token,
        expires_in_days=7
    )
    
    # Prepare response with additional data
    response_data = UserInvitationResponse.from_orm(invitation)
    response_data.inviter_name = current_user.name
    response_data.role_name = role.name
    
    return response_data


@router.get("", response_model=UserInvitationList)
def list_invitations(
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """List all invitations for the tenant"""
    
    query = db.query(UserInvitation).filter(UserInvitation.tenant_id == tenant.id)
    
    if status_filter:
        query = query.filter(UserInvitation.status == status_filter)
    
    total = query.count()
    invitations = query.offset(skip).limit(limit).all()
    
    # Get counts for different statuses
    pending_count = db.query(UserInvitation).filter(
        UserInvitation.tenant_id == tenant.id,
        UserInvitation.status == 'pending'
    ).count()
    
    expired_count = db.query(UserInvitation).filter(
        UserInvitation.tenant_id == tenant.id,
        UserInvitation.status == 'pending',
        UserInvitation.expires_at < datetime.utcnow()
    ).count()
    
    # Enrich invitation data
    enriched_invitations = []
    for invitation in invitations:
        inv_data = UserInvitationResponse.from_orm(invitation)
        inv_data.inviter_name = invitation.inviter.name if invitation.inviter else None
        inv_data.role_name = invitation.role.name if invitation.role else None
        enriched_invitations.append(inv_data)
    
    return UserInvitationList(
        invitations=enriched_invitations,
        total=total,
        pending_count=pending_count,
        expired_count=expired_count
    )


@router.delete("/{invitation_id}")
def cancel_invitation(
    invitation_id: str,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Cancel a pending invitation"""
    
    invitation = db.query(UserInvitation).filter(
        UserInvitation.id == invitation_id,
        UserInvitation.tenant_id == tenant.id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending invitations"
        )
    
    invitation.status = 'cancelled'
    db.commit()
    
    return {"message": "Invitation cancelled successfully"}


@router.post("/{invitation_id}/resend", response_model=UserInvitationResponse)
def resend_invitation(
    invitation_id: str,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Resend a pending invitation with new expiration"""
    
    invitation = db.query(UserInvitation).filter(
        UserInvitation.id == invitation_id,
        UserInvitation.tenant_id == tenant.id
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if invitation.status != 'pending':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only resend pending invitations"
        )
    
    # Generate new token and extend expiration
    invitation.invitation_token = secrets.token_urlsafe(32)
    invitation.expires_at = datetime.utcnow() + timedelta(days=7)
    
    db.commit()
    db.refresh(invitation)
    
    # Resend invitation email
    email_sent = email_service.send_invitation_email(
        recipient_email=invitation.email,
        company_name=tenant.name,
        inviter_name=current_user.name,
        role_name=invitation.role.name if invitation.role else "User",
        invitation_token=invitation.invitation_token,
        expires_in_days=7
    )
    
    response_data = UserInvitationResponse.from_orm(invitation)
    response_data.inviter_name = current_user.name
    response_data.role_name = invitation.role.name if invitation.role else None
    
    return response_data


@router.get("/stats", response_model=InvitationStats)
def get_invitation_stats(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_tenant_from_user),
    current_user: User = Depends(get_tenant_admin_user)
):
    """Get invitation statistics for the tenant"""
    
    all_invitations = db.query(UserInvitation).filter(
        UserInvitation.tenant_id == tenant.id
    ).all()
    
    stats = {
        'total_sent': len(all_invitations),
        'pending': len([i for i in all_invitations if i.status == 'pending']),
        'accepted': len([i for i in all_invitations if i.status == 'accepted']),
        'expired': len([i for i in all_invitations if i.status == 'pending' and i.is_expired()]),
        'cancelled': len([i for i in all_invitations if i.status == 'cancelled'])
    }
    
    return InvitationStats(**stats)


# Public endpoints for invitation acceptance

@router.get("/public/{token}/details", response_model=InvitationDetails)
def get_invitation_details(token: str, db: Session = Depends(get_db)):
    """Get public invitation details for validation (no auth required)"""
    
    invitation = db.query(UserInvitation).filter(
        UserInvitation.invitation_token == token
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    is_valid = invitation.can_be_accepted()
    
    return InvitationDetails(
        id=invitation.id,
        email=invitation.email,
        company_name=invitation.tenant.name,
        role_name=invitation.role.name if invitation.role else "User",
        inviter_name=invitation.inviter.name if invitation.inviter else "Admin",
        expires_at=invitation.expires_at,
        is_valid=is_valid
    )


@router.post("/public/{token}/accept")
def accept_invitation(
    token: str,
    acceptance_data: InvitationAcceptance,
    db: Session = Depends(get_db)
):
    """Accept an invitation and create user account (no auth required)"""
    
    invitation = db.query(UserInvitation).filter(
        UserInvitation.invitation_token == token
    ).first()
    
    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )
    
    if not invitation.can_be_accepted():
        status_msg = "expired" if invitation.is_expired() else invitation.status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation cannot be accepted. Status: {status_msg}"
        )
    
    # Check if user already exists (shouldn't happen but safety check)
    existing_user = db.query(User).filter(User.email == invitation.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account already exists"
        )
    
    # Create new user
    hashed_password = get_password_hash(acceptance_data.password)
    token_hash = f"user_token_{secrets.token_urlsafe(32)}"
    
    new_user = User(
        email=invitation.email,
        name=acceptance_data.name,
        password=hashed_password,
        token_hash=token_hash,
        tenant_id=invitation.tenant_id,
        role_id=invitation.role_id,
        is_active=True,
        daily_quota=10000,  # Default quotas
        monthly_quota=300000,
        requests_per_hour=100
    )
    
    db.add(new_user)
    
    # Mark invitation as accepted
    invitation.mark_as_accepted()
    
    db.commit()
    db.refresh(new_user)
    
    # Send welcome email
    email_service.send_welcome_email(
        recipient_email=new_user.email,
        user_name=new_user.name,
        company_name=invitation.tenant.name,
        role_name=invitation.role.name if invitation.role else "User"
    )
    
    return {
        "message": "Invitation accepted successfully",
        "user_id": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "company": invitation.tenant.name
    }