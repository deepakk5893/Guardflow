from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.api.deps import get_current_admin_user
from app.models.user import User
from app.models.alert import Alert, AlertStatus
from app.services.alert_service import AlertService

router = APIRouter()


@router.get("/")
async def get_alerts(
    status_filter: Optional[str] = None,
    limit: int = 50,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all alerts for admin review"""
    
    query = db.query(Alert)
    
    if status_filter:
        try:
            status_enum = AlertStatus(status_filter)
            query = query.filter(Alert.status == status_enum)
        except ValueError:
            raise HTTPException(400, f"Invalid status: {status_filter}")
    
    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()
    
    # Format response with user and task info
    result = []
    for alert in alerts:
        user = db.query(User).filter(User.id == alert.user_id).first()
        
        result.append({
            "id": alert.id,
            "user_id": alert.user_id,
            "user_email": user.email if user else "Unknown",
            "user_name": user.name if user else "Unknown",
            "task_id": alert.task_id,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "title": alert.title,
            "description": alert.description,
            "status": alert.status,
            "reviewed_by": alert.reviewed_by,
            "reviewed_at": alert.reviewed_at.isoformat() if alert.reviewed_at else None,
            "created_at": alert.created_at.isoformat(),
            "metadata": alert.alert_metadata
        })
    
    return result


@router.patch("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    resolution_data: dict,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Resolve an alert"""
    
    resolution_notes = resolution_data.get("resolution_notes", "")
    
    alert_service = AlertService(db)
    try:
        alert = alert_service.resolve_alert(alert_id, current_admin.id, resolution_notes)
        
        return {
            "id": alert.id,
            "status": alert.status,
            "resolved_by": current_admin.email,
            "resolved_at": alert.reviewed_at.isoformat(),
            "resolution_notes": alert.resolution_notes
        }
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/{alert_id}/block-user")
async def block_user_from_alert(
    alert_id: int,
    block_data: dict,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Block a user based on an alert"""
    
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    user = db.query(User).filter(User.id == alert.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    
    # Block the user
    block_reason = block_data.get("reason", f"Blocked due to security alert: {alert.title}")
    user.is_blocked = True
    user.blocked_reason = block_reason
    
    # Resolve the alert
    alert_service = AlertService(db)
    alert_service.resolve_alert(
        alert_id, 
        current_admin.id, 
        f"User blocked: {block_reason}"
    )
    
    db.commit()
    
    return {
        "message": f"User {user.email} has been blocked",
        "block_reason": block_reason,
        "alert_resolved": True
    }


@router.get("/user/{user_id}")
async def get_user_alerts(
    user_id: int,
    limit: int = 20,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get alerts for a specific user"""
    
    alert_service = AlertService(db)
    alerts = alert_service.get_user_alerts(user_id, limit)
    
    return [{
        "id": alert.id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "title": alert.title,
        "description": alert.description,
        "status": alert.status,
        "created_at": alert.created_at.isoformat(),
        "metadata": alert.alert_metadata
    } for alert in alerts]


@router.get("/stats")
async def get_alert_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get alert statistics for dashboard"""
    
    # Count alerts by status
    active_count = db.query(Alert).filter(Alert.status == AlertStatus.ACTIVE).count()
    resolved_count = db.query(Alert).filter(Alert.status == AlertStatus.RESOLVED).count()
    
    # Count by severity
    critical_count = db.query(Alert).filter(
        Alert.severity == "critical",
        Alert.status == AlertStatus.ACTIVE
    ).count()
    
    high_count = db.query(Alert).filter(
        Alert.severity == "high",
        Alert.status == AlertStatus.ACTIVE
    ).count()
    
    return {
        "active_alerts": active_count,
        "resolved_alerts": resolved_count,
        "critical_alerts": critical_count,
        "high_priority_alerts": high_count,
        "total_alerts": active_count + resolved_count
    }