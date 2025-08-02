from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import openai
import time
import uuid
from datetime import datetime

from app.core.config import settings
from app.models.user import User
from app.models.task import Task
from app.models.log import Log
from app.schemas.proxy import ChatMessage, ChatCompletionResponse, ChatChoice, Usage
from app.services.scoring_service import ScoringService

# Configure OpenAI
openai.api_key = settings.OPENAI_API_KEY


class ProxyService:
    def __init__(self, db: Session):
        self.db = db
        self.scoring_service = ScoringService(db)

    async def process_request(
        self,
        user: User,
        task_id: int,
        messages: List[ChatMessage],
        model: str = "gpt-3.5-turbo",
        ip_address: str = "",
        user_agent: str = ""
    ) -> ChatCompletionResponse:
        """Process a chat completion request through the proxy"""
        
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        # Get task information
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
        # Prepare the enhanced messages with intent classification
        enhanced_messages = self._add_intent_classification_prompt(messages, task)
        
        try:
            # Call OpenAI API
            response = await openai.ChatCompletion.acreate(
                model=model,
                messages=[msg.dict() for msg in enhanced_messages],
                temperature=0.7,
                max_tokens=1000
            )
            
            # Extract response and intent classification
            ai_response = response.choices[0].message.content
            intent_classification, confidence, clean_response = self._extract_intent_from_response(ai_response)
            
            # Calculate response time
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Calculate deviation score
            score_before = float(user.deviation_score)
            score_delta = await self.scoring_service.calculate_deviation_score(
                user, task, intent_classification, confidence
            )
            score_after = score_before + score_delta
            
            # Update user score and usage
            user.deviation_score = score_after
            user.current_daily_usage += response.usage.total_tokens
            user.current_monthly_usage += response.usage.total_tokens
            user.last_activity = datetime.utcnow()
            
            # Log the request
            log_entry = Log(
                user_id=user.id,
                task_id=task_id,
                prompt=messages[-1].content,  # Last user message
                response=clean_response,
                intent_classification=intent_classification,
                confidence_score=confidence,
                deviation_score_delta=score_delta,
                user_score_before=score_before,
                user_score_after=score_after,
                openai_tokens_used=response.usage.total_tokens,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                response_time_ms=response_time_ms,
                model=model,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
                status="success"
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
            # Check if user should be blocked
            await self.scoring_service.check_and_block_user(user)
            
            # Prepare response
            return ChatCompletionResponse(
                id=request_id,
                created=int(time.time()),
                model=model,
                choices=[
                    ChatChoice(
                        index=0,
                        message=ChatMessage(role="assistant", content=clean_response),
                        finish_reason=response.choices[0].finish_reason
                    )
                ],
                usage=Usage(
                    prompt_tokens=response.usage.prompt_tokens,
                    completion_tokens=response.usage.completion_tokens,
                    total_tokens=response.usage.total_tokens
                ),
                intent_classification=intent_classification,
                confidence_score=confidence,
                deviation_score_delta=score_delta
            )
            
        except Exception as e:
            # Log error
            log_entry = Log(
                user_id=user.id,
                task_id=task_id,
                prompt=messages[-1].content,
                model=model,
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
                status="error",
                error_message=str(e)
            )
            
            self.db.add(log_entry)
            self.db.commit()
            
            raise e

    def _add_intent_classification_prompt(self, messages: List[ChatMessage], task: Task) -> List[ChatMessage]:
        """Add intent classification instructions to the messages"""
        
        # Create system message for intent classification
        intent_system_msg = f"""
You are an AI assistant helping with the task: {task.name}.
Task description: {task.description or 'No description provided'}
Allowed intents for this task: {', '.join(task.allowed_intents) if task.allowed_intents else 'Any'}
Task scope: {task.task_scope or 'No specific scope defined'}

Please:
1. Answer the user's question thoroughly and helpfully
2. At the very end of your response, add a line starting with "INTENT_CLASSIFICATION:" followed by one of these categories:
   - coding: Programming, debugging, code review
   - testing: Writing tests, QA, validation
   - documentation: Writing docs, comments, explanations
   - research: Information gathering, analysis
   - off_topic: Unrelated to the assigned task

Format: INTENT_CLASSIFICATION: [category] | CONFIDENCE: [0.0-1.0]

Example:
Your main response here...

INTENT_CLASSIFICATION: coding | CONFIDENCE: 0.9
"""
        
        enhanced_messages = [ChatMessage(role="system", content=intent_system_msg)]
        enhanced_messages.extend(messages)
        
        return enhanced_messages

    def _extract_intent_from_response(self, response: str) -> tuple[str, float, str]:
        """Extract intent classification from OpenAI response"""
        
        lines = response.strip().split('\n')
        intent_line = None
        clean_response = response
        
        # Look for intent classification line
        for i, line in enumerate(lines):
            if line.startswith("INTENT_CLASSIFICATION:"):
                intent_line = line
                # Remove the intent line from the response
                clean_response = '\n'.join(lines[:i]).strip()
                break
        
        if intent_line:
            try:
                # Parse intent and confidence
                parts = intent_line.replace("INTENT_CLASSIFICATION:", "").strip().split("|")
                intent = parts[0].strip()
                confidence = 0.5  # default
                
                if len(parts) > 1 and "CONFIDENCE:" in parts[1]:
                    confidence_str = parts[1].replace("CONFIDENCE:", "").strip()
                    confidence = float(confidence_str)
                
                return intent, confidence, clean_response
                
            except Exception as e:
                # Fallback if parsing fails
                return "unknown", 0.1, clean_response
        
        # No intent classification found
        return "unknown", 0.1, clean_response