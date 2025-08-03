from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api.deps import get_current_user_from_api_token, check_rate_limit, check_task_quota
from app.models.user import User
from app.models.user_task import UserTask
from app.schemas.proxy import ChatCompletionRequest, ChatCompletionResponse
from app.services.proxy_service import ProxyService

router = APIRouter()


@router.post("/completions", response_model=ChatCompletionResponse)
async def chat_completions(
    request: ChatCompletionRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_from_api_token)
):
    """
    Main proxy endpoint for OpenAI chat completions
    
    This endpoint:
    1. Validates user token and permissions
    2. Checks rate limits and quotas
    3. Validates task assignment
    4. Forwards request to OpenAI with intent classification
    5. Processes response and logs everything
    6. Updates user scores and quotas
    """
    
    # Check rate limiting
    check_rate_limit(current_user)
    
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
    
    # Get task details for quota checking
    task = user_task.task
    if not task or not task.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Task is not active"
        )
    
    # Calculate current task usage (from logs, not including chat tokens)
    from app.models.log import Log
    task_logs = db.query(Log).filter(
        Log.user_id == current_user.id,
        Log.task_id == task.id
    ).all()
    current_task_usage = sum(log.openai_tokens_used or 0 for log in task_logs)
    
    # Estimate tokens for this request (rough estimate)
    estimated_tokens = sum(len(msg.content.split()) for msg in request.messages) * 1.4
    
    # Check task quota
    check_task_quota(current_task_usage, task.token_limit, int(estimated_tokens))
    
    # Initialize proxy service
    proxy_service = ProxyService(db)
    
    # Process request through proxy
    try:
        response = await proxy_service.process_request(
            user=current_user,
            task_id=request.task_id,
            messages=request.messages,
            model=request.model,
            ip_address=http_request.client.host,
            user_agent=http_request.headers.get("user-agent", "")
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Proxy service error: {str(e)}"
        )