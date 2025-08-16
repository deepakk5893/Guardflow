# Guardflow Multi-Tenant SaaS Architecture

```
                    ┌─────────────────────────────────────┐
                    │   Multi-Tenant Client Access       │
                    │  → Company A Users (Org Dashboard) │
                    │  → Company B Users (Org Dashboard) │  
                    │  → Company C Users (Org Dashboard) │
                    └─────────────────┬───────────────────┘
                                      │ HTTP Request + JWT Token
                                      ▼
                    ┌─────────────────────────────────────┐
                    │      Multi-Tenant API Gateway      │  ← ENTRY POINT
                    ├─────────────────────────────────────┤
                    │ - JWT Token Validation + Tenant ID │
                    │ - Role-Based Access Control (RBAC) │
                    │ - Subscription Plan Validation     │
                    │ - User Limit Enforcement           │
                    │ - Rate Limiting (per tenant)       │
                    │ - Quota Check (tenant-scoped)      │
                    │ - Task Scope Validation            │
                    │ - Request Enrichment               │
                    └─────────┬─────────┬─────────────────┘
                              │         │
                              │         ▼
                              │   ┌───────────────────────────────┐
                              │   │    Multi-LLM Provider Router │
                              │   ├───────────────────────────────┤
                              │   │ - OpenAI API (GPT models)     │
                              │   │ - Anthropic API (Claude)      │
                              │   │ - Custom Provider Support     │
                              │   │ + Intent Classification       │
                              │   └─────────┬─────────────────────┘
                              │             │
                              │             ▼ Response + Intent
                              ▼
              ┌────────────────────────────────────────────────────┐
              │              Async Processing Layer                │
              ├────────────────────────────────────────────────────┤
              │ ┌─────────────────┐  ┌──────────────────────────┐  │
              │ │ Logging Service │  │   Scoring Engine         │  │
              │ │ - Store request │  │ - Calculate deviation    │  │
              │ │ - Store response│  │ - Update user score      │  │
              │ │ - Update quotas │  │ - Trigger alerts         │  │
              │ └─────────────────┘  └──────────────────────────┘  │
              └────────────┬─────────────────────────────────────┘
                           │
                           ▼
             ┌──────────────────────────────────────────────┐
             │            Multi-Tenant Database Layer       │
             ├──────────────────────────────────────────────┤
             │ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
             │ │  Tenants    │ │    Plans    │ │  Roles   │ │
             │ │ - CompanyID │ │ - Pricing   │ │ - RBAC   │ │
             │ │ - Billing   │ │ - Limits    │ │ - Perms  │ │
             │ │ - Trial     │ │ - Features  │ │ - Scope  │ │
             │ └─────────────┘ └─────────────┘ └──────────┘ │
             │ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
             │ │ Invitations │ │LLM Providers│ │  Users   │ │
             │ │ - Tokens    │ │ - Multi-LLM │ │ + TenantID│ │
             │ │ - Expiry    │ │ - API Keys  │ │ - Tokens │ │
             │ │ - Status    │ │ - Models    │ │ - Quotas │ │
             │ └─────────────┘ └─────────────┘ └──────────┘ │
             │ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
             │ │    Logs     │ │   Tasks     │ │Email Queue│ │
             │ │ + TenantID  │ │ + TenantID  │ │ - Templates│ │
             │ │ - Prompts   │ │ - TaskID    │ │ - Status  │ │
             │ │ - Intent    │ │ - Scope     │ │ - Retry   │ │
             │ └─────────────┘ └─────────────┘ └──────────┘ │
             └──────────────┬───────────────────────────────┘
                            │
                            ▼
             ┌──────────────────────────────────────────────┐
             │            Frontend Dashboards               │
             ├──────────────────────────────────────────────┤
             │ ┌─────────────────┐ ┌──────────────────────┐ │
             │ │ Admin Dashboard │ │  User Dashboard      │ │
             │ │ - User mgmt     │ │ - Usage stats        │ │
             │ │ - Usage logs    │ │ - Quota remaining    │ │
             │ │ - Alert mgmt    │ │ - Warnings/status    │ │
             │ │ - Task config   │ │ - Task assignments   │ │
             │ └─────────────────┘ └──────────────────────┘ │
             └──────────────────────────────────────────────┘
```

## Key Components

### 1. Multi-Tenant API Gateway
- **Tenant Validation**: JWT token validation with tenant context
- **Role-Based Authorization**: Super admin, admin, user permissions
- **Subscription Enforcement**: Plan limits and user count validation
- **Rate Limiting**: Per-tenant request limits with plan-based quotas
- **Quota Management**: Daily/monthly token tracking per tenant
- **Request Enrichment**: Adding intent classification prompts
- **Multi-LLM Routing**: Provider selection based on tenant configuration

### 2. User Invitation System
- **Secure Token Generation**: 7-day expiration invitation tokens
- **Email Service**: Beautiful HTML templates ready for external providers
- **Role Assignment**: Automatic role assignment during invitation acceptance
- **User Onboarding**: Seamless account creation and team integration

### 3. Subscription Management
- **Plan Enforcement**: Basic (5 users), Pro (20 users), Enterprise (100 users)
- **Billing Integration**: Ready for Stripe/payment provider integration
- **Trial Management**: 14-day free trial with automatic conversion
- **Usage Tracking**: Tenant-scoped analytics and reporting

### 4. Async Processing Layer
- **Logging Service**: Non-blocking request/response storage with tenant isolation
- **Scoring Engine**: Real-time deviation calculation per tenant
- **Alert System**: Automatic user blocking/warning within tenant scope
- **Email Queue**: Professional invitation and notification system

### 5. Multi-Tenant Database Layer
- **Core Tables**: Tenants, plans, roles with complete data isolation
- **User Management**: Users, invitations with tenant-scoped relationships  
- **Provider Support**: LLM providers configuration per tenant
- **Audit Trail**: Logs, tasks with tenant-level access control

### 6. Dashboard Layer
- **Multi-Tenant Admin Interface**: Organization-level management
- **User Interface**: Tenant-scoped self-service monitoring
- **Invitation Management**: Team member onboarding interface

## Enhanced Multi-Tenant Data Flow

1. **Tenant Validation** → JWT token extraction + tenant context
2. **Role-Based Authorization** → Check user permissions within tenant
3. **Subscription Validation** → Verify tenant plan status and user limits
4. **Request Validation** → Quota + rate limits + task scope (tenant-scoped)
5. **Cache Check** → Tenant permissions and provider config (Redis)
6. **Provider Selection** → Route to configured LLM provider for tenant
7. **Request Enrichment** → Add intent classification prompt
8. **LLM Forward** → With timeout/retry logic to selected provider
9. **Response Processing** → Parse answer + intent classification
10. **Async Logging** → Store all metadata with tenant isolation
11. **Scoring Update** → Calculate deviation score within tenant context
12. **Auto-moderation** → Block/warn if threshold exceeded (tenant-scoped)
13. **Email Notifications** → Send alerts using tenant-branded templates
14. **Response Return** → To user with any warnings and tenant context

### Multi-Tenant Security Flow

- **Data Isolation**: All database queries include tenant_id filter
- **Role Enforcement**: API endpoints validate user roles within tenant
- **Plan Limits**: Real-time validation of user count and feature access
- **Audit Trail**: Complete tenant-scoped logging for compliance