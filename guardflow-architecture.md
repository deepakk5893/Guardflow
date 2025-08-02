# Guardflow Architecture Diagram

```
                          ┌────────────────────────────┐
                          │     Client (Freelancer)    │
                          │    → Postman / Web App     │
                          └────────────┬───────────────┘
                                       │ HTTP Request + Token
                                       ▼
                         ┌────────────────────────────┐
                         │     API Proxy Gateway       │  ← ENTRY POINT
                         ├────────────────────────────┤
                         │ - JWT Token Validation      │
                         │ - Rate Limiting             │
                         │ - Quota Check               │
                         │ - Task Scope Validation     │
                         │ - Request Enrichment        │
                         └────────┬─────────┬──────────┘
                                  │         │
                                  │         ▼
                                  │   ┌─────────────────────────────┐
                                  │   │ OpenAI API (ChatGPT, etc.)  │
                                  │   │ + Intent Classification      │
                                  │   └─────────┬───────────────────┘
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
             │                Database Layer                │
             ├──────────────────────────────────────────────┤
             │ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ │
             │ │   Users     │ │    Logs     │ │  Tasks   │ │
             │ │ - Token     │ │ - Prompts   │ │ - TaskID │ │
             │ │ - Quotas    │ │ - Intent    │ │ - Scope  │ │
             │ │ - Scores    │ │ - Timestamp │ │ - Limits │ │
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

### 1. API Proxy Gateway
- **Authentication**: JWT token validation
- **Authorization**: Task scope checking
- **Rate Limiting**: Per-user request limits
- **Quota Management**: Daily/monthly token tracking
- **Request Enrichment**: Adding intent classification prompts

### 2. Async Processing Layer
- **Logging Service**: Non-blocking request/response storage
- **Scoring Engine**: Real-time deviation calculation
- **Alert System**: Automatic user blocking/warning

### 3. Database Layer
- **Users Table**: Tokens, quotas, scores, permissions
- **Logs Table**: All requests, responses, intent classifications
- **Tasks Table**: Project definitions, allowed scopes

### 4. Dashboard Layer
- **Admin Interface**: Complete system oversight
- **User Interface**: Self-service usage monitoring

## Enhanced Data Flow

1. **Request Validation** → Token + Quota + Task scope
2. **Cache Check** → User permissions (Redis)
3. **Request Enrichment** → Add intent classification prompt
4. **OpenAI Forward** → With timeout/retry logic
5. **Response Processing** → Parse answer + intent
6. **Async Logging** → Store all metadata
7. **Scoring Update** → Calculate deviation score
8. **Auto-moderation** → Block/warn if threshold exceeded
9. **Response Return** → To user with any warnings