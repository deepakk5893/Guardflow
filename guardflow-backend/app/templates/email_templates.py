"""
Email templates for user invitations and notifications.
These templates are ready for integration with any email service.
"""

from typing import Dict, Any


def get_invitation_email_template(data: Dict[str, Any]) -> Dict[str, str]:
    """
    Generate invitation email template
    
    Args:
        data: Dictionary containing:
            - company_name: Name of the company
            - inviter_name: Name of person who sent invitation
            - recipient_email: Email of person being invited
            - role_name: Role they're being invited as
            - invitation_link: Full URL to accept invitation
            - expires_in_days: Number of days until expiration (usually 7)
    
    Returns:
        Dict with 'subject', 'html_body', and 'text_body'
    """
    
    subject = f"You're invited to join {data['company_name']} on Guardflow"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to join {data['company_name']}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #f8f9fa;
                padding: 30px;
                text-align: center;
                border-radius: 8px;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
            }}
            .content {{
                padding: 0 20px;
            }}
            .invitation-box {{
                background-color: #f8f9fa;
                border-left: 4px solid #007bff;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .cta-button {{
                display: inline-block;
                background-color: #007bff;
                color: white !important;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: 500;
                margin: 20px 0;
                text-align: center;
            }}
            .cta-button:hover {{
                background-color: #0056b3;
            }}
            .details {{
                background-color: #fff;
                border: 1px solid #dee2e6;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
            }}
            .warning {{
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 10px;
                border-radius: 4px;
                margin: 15px 0;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">🛡️ Guardflow</div>
            <h1>You're invited to join {data['company_name']}</h1>
        </div>
        
        <div class="content">
            <p>Hello!</p>
            
            <p><strong>{data['inviter_name']}</strong> has invited you to join <strong>{data['company_name']}</strong>'s Guardflow workspace as a <strong>{data['role_name']}</strong>.</p>
            
            <div class="invitation-box">
                <h3>🎉 Welcome to the team!</h3>
                <p>Guardflow helps your team access AI models securely with built-in monitoring and usage controls.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{data['invitation_link']}" class="cta-button">Accept Invitation</a>
            </div>
            
            <div class="details">
                <h4>Invitation Details:</h4>
                <ul>
                    <li><strong>Company:</strong> {data['company_name']}</li>
                    <li><strong>Role:</strong> {data['role_name']}</li>
                    <li><strong>Invited by:</strong> {data['inviter_name']}</li>
                    <li><strong>Your email:</strong> {data['recipient_email']}</li>
                </ul>
            </div>
            
            <div class="warning">
                ⏰ <strong>Important:</strong> This invitation expires in {data['expires_in_days']} days. 
                Please accept it soon to avoid having to request a new one.
            </div>
            
            <p>If you have any questions, feel free to reach out to {data['inviter_name']} or your team administrator.</p>
            
            <p>Best regards,<br>The Guardflow Team</p>
        </div>
        
        <div class="footer">
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
            <p>This email was sent to {data['recipient_email']} by {data['company_name']}.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    You're invited to join {data['company_name']} on Guardflow
    
    Hello!
    
    {data['inviter_name']} has invited you to join {data['company_name']}'s Guardflow workspace as a {data['role_name']}.
    
    Guardflow helps your team access AI models securely with built-in monitoring and usage controls.
    
    Invitation Details:
    - Company: {data['company_name']}
    - Role: {data['role_name']}
    - Invited by: {data['inviter_name']}
    - Your email: {data['recipient_email']}
    
    To accept this invitation, click the link below:
    {data['invitation_link']}
    
    ⏰ Important: This invitation expires in {data['expires_in_days']} days.
    
    If you have any questions, feel free to reach out to {data['inviter_name']} or your team administrator.
    
    Best regards,
    The Guardflow Team
    
    ---
    If you didn't expect this invitation, you can safely ignore this email.
    This email was sent to {data['recipient_email']} by {data['company_name']}.
    """
    
    return {
        "subject": subject,
        "html_body": html_body,
        "text_body": text_body
    }


def get_welcome_email_template(data: Dict[str, Any]) -> Dict[str, str]:
    """
    Generate welcome email template for when user accepts invitation
    
    Args:
        data: Dictionary containing:
            - user_name: Name of the new user
            - company_name: Name of the company
            - role_name: Their role
            - login_url: URL to login to the platform
    """
    
    subject = f"Welcome to {data['company_name']} on Guardflow!"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to {data['company_name']}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #28a745;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 8px;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 24px;
                font-weight: bold;
                margin-bottom: 10px;
            }}
            .content {{
                padding: 0 20px;
            }}
            .success-box {{
                background-color: #d4edda;
                border-left: 4px solid #28a745;
                padding: 20px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .cta-button {{
                display: inline-block;
                background-color: #007bff;
                color: white !important;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: 500;
                margin: 20px 0;
            }}
            .features {{
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 4px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">🛡️ Guardflow</div>
            <h1>Welcome to {data['company_name']}!</h1>
        </div>
        
        <div class="content">
            <p>Hi {data['user_name']},</p>
            
            <div class="success-box">
                <h3>🎉 Account Successfully Created!</h3>
                <p>Your Guardflow account has been set up and you're now part of the {data['company_name']} team as a <strong>{data['role_name']}</strong>.</p>
            </div>
            
            <div style="text-align: center;">
                <a href="{data['login_url']}" class="cta-button">Go to Dashboard</a>
            </div>
            
            <div class="features">
                <h3>What you can do now:</h3>
                <ul>
                    <li>🤖 Access AI models securely through your company's configured providers</li>
                    <li>📊 View your usage analytics and quota information</li>
                    <li>💬 Use the chat interface for AI interactions</li>
                    <li>📋 Work on assigned tasks from your team</li>
                    <li>🛡️ Benefit from built-in security monitoring and controls</li>
                </ul>
            </div>
            
            <p>If you need help getting started or have any questions, don't hesitate to reach out to your team administrator or check our documentation.</p>
            
            <p>Happy to have you aboard!</p>
            
            <p>Best regards,<br>The Guardflow Team</p>
        </div>
        
        <div class="footer">
            <p>Need support? Contact your team administrator or visit our help center.</p>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Welcome to {data['company_name']} on Guardflow!
    
    Hi {data['user_name']},
    
    Your Guardflow account has been set up and you're now part of the {data['company_name']} team as a {data['role_name']}.
    
    What you can do now:
    - Access AI models securely through your company's configured providers
    - View your usage analytics and quota information  
    - Use the chat interface for AI interactions
    - Work on assigned tasks from your team
    - Benefit from built-in security monitoring and controls
    
    To get started, visit your dashboard:
    {data['login_url']}
    
    If you need help getting started or have any questions, don't hesitate to reach out to your team administrator.
    
    Happy to have you aboard!
    
    Best regards,
    The Guardflow Team
    
    ---
    Need support? Contact your team administrator or visit our help center.
    """
    
    return {
        "subject": subject,
        "html_body": html_body,
        "text_body": text_body
    }


def get_invitation_reminder_template(data: Dict[str, Any]) -> Dict[str, str]:
    """
    Generate reminder email template for pending invitations
    """
    
    subject = f"Reminder: Your invitation to join {data['company_name']} expires soon"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invitation Reminder</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .reminder-box {{
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                padding: 20px;
                border-radius: 4px;
                margin: 20px 0;
            }}
            .cta-button {{
                display: inline-block;
                background-color: #ffc107;
                color: black !important;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: 500;
                margin: 20px 0;
            }}
        </style>
    </head>
    <body>
        <h2>⏰ Your invitation expires soon</h2>
        
        <div class="reminder-box">
            <p>Hi there!</p>
            
            <p>This is a friendly reminder that your invitation to join <strong>{data['company_name']}</strong> on Guardflow expires in <strong>{data['days_left']} days</strong>.</p>
            
            <p>Don't miss out on joining the team!</p>
        </div>
        
        <div style="text-align: center;">
            <a href="{data['invitation_link']}" class="cta-button">Accept Invitation Now</a>
        </div>
        
        <p>If you have any questions about this invitation, please reach out to {data['inviter_name']}.</p>
        
        <p>Best regards,<br>The Guardflow Team</p>
    </body>
    </html>
    """
    
    text_body = f"""
    Reminder: Your invitation to join {data['company_name']} expires soon
    
    Hi there!
    
    This is a friendly reminder that your invitation to join {data['company_name']} on Guardflow expires in {data['days_left']} days.
    
    To accept your invitation:
    {data['invitation_link']}
    
    If you have any questions, please reach out to {data['inviter_name']}.
    
    Best regards,
    The Guardflow Team
    """
    
    return {
        "subject": subject,
        "html_body": html_body,
        "text_body": text_body
    }