from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
import uuid

from app.models.chat import Chat, Message
from app.models.user import User
from app.models.task import Task
from app.services.alert_service import AlertService
from app.services.openai_service import OpenAIService
from app.schemas.chat import (
    ChatCreateRequest, 
    MessageSendRequest,
    ChatResponse,
    MessageResponse,
    ChatWithMessagesResponse,
    SendMessageResponse,
    TaskContext
)


class ChatService:
    def __init__(self, db: Session):
        self.db = db

    async def create_chat(self, user_id: int, request: ChatCreateRequest) -> ChatResponse:
        """Create a new chat for a specific task (or return existing one)"""
        
        # Verify user exists and has access to the task
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Verify task exists and user has access
        task = self.db.query(Task).filter(Task.id == request.task_id).first()
        if not task:
            raise ValueError("Task not found")
        
        # Check if chat already exists for this user+task combination
        existing_chat = self.db.query(Chat).filter(
            Chat.user_id == user_id,
            Chat.task_id == request.task_id,
            Chat.status == "active"
        ).first()
        
        if existing_chat:
            # Return existing chat instead of creating duplicate
            return ChatResponse.model_validate(existing_chat)
        
        # Create new chat only if none exists
        chat = Chat(
            user_id=user_id,
            task_id=request.task_id,
            title=request.title or f"Chat for {task.title}",
            total_tokens_used=0,
            status="active"
        )
        
        self.db.add(chat)
        self.db.commit()
        self.db.refresh(chat)
        
        return ChatResponse.model_validate(chat)

    async def get_or_create_chat_for_task(self, user_id: int, task_id: int) -> ChatResponse:
        """Get existing chat for task or create new one (enforces one chat per task)"""
        
        # Check if chat already exists for this user+task combination
        existing_chat = self.db.query(Chat).filter(
            Chat.user_id == user_id,
            Chat.task_id == task_id,
            Chat.status == "active"
        ).first()
        
        if existing_chat:
            return ChatResponse.model_validate(existing_chat)
        
        # Create new chat if none exists
        request = ChatCreateRequest(task_id=task_id)
        return await self.create_chat(user_id, request)

    async def get_user_chats(self, user_id: int, task_id: Optional[int] = None) -> List[ChatResponse]:
        """Get all chats for a user, optionally filtered by task"""
        
        query = self.db.query(Chat).filter(Chat.user_id == user_id, Chat.status == "active")
        
        if task_id:
            query = query.filter(Chat.task_id == task_id)
            
        chats = query.order_by(desc(Chat.updated_at)).all()
        return [ChatResponse.model_validate(chat) for chat in chats]

    async def get_chat_with_messages(self, chat_id: uuid.UUID, user_id: int) -> ChatWithMessagesResponse:
        """Get a specific chat with all its messages"""
        
        chat = self.db.query(Chat).filter(
            Chat.id == chat_id,
            Chat.user_id == user_id
        ).first()
        
        if not chat:
            raise ValueError("Chat not found or access denied")
        
        messages = self.db.query(Message).filter(
            Message.chat_id == chat_id
        ).order_by(Message.created_at).all()
        
        return ChatWithMessagesResponse(
            id=chat.id,
            title=chat.title,
            task_id=chat.task_id,
            total_tokens_used=chat.total_tokens_used,
            status=chat.status,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            messages=[MessageResponse.model_validate(msg) for msg in messages]
        )

    async def send_message(
        self, 
        user_id: int, 
        request: MessageSendRequest
    ) -> SendMessageResponse:
        """Send a message and get AI response (mock for now)"""
        
        # Verify chat exists and user has access
        chat = self.db.query(Chat).filter(
            Chat.id == request.chat_id,
            Chat.user_id == user_id
        ).first()
        
        if not chat:
            raise ValueError("Chat not found or access denied")
        
        # Get task context
        task = self.db.query(Task).filter(Task.id == chat.task_id).first()
        if not task:
            raise ValueError("Associated task not found")
        
        # Estimate tokens for user message (rough estimate: 1 token per 4 characters)
        user_tokens = max(1, len(request.content) // 4)
        
        # PROTECTION 1: Check per-request token limit (prevent single expensive requests)
        max_request_tokens = task.max_tokens_per_request or 1000
        estimated_total_tokens = user_tokens + 500  # +500 buffer for AI response
        
        if estimated_total_tokens > max_request_tokens:
            raise ValueError(f"Request too large. Estimated {estimated_total_tokens} tokens, maximum {max_request_tokens} per request.")
        
        # PROTECTION 2: Check remaining task quota
        remaining_tokens = task.token_limit - chat.total_tokens_used
        if estimated_total_tokens > remaining_tokens:
            raise ValueError(f"Insufficient tokens. Need ~{estimated_total_tokens}, only {remaining_tokens} remaining.")
        
        # PROTECTION 3: Check total task quota
        if chat.total_tokens_used >= task.token_limit:
            raise ValueError(f"Token limit exceeded. Used: {chat.total_tokens_used}, Limit: {task.token_limit}")
        
        # Save user message
        user_message = Message(
            chat_id=request.chat_id,
            content=request.content,
            is_user=True,
            tokens_used=user_tokens,
            intent=None  # Will be filled by AI response processing
        )
        self.db.add(user_message)
        
        # Generate AI response using OpenAI service with safety limits
        openai_service = OpenAIService()
        remaining_tokens = task.token_limit - chat.total_tokens_used
        max_response_tokens = min(
            (task.max_tokens_per_request or 1000) - user_tokens,  # Subtract user tokens from per-request limit
            remaining_tokens - user_tokens,  # Subtract user tokens from remaining quota
            1000  # Hard limit for safety
        )
        
        ai_response = await openai_service.generate_response(
            user_message=request.content,
            task=task,
            max_tokens=max_response_tokens,
            timeout=30
        )
        
        ai_response_content = ai_response["content"]
        ai_tokens = ai_response["tokens_used"]
        
        # Save AI response
        ai_message = Message(
            chat_id=request.chat_id,
            content=ai_response_content,
            is_user=False,
            tokens_used=ai_tokens,
            intent="general_assistance"  # Mock intent for now
        )
        self.db.add(ai_message)
        
        # Update chat token usage
        total_tokens_used = user_tokens + ai_tokens
        chat.total_tokens_used += total_tokens_used
        chat.updated_at = datetime.utcnow()
        
        # Note: We only track task-based token limits, not daily/monthly quotas
        
        # PROTECTION 4: Check for suspicious activity and create alerts
        alert_service = AlertService(self.db)
        alert_service.check_suspicious_activity(user_id, total_tokens_used, task.id)
        
        self.db.commit()
        self.db.refresh(user_message)
        self.db.refresh(ai_message)
        self.db.refresh(chat)
        
        # Calculate remaining tokens
        remaining_tokens = max(0, task.token_limit - chat.total_tokens_used)
        
        return SendMessageResponse(
            message=MessageResponse.model_validate(user_message),
            response=MessageResponse.model_validate(ai_message),
            remaining_tokens=remaining_tokens,
            chat_updated=ChatResponse.model_validate(chat)
        )


    async def get_task_context(self, task_id: int) -> TaskContext:
        """Get task context for chat creation"""
        
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise ValueError("Task not found")
        
        return TaskContext(
            id=task.id,
            title=task.title,
            description=task.description,
            category=task.category,
            token_limit=task.token_limit
        )

    async def archive_chat(self, chat_id: uuid.UUID, user_id: int) -> bool:
        """Archive a chat (soft delete)"""
        
        chat = self.db.query(Chat).filter(
            Chat.id == chat_id,
            Chat.user_id == user_id
        ).first()
        
        if not chat:
            return False
        
        chat.status = "archived"
        chat.updated_at = datetime.utcnow()
        
        self.db.commit()
        return True