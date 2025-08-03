from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.database import get_db
from app.api.deps import get_current_user_from_jwt
from app.models.user import User
from app.services.chat_service import ChatService
from app.schemas.chat import (
    ChatCreateRequest,
    MessageSendRequest,
    ChatResponse,
    ChatWithMessagesResponse,
    SendMessageResponse,
    TaskContext
)

router = APIRouter()


@router.post("/new", response_model=ChatResponse)
async def create_chat(
    request: ChatCreateRequest,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Create a new chat for a specific task"""
    try:
        chat_service = ChatService(db)
        chat = await chat_service.create_chat(current_user.id, request)
        return chat
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat"
        )


@router.get("/", response_model=List[ChatResponse])
async def get_user_chats(
    task_id: Optional[int] = None,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get all chats for the current user, optionally filtered by task"""
    try:
        chat_service = ChatService(db)
        chats = await chat_service.get_user_chats(current_user.id, task_id)
        return chats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chats"
        )


@router.get("/{chat_id}", response_model=ChatWithMessagesResponse)
async def get_chat_with_messages(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get a specific chat with all its messages"""
    try:
        chat_service = ChatService(db)
        chat = await chat_service.get_chat_with_messages(chat_id, current_user.id)
        return chat
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat"
        )


@router.post("/send", response_model=SendMessageResponse)
async def send_message(
    request: MessageSendRequest,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Send a message and get AI response"""
    try:
        chat_service = ChatService(db)
        response = await chat_service.send_message(current_user.id, request)
        return response
    except ValueError as e:
        if "Token limit exceeded" in str(e):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )


@router.get("/task/{task_id}/context", response_model=TaskContext)
async def get_task_context(
    task_id: int,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get task context for chat creation"""
    try:
        chat_service = ChatService(db)
        context = await chat_service.get_task_context(task_id)
        return context
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get task context"
        )


@router.get("/task/{task_id}", response_model=ChatResponse)
async def get_or_create_chat_for_task(
    task_id: int,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Get existing chat for task or create new one (one chat per task)"""
    try:
        chat_service = ChatService(db)
        chat = await chat_service.get_or_create_chat_for_task(current_user.id, task_id)
        return chat
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get or create chat for task"
        )


@router.delete("/{chat_id}")
async def archive_chat(
    chat_id: uuid.UUID,
    current_user: User = Depends(get_current_user_from_jwt),
    db: Session = Depends(get_db)
):
    """Archive a chat (soft delete)"""
    try:
        chat_service = ChatService(db)
        success = await chat_service.archive_chat(chat_id, current_user.id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chat not found"
            )
        return {"message": "Chat archived successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive chat"
        )