from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_super_admin_user
from app.models import Tenant, Plan, Role, User, Task, LLMProvider
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse, TenantWithStats
from app.schemas.plan import PlanCreate, PlanUpdate, PlanResponse
from app.schemas.role import RoleResponse

router = APIRouter()

# Tenant Management

@router.get("/tenants", response_model=List[TenantWithStats])
def list_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """List all tenants with statistics"""
    tenants = db.query(Tenant).all()
    
    tenant_stats = []
    for tenant in tenants:
        # Calculate statistics
        user_count = db.query(User).filter(User.tenant_id == tenant.id).count()
        task_count = db.query(Task).filter(Task.tenant_id == tenant.id).count()
        provider_count = db.query(LLMProvider).filter(LLMProvider.tenant_id == tenant.id).count()
        
        # Calculate monthly token usage (placeholder - you'd implement proper aggregation)
        monthly_usage = 0  # TODO: Implement from logs table
        
        tenant_data = TenantWithStats(
            **tenant.__dict__,
            user_count=user_count,
            task_count=task_count,
            monthly_token_usage=monthly_usage,
            provider_count=provider_count
        )
        tenant_stats.append(tenant_data)
    
    return tenant_stats


@router.post("/tenants", response_model=TenantResponse)
def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Create a new tenant"""
    # Check if slug is unique
    existing = db.query(Tenant).filter(Tenant.slug == tenant_data.slug).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Tenant slug already exists"
        )
    
    tenant = Tenant(**tenant_data.dict())
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    
    return tenant


@router.get("/tenants/{tenant_id}", response_model=TenantWithStats)
def get_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Get specific tenant with statistics"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Calculate statistics
    user_count = db.query(User).filter(User.tenant_id == tenant.id).count()
    task_count = db.query(Task).filter(Task.tenant_id == tenant.id).count()
    provider_count = db.query(LLMProvider).filter(LLMProvider.tenant_id == tenant.id).count()
    monthly_usage = 0  # TODO: Implement from logs table
    
    return TenantWithStats(
        **tenant.__dict__,
        user_count=user_count,
        task_count=task_count,
        monthly_token_usage=monthly_usage,
        provider_count=provider_count
    )


@router.put("/tenants/{tenant_id}", response_model=TenantResponse)
def update_tenant(
    tenant_id: str,
    tenant_data: TenantUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Update tenant"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update_data = tenant_data.dict(exclude_unset=True)
    
    # Check slug uniqueness if being updated
    if "slug" in update_data:
        existing = db.query(Tenant).filter(
            Tenant.slug == update_data["slug"],
            Tenant.id != tenant_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail="Tenant slug already exists"
            )
    
    for field, value in update_data.items():
        setattr(tenant, field, value)
    
    db.commit()
    db.refresh(tenant)
    
    return tenant


@router.delete("/tenants/{tenant_id}")
def delete_tenant(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Delete tenant and all associated data"""
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Check if tenant has users
    user_count = db.query(User).filter(User.tenant_id == tenant.id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete tenant: {user_count} users exist. Delete users first."
        )
    
    db.delete(tenant)
    db.commit()
    
    return {"message": "Tenant deleted successfully"}


# Plan Management

@router.get("/plans", response_model=List[PlanResponse])
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """List all subscription plans"""
    plans = db.query(Plan).all()
    return plans


@router.post("/plans", response_model=PlanResponse)
def create_plan(
    plan_data: PlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Create a new subscription plan"""
    plan = Plan(**plan_data.dict())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    
    return plan


@router.put("/plans/{plan_id}", response_model=PlanResponse)
def update_plan(
    plan_id: str,
    plan_data: PlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Update subscription plan"""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    update_data = plan_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(plan, field, value)
    
    db.commit()
    db.refresh(plan)
    
    return plan


@router.delete("/plans/{plan_id}")
def delete_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Delete subscription plan"""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check if any tenants are using this plan
    tenant_count = db.query(Tenant).filter(Tenant.plan_id == plan.id).count()
    if tenant_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete plan: {tenant_count} tenants are using it"
        )
    
    db.delete(plan)
    db.commit()
    
    return {"message": "Plan deleted successfully"}


# Role Management

@router.get("/roles", response_model=List[RoleResponse])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """List all roles"""
    roles = db.query(Role).all()
    return roles


# Analytics

@router.get("/analytics/overview")
def get_platform_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Get platform-wide analytics"""
    total_tenants = db.query(Tenant).count()
    active_tenants = db.query(Tenant).filter(Tenant.status == 'active').count()
    total_users = db.query(User).count()
    
    # TODO: Add more analytics like token usage, revenue, etc.
    
    return {
        "total_tenants": total_tenants,
        "active_tenants": active_tenants,
        "total_users": total_users,
        "trial_tenants": db.query(Tenant).filter(Tenant.status == 'trial').count(),
        "suspended_tenants": db.query(Tenant).filter(Tenant.status == 'suspended').count()
    }