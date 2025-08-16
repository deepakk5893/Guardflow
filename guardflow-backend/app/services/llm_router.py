from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import openai
import json
import requests

from app.models import LLMProvider, Tenant
from app.core.config import settings
from fastapi import HTTPException

class SimpleLLMRouter:
    """Simple LLM routing service for MVP"""
    
    def __init__(self, db: Session):
        self.db = db
        self.cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode())
    
    def get_provider_for_task(self, tenant_id: str, provider_id: str) -> LLMProvider:
        """Get specific provider for a task"""
        provider = self.db.query(LLMProvider).filter(
            LLMProvider.id == provider_id,
            LLMProvider.tenant_id == tenant_id,
            LLMProvider.is_active == True
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=404,
                detail=f"LLM Provider not found or inactive"
            )
        
        return provider
    
    def get_default_provider(self, tenant_id: str, provider_name: str) -> Optional[LLMProvider]:
        """Get default provider for a tenant and provider type"""
        return self.db.query(LLMProvider).filter(
            LLMProvider.tenant_id == tenant_id,
            LLMProvider.provider_name == provider_name,
            LLMProvider.is_default == True,
            LLMProvider.is_active == True
        ).first()
    
    def get_provider_by_model(self, tenant_id: str, model_name: str) -> Optional[LLMProvider]:
        """Find provider that supports a specific model"""
        providers = self.db.query(LLMProvider).filter(
            LLMProvider.tenant_id == tenant_id,
            LLMProvider.is_active == True
        ).all()
        
        for provider in providers:
            if model_name in (provider.enabled_models or []):
                return provider
        
        return None
    
    def decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt API key for use"""
        try:
            return self.cipher_suite.decrypt(encrypted_key.encode()).decode()
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail="Failed to decrypt API key"
            )
    
    def encrypt_api_key(self, api_key: str) -> str:
        """Encrypt API key for storage"""
        return self.cipher_suite.encrypt(api_key.encode()).decode()
    
    def test_provider_connection(self, provider: LLMProvider) -> Dict[str, Any]:
        """Test connection to LLM provider and detect available models"""
        api_key = self.decrypt_api_key(provider.api_key_encrypted)
        
        try:
            if provider.provider_name == 'openai':
                return self._test_openai_connection(api_key, provider.api_endpoint)
            elif provider.provider_name == 'anthropic':
                return self._test_anthropic_connection(api_key)
            elif provider.provider_name == 'azure_openai':
                return self._test_azure_openai_connection(api_key, provider.api_endpoint)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported provider: {provider.provider_name}"
                )
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "available_models": []
            }
    
    def _test_openai_connection(self, api_key: str, api_endpoint: Optional[str] = None) -> Dict[str, Any]:
        """Test OpenAI connection and get models"""
        client = openai.OpenAI(
            api_key=api_key,
            base_url=api_endpoint or "https://api.openai.com/v1"
        )
        
        try:
            # Get available models
            models = client.models.list()
            available_models = [model.id for model in models.data 
                             if model.id.startswith(('gpt-', 'text-', 'code-'))]
            
            return {
                "success": True,
                "available_models": available_models[:10]  # Limit to first 10 for UI
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "available_models": []
            }
    
    def _test_anthropic_connection(self, api_key: str) -> Dict[str, Any]:
        """Test Anthropic connection"""
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        # Test with a simple completion
        data = {
            "model": "claude-3-sonnet-20240229",
            "max_tokens": 1,
            "messages": [{"role": "user", "content": "Hi"}]
        }
        
        try:
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=data,
                timeout=10
            )
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "available_models": [
                        "claude-3-sonnet-20240229",
                        "claude-3-opus-20240229",
                        "claude-3-haiku-20240307"
                    ]
                }
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}",
                    "available_models": []
                }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "available_models": []
            }
    
    def _test_azure_openai_connection(self, api_key: str, api_endpoint: str) -> Dict[str, Any]:
        """Test Azure OpenAI connection"""
        if not api_endpoint:
            return {
                "success": False,
                "error": "Azure OpenAI endpoint is required",
                "available_models": []
            }
        
        # For Azure OpenAI, models are deployed instances
        # This is a simplified test - in production you'd query the deployments endpoint
        try:
            client = openai.AzureOpenAI(
                api_key=api_key,
                api_version="2024-02-15-preview",
                azure_endpoint=api_endpoint
            )
            
            # Try a simple completion to test connection
            response = client.chat.completions.create(
                model="gpt-35-turbo",  # Common deployment name
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=1
            )
            
            return {
                "success": True,
                "available_models": ["gpt-35-turbo", "gpt-4"]  # Common deployment names
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "available_models": []
            }
    
    def make_llm_request(
        self, 
        provider: LLMProvider, 
        messages: List[Dict[str, str]], 
        model: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make request to LLM provider"""
        api_key = self.decrypt_api_key(provider.api_key_encrypted)
        
        try:
            if provider.provider_name == 'openai':
                return self._make_openai_request(api_key, provider.api_endpoint, model, messages, **kwargs)
            elif provider.provider_name == 'anthropic':
                return self._make_anthropic_request(api_key, model, messages, **kwargs)
            elif provider.provider_name == 'azure_openai':
                return self._make_azure_openai_request(api_key, provider.api_endpoint, model, messages, **kwargs)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported provider: {provider.provider_name}"
                )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"LLM request failed: {str(e)}"
            )
    
    def _make_openai_request(
        self, 
        api_key: str, 
        api_endpoint: Optional[str], 
        model: str, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> Dict[str, Any]:
        """Make OpenAI API request"""
        client = openai.OpenAI(
            api_key=api_key,
            base_url=api_endpoint or "https://api.openai.com/v1"
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        
        return {
            "content": response.choices[0].message.content,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            "model": response.model
        }
    
    def _make_anthropic_request(
        self, 
        api_key: str, 
        model: str, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> Dict[str, Any]:
        """Make Anthropic API request"""
        headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }
        
        data = {
            "model": model,
            "messages": messages,
            "max_tokens": kwargs.get("max_tokens", 1024),
            **{k: v for k, v in kwargs.items() if k != "max_tokens"}
        }
        
        response = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=data
        )
        
        if response.status_code != 200:
            raise Exception(f"Anthropic API error: {response.text}")
        
        result = response.json()
        
        return {
            "content": result["content"][0]["text"],
            "usage": {
                "prompt_tokens": result["usage"]["input_tokens"],
                "completion_tokens": result["usage"]["output_tokens"],
                "total_tokens": result["usage"]["input_tokens"] + result["usage"]["output_tokens"]
            },
            "model": model
        }
    
    def _make_azure_openai_request(
        self, 
        api_key: str, 
        api_endpoint: str, 
        model: str, 
        messages: List[Dict[str, str]], 
        **kwargs
    ) -> Dict[str, Any]:
        """Make Azure OpenAI API request"""
        client = openai.AzureOpenAI(
            api_key=api_key,
            api_version="2024-02-15-preview",
            azure_endpoint=api_endpoint
        )
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        
        return {
            "content": response.choices[0].message.content,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            "model": response.model
        }