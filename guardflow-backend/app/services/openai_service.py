import asyncio
import openai
from typing import Optional, Dict, Any
from datetime import datetime
import os

from app.models.task import Task


class OpenAIService:
    def __init__(self):
        # Get API key from environment - will be None until you set it
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.client = None
        
        if self.api_key:
            self.client = openai.AsyncOpenAI(api_key=self.api_key)
    
    async def generate_response(
        self, 
        user_message: str, 
        task: Task,
        max_tokens: Optional[int] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Generate AI response with proper safety limits
        
        Returns:
            dict: {
                "content": str,
                "tokens_used": int,
                "model": str,
                "finish_reason": str
            }
        """
        
        # If no OpenAI API key, return mock response
        if not self.client or not self.api_key:
            return await self._generate_mock_response(user_message, task)
        
        try:
            # Calculate safe token limits
            max_request_tokens = task.max_tokens_per_request or 1000
            safe_max_tokens = min(max_tokens or max_request_tokens, max_request_tokens, 2000)
            
            # Build system prompt based on task
            system_prompt = self._build_system_prompt(task)
            
            # Prepare messages
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            # Make OpenAI API call with timeout and limits
            response = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model="gpt-3.5-turbo",  # Use cheaper model by default
                    messages=messages,
                    max_tokens=safe_max_tokens,
                    temperature=0.7,
                    stream=False,  # No streaming for now for simplicity
                    user=f"task_{task.id}"  # For OpenAI usage tracking
                ),
                timeout=timeout
            )
            
            # Extract response data
            choice = response.choices[0]
            content = choice.message.content
            
            # Calculate actual tokens used (OpenAI provides this)
            tokens_used = response.usage.total_tokens
            
            return {
                "content": content,
                "tokens_used": tokens_used,
                "model": response.model,
                "finish_reason": choice.finish_reason,
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens
            }
            
        except asyncio.TimeoutError:
            raise ValueError(f"OpenAI request timed out after {timeout} seconds")
        except openai.RateLimitError:
            raise ValueError("OpenAI rate limit exceeded. Please try again later.")
        except openai.APIError as e:
            raise ValueError(f"OpenAI API error: {str(e)}")
        except Exception as e:
            # Fall back to mock response on any error
            print(f"OpenAI error, falling back to mock: {e}")
            return await self._generate_mock_response(user_message, task)
    
    def _build_system_prompt(self, task: Task) -> str:
        """Build system prompt based on task context"""
        
        base_prompt = f"""You are an AI assistant helping with the task: "{task.title}".

Task Description: {task.description}
Task Category: {task.category}
Difficulty Level: {task.difficulty_level}

Guidelines:
- Stay focused on the assigned task
- Provide helpful, accurate information
- Be concise but thorough
- If the user asks about something outside the task scope, gently redirect them back to the task
"""
        
        # Add category-specific instructions
        if task.category == "coding":
            base_prompt += "\n- Provide clean, well-commented code examples\n- Explain your reasoning\n- Suggest best practices"
        elif task.category == "writing":
            base_prompt += "\n- Help with grammar, style, and structure\n- Provide constructive feedback\n- Suggest improvements"
        elif task.category == "analysis":
            base_prompt += "\n- Break down complex problems\n- Provide structured analysis\n- Use data and evidence when possible"
        
        # Add token usage awareness
        base_prompt += f"\n\nToken Management: You have a maximum of {task.max_tokens_per_request or 1000} tokens per response. Be efficient with your words while being helpful."
        
        return base_prompt
    
    async def _generate_mock_response(self, user_message: str, task: Task) -> Dict[str, Any]:
        """Generate mock response when OpenAI is not available"""
        
        mock_responses = {
            "coding": f"I'll help you with your coding question about: '{user_message[:50]}...'. This is related to {task.title}. Here's a mock response until OpenAI is integrated.",
            "writing": f"For your writing task '{task.title}', regarding '{user_message[:50]}...', here's a helpful mock response. Once OpenAI is integrated, you'll get real AI assistance.",
            "analysis": f"Analyzing your request: '{user_message[:50]}...'. For the task '{task.title}', here's a mock analytical response until we connect to OpenAI.",
            "general": f"Thank you for your message about '{user_message[:50]}...'. I'm here to help with '{task.title}'. This is a mock response - real AI coming soon!"
        }
        
        content = mock_responses.get(task.category, mock_responses["general"])
        
        return {
            "content": content,
            "tokens_used": max(1, len(content) // 4),  # Rough estimate
            "model": "mock-gpt-3.5-turbo",
            "finish_reason": "stop",
            "prompt_tokens": max(1, len(user_message) // 4),
            "completion_tokens": max(1, len(content) // 4)
        }
    
    def is_available(self) -> bool:
        """Check if OpenAI API is configured and available"""
        return self.client is not None and self.api_key is not None