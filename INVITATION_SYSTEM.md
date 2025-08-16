# Guardflow Invitation System

## Overview
The Guardflow invitation system enables secure, token-based team member onboarding for multi-tenant organizations. Administrators can invite users via email, and invitees can accept invitations to join their organization with appropriate role assignments.

## Key Features

### ✅ Secure Token-Based Invitations
- **Cryptographically secure tokens** using `secrets.token_urlsafe(32)`
- **7-day expiration** with automatic cleanup
- **One-time use** tokens that are invalidated after acceptance
- **Public endpoints** for invitation acceptance (no authentication required)

### ✅ Role-Based Access Control
- **Three role system**: super_admin, admin, user
- **Role assignment** during invitation creation
- **Permission validation** - only admins can invite users
- **Role restrictions** - cannot invite super_admin users

### ✅ Plan Enforcement
- **User limits** based on subscription plan:
  - Basic Plan: 5 users maximum
  - Pro Plan: 20 users maximum  
  - Enterprise Plan: 100 users maximum
- **Real-time validation** before invitation creation
- **Pending invitation tracking** counted toward user limits

### ✅ Professional Email Templates
- **Beautiful HTML emails** with responsive design
- **Company branding** with tenant information
- **Multiple template types**:
  - Initial invitation emails
  - Welcome emails after acceptance
  - Reminder emails for pending invitations
- **Ready for external providers** (SendGrid, Mailgun, AWS SES)

## API Endpoints

### Authenticated Endpoints (Require Admin Role)

#### Create Invitation
```http
POST /api/v1/invitations
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "email": "newuser@company.com",
  "role_id": "role_uuid_here"
}
```

**Response:**
```json
{
  "id": "invitation_uuid",
  "email": "newuser@company.com", 
  "invitation_token": "secure_token_here",
  "status": "pending",
  "expires_at": "2024-08-21T12:00:00Z",
  "inviter_name": "Admin User",
  "role_name": "user"
}
```

#### List Invitations
```http
GET /api/v1/invitations?status=pending&skip=0&limit=50
Authorization: Bearer <jwt_token>
```

#### Cancel Invitation
```http
DELETE /api/v1/invitations/{invitation_id}
Authorization: Bearer <jwt_token>
```

#### Resend Invitation
```http
POST /api/v1/invitations/{invitation_id}/resend
Authorization: Bearer <jwt_token>
```

#### Get Invitation Statistics
```http
GET /api/v1/invitations/stats
Authorization: Bearer <jwt_token>
```

### Public Endpoints (No Authentication Required)

#### Get Invitation Details
```http
GET /api/v1/invitations/public/{token}/details
```

**Response:**
```json
{
  "id": "invitation_uuid",
  "email": "newuser@company.com",
  "company_name": "ACME Corp", 
  "role_name": "user",
  "inviter_name": "Admin User",
  "expires_at": "2024-08-21T12:00:00Z",
  "is_valid": true
}
```

#### Accept Invitation
```http
POST /api/v1/invitations/public/{token}/accept
Content-Type: application/json

{
  "name": "New User Name",
  "password": "secure_password_here"
}
```

## Database Schema

### user_invitations Table
```sql
CREATE TABLE user_invitations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role_id VARCHAR(36) REFERENCES roles(id),
    invited_by INTEGER REFERENCES users(id),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Constraints
- **Unique invitation tokens** across all tenants
- **Email uniqueness** per tenant (one pending invitation per email per tenant)
- **Cascade deletion** when tenant is deleted
- **Foreign key relationships** to tenants, roles, and users

## Business Logic

### Invitation Creation Validation
1. **User limit check**: Verify tenant can invite more users based on plan
2. **Existing user check**: Ensure email doesn't belong to existing tenant user
3. **Pending invitation check**: Ensure no pending invitation exists for email
4. **Role validation**: Verify role exists and is not super_admin
5. **Permission check**: Ensure current user has admin role

### Invitation Acceptance Flow
1. **Token validation**: Verify token exists and hasn't expired
2. **Status check**: Ensure invitation status is 'pending'
3. **User creation**: Create new user account with hashed password
4. **Invitation update**: Mark invitation as 'accepted'
5. **Welcome email**: Send branded welcome message
6. **API token generation**: Create secure API token for new user

### Security Features
- **Bcrypt password hashing** for new user accounts
- **Secure token generation** using cryptographically secure methods
- **Expiration enforcement** with automatic status checking
- **One-time use tokens** that cannot be reused
- **Tenant isolation** ensuring cross-tenant access is impossible

## Email Templates

### Invitation Email
- **Professional design** with company branding
- **Clear call-to-action** button
- **Invitation details** including role and inviter information
- **Expiration warning** with countdown
- **Responsive layout** for all devices

### Welcome Email  
- **Success confirmation** with company welcome message
- **Feature overview** highlighting platform capabilities
- **Dashboard link** to get started
- **Support information** for new users

### Reminder Email
- **Gentle reminder** for pending invitations
- **Days remaining** until expiration
- **Re-invitation link** for easy access

## Integration Points

### Email Service Integration
```python
# Ready for external email providers
email_service.send_invitation_email(
    recipient_email="user@company.com",
    company_name="ACME Corp",
    inviter_name="Admin User", 
    role_name="user",
    invitation_token="secure_token",
    expires_in_days=7
)
```

### Frontend Integration
- **Invitation management interface** for admins
- **Public invitation acceptance page** with form validation
- **Status tracking** with real-time updates
- **User limit warnings** when approaching plan limits

## Error Handling

### Common Error Scenarios
- **User limit reached**: HTTP 403 with plan upgrade suggestion
- **Invalid token**: HTTP 404 with clear error message  
- **Expired invitation**: HTTP 400 with re-invitation option
- **Email already exists**: HTTP 400 with user management link
- **Invalid role**: HTTP 400 with available role list

### Validation Rules
- **Email format validation** using Pydantic
- **Password strength requirements** (configurable)
- **Name length validation** (1-255 characters)
- **Token format verification** (URL-safe base64)

## Monitoring & Analytics

### Invitation Statistics
- **Total invitations sent** per tenant
- **Acceptance rate** tracking
- **Expired invitation count** for cleanup
- **User growth metrics** by invitation source

### Audit Trail
- **Complete invitation lifecycle** tracking
- **Admin action logging** for compliance
- **Email delivery status** tracking
- **User onboarding metrics** for optimization

## Future Enhancements

### Planned Features
- **Bulk invitation import** via CSV upload
- **Custom invitation templates** per tenant
- **Advanced role permissions** with custom role creation
- **Integration webhooks** for external systems
- **Invitation link customization** with tenant domains
- **Automated reminder scheduling** for pending invitations

### External Service Integration
- **SendGrid** for production email delivery
- **Slack notifications** for team invitation events
- **SCIM provisioning** for enterprise SSO
- **Analytics integration** with Mixpanel/Amplitude