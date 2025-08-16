"""
Email service for handling invitation and notification emails using SendGrid.
Supports local development mode with file storage.
"""

from typing import Dict, Any, Optional
import json
import os
from datetime import datetime
from pathlib import Path

from app.templates.email_templates import (
    get_invitation_email_template,
    get_welcome_email_template,
    get_invitation_reminder_template
)
from app.core.config import settings


class EmailService:
    """
    Email service that handles all email operations using SendGrid.
    Falls back to local file storage for development.
    """
    
    def __init__(self):
        # Create emails directory if it doesn't exist (for development)
        self.email_dir = Path("emails")
        self.email_dir.mkdir(exist_ok=True)
        
        # Base URL for invitation links
        self.base_url = getattr(settings, 'BASE_URL', 'https://guardflow.tech')
        
        # Email configuration
        self.use_sendgrid = getattr(settings, 'USE_EXTERNAL_EMAIL', False)
    
    def send_invitation_email(
        self, 
        recipient_email: str,
        company_name: str,
        inviter_name: str,
        role_name: str,
        invitation_token: str,
        expires_in_days: int = 7
    ) -> bool:
        """
        Send invitation email to a new user
        
        Args:
            recipient_email: Email of person being invited
            company_name: Name of the company
            inviter_name: Name of person sending invitation
            role_name: Role they're being invited as
            invitation_token: Unique invitation token
            expires_in_days: Days until invitation expires
        
        Returns:
            bool: True if email was "sent" successfully
        """
        
        invitation_link = f"{self.base_url}/invitation/{invitation_token}"
        
        email_data = {
            'company_name': company_name,
            'inviter_name': inviter_name,
            'recipient_email': recipient_email,
            'role_name': role_name,
            'invitation_link': invitation_link,
            'expires_in_days': expires_in_days
        }
        
        template = get_invitation_email_template(email_data)
        
        return self._send_email(
            recipient_email=recipient_email,
            email_type="invitation",
            template=template,
            metadata=email_data
        )
    
    def send_welcome_email(
        self,
        recipient_email: str,
        user_name: str,
        company_name: str,
        role_name: str
    ) -> bool:
        """Send welcome email after user accepts invitation"""
        
        login_url = f"{self.base_url}/login"
        
        email_data = {
            'user_name': user_name,
            'company_name': company_name,
            'role_name': role_name,
            'login_url': login_url
        }
        
        template = get_welcome_email_template(email_data)
        
        return self._send_email(
            recipient_email=recipient_email,
            email_type="welcome",
            template=template,
            metadata=email_data
        )
    
    def send_invitation_reminder(
        self,
        recipient_email: str,
        company_name: str,
        inviter_name: str,
        invitation_token: str,
        days_left: int
    ) -> bool:
        """Send reminder email for pending invitation"""
        
        invitation_link = f"{self.base_url}/invitation/{invitation_token}"
        
        email_data = {
            'company_name': company_name,
            'inviter_name': inviter_name,
            'invitation_link': invitation_link,
            'days_left': days_left
        }
        
        template = get_invitation_reminder_template(email_data)
        
        return self._send_email(
            recipient_email=recipient_email,
            email_type="reminder",
            template=template,
            metadata=email_data
        )
    
    def _send_email(
        self,
        recipient_email: str,
        email_type: str,
        template: Dict[str, str],
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Send email via SendGrid or save locally for development.
        """
        
        if self.use_sendgrid:
            # Use SendGrid
            return self._send_via_sendgrid(template, recipient_email)
        else:
            # Save locally for development
            return self._save_email_locally(recipient_email, email_type, template, metadata)
    
    def _save_email_locally(
        self,
        recipient_email: str,
        email_type: str,
        template: Dict[str, str],
        metadata: Dict[str, Any]
    ) -> bool:
        """Save email to local file (for development)"""
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_email = recipient_email.replace("@", "_at_").replace(".", "_")
        filename = f"{timestamp}_{email_type}_{safe_email}.json"
        
        email_record = {
            "timestamp": datetime.now().isoformat(),
            "recipient": recipient_email,
            "type": email_type,
            "subject": template["subject"],
            "html_body": template["html_body"],
            "text_body": template["text_body"],
            "metadata": metadata,
            "status": "saved_locally"
        }
        
        try:
            with open(self.email_dir / filename, 'w') as f:
                json.dump(email_record, f, indent=2, default=str)
            
            print(f"✅ Email saved: {filename}")
            print(f"📧 Subject: {template['subject']}")
            print(f"📮 To: {recipient_email}")
            
            return True
            
        except Exception as e:
            print(f"❌ Failed to save email: {e}")
            return False
    
    
    def get_saved_emails(self, recipient_email: Optional[str] = None) -> list:
        """Get list of saved emails (for development/testing)"""
        
        emails = []
        
        for email_file in self.email_dir.glob("*.json"):
            try:
                with open(email_file, 'r') as f:
                    email_data = json.load(f)
                    
                    if recipient_email is None or email_data.get('recipient') == recipient_email:
                        emails.append(email_data)
                        
            except Exception as e:
                print(f"Error reading email file {email_file}: {e}")
        
        # Sort by timestamp, newest first
        emails.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return emails
    
    def _send_via_sendgrid(self, template: Dict[str, str], recipient: str) -> bool:
        """Send email via SendGrid with enhanced error handling"""
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail, Email, Content
            
            api_key = getattr(settings, 'SENDGRID_API_KEY', '')
            if not api_key:
                print("❌ SendGrid API key not configured")
                return self._save_email_locally(recipient, "no_api_key", template, {})
            
            sg = sendgrid.SendGridAPIClient(api_key=api_key)
            from_email_addr = getattr(settings, 'FROM_EMAIL', 'admin@guardflow.tech')
            
            # Create email with proper formatting
            from_email = Email(from_email_addr, "Guardflow")
            to_email = Email(recipient)
            
            message = Mail(
                from_email=from_email,
                to_emails=to_email,
                subject=template['subject'],
                html_content=Content("text/html", template['html_body'])
            )
            
            # Add text content if available
            if template.get('text_body'):
                message.add_content(Content("text/plain", template['text_body']))
            
            # Add custom headers for tracking
            message.add_header({
                'X-Entity-Ref-ID': f"guardflow-{int(datetime.now().timestamp())}"
            })
            
            # Add categories for analytics
            message.add_category('guardflow')
            message.add_category('transactional')
            
            response = sg.send(message)
            success = response.status_code == 202
            
            if success:
                print(f"✅ Email sent via SendGrid to: {recipient}")
                print(f"📊 SendGrid Message ID: {response.headers.get('X-Message-Id', 'N/A')}")
            else:
                print(f"❌ SendGrid failed with status: {response.status_code}")
                print(f"❌ Response body: {response.body}")
            
            return success
            
        except Exception as e:
            print(f"❌ SendGrid error: {e}")
            # Fallback to local storage if SendGrid fails
            return self._save_email_locally(recipient, "sendgrid_error", template, {"error": str(e)})


# Singleton instance
email_service = EmailService()