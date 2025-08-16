from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Union

from app.database import get_db
from app.api.deps import get_current_user_from_api_token, check_rate_limit, check_task_quota, require_scope
from app.models.user import User
from app.models.user_task import UserTask
from app.models.task import Task
from app.schemas.proxy import ChatCompletionRequest, ChatCompletionResponse, MinimalResponse
from app.services.proxy_service import ProxyService
from app.services.quota_tracking_service import QuotaTrackingService
from app.services.safety_filter_service import safety_filter

router = APIRouter()


@router.post("/completions", response_model=Union[ChatCompletionResponse, MinimalResponse])
async def chat_completions(
    request: ChatCompletionRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_scope("llm:call"))
):
    """
    Enhanced proxy endpoint for OpenAI chat completions
    
    Supports both regular tasks (full monitoring) and dummy tasks (simplified flow):
    - Regular tasks: Intent classification, deviation scoring, task quotas
    - Dummy tasks: Basic safety filtering, user quotas only
    
    This endpoint:
    1. Validates user token and permissions
    2. Checks rate limits and quotas
    3. Validates task assignment
    4. Routes to appropriate processing flow (regular vs dummy task)
    5. Processes response and logs usage
    6. Updates quotas and tracking
    """
    
    # Check rate limiting
    # check_rate_limit(current_user)
    
    # Validate task assignment first
    if not request.task_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="task_id is required"
        )
    
    # Check if user is assigned to this task
    user_task = db.query(UserTask).filter(
        UserTask.user_id == current_user.id,
        UserTask.task_id == request.task_id,
        UserTask.is_active == True
    ).first()
    
    if not user_task:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to this task"
        )
    
    # Get task details
    task = user_task.task
    if not task or not task.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Task is not active"
        )
    
    # Initialize services
    quota_service = QuotaTrackingService(db)
    proxy_service = ProxyService(db)
    
    # Estimate tokens for this request
    estimated_tokens = sum(len(msg.content.split()) for msg in request.messages) * 1.4
    estimated_tokens = int(max(estimated_tokens, 10))  # Minimum estimate
    
    # Check quotas before processing
    quota_check = quota_service.check_quotas_before_request(
        user=current_user,
        task=task,
        estimated_tokens=estimated_tokens,
        user_task=user_task
    )
    
    if not quota_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=quota_check["reason"]
        )
    
    # Route to appropriate processing flow
    if task.is_dummy_task:
        response = await _process_dummy_task_request(
            request, current_user, task, user_task, quota_service, proxy_service
        )
    else:
        response = await _process_regular_task_request(
            request, current_user, task, user_task, quota_service, proxy_service
        )
    
    # Return minimal format if requested
    if request.format == "minimal":
        return MinimalResponse(
            content=response.choices[0].message.content
        )
    
    return response


async def _process_dummy_task_request(
    request: ChatCompletionRequest,
    current_user: User,
    task: Task,
    user_task: UserTask,
    quota_service: QuotaTrackingService,
    proxy_service: ProxyService
) -> ChatCompletionResponse:
    """Process request for dummy tasks (simplified flow)"""
    
    # Basic safety filtering for dummy tasks
    safety_check = safety_filter.check_messages_safety([
        {"content": msg.content} for msg in request.messages
    ])
    
    if not safety_check["safe"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content safety check failed: {', '.join(safety_check['reasons'])}"
        )
    
    # Log warning for medium risk content
    if safety_check["action"] == "warn":
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Medium risk content from user {current_user.id} in dummy task {task.id}: {safety_check['reasons']}")
    
    try:
        # Process request without intent classification
        response = await proxy_service.process_simple_request(
            user=current_user,
            task_id=request.task_id,
            messages=request.messages,
            model=request.model,
            task_type="dummy"
        )
        
        # Update quotas (user quotas only)
        quota_service.update_task_usage(
            user=current_user,
            task=task,
            tokens_used=response.usage.total_tokens,
            user_task=user_task
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dummy task processing error: {str(e)}"
        )


async def _process_regular_task_request(
    request: ChatCompletionRequest,
    current_user: User,
    task: Task,
    user_task: UserTask,
    quota_service: QuotaTrackingService,
    proxy_service: ProxyService
) -> ChatCompletionResponse:
    """Process request for regular tasks (full monitoring flow)"""
    
    try:
        # Process request with full intent classification and monitoring
        response = await proxy_service.process_request(
            user=current_user,
            task_id=request.task_id,
            messages=request.messages,
            model=request.model,
            ip_address="127.0.0.1",  # Will be enhanced later
            user_agent="Guardflow API"
        )
        
        # Update quotas (both task and user quotas)
        quota_service.update_task_usage(
            user=current_user,
            task=task,
            tokens_used=response.usage.total_tokens,
            user_task=user_task
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Regular task processing error: {str(e)}"
        )