# Database Schema Design

## Overview
PostgreSQL database with 4 core tables for user management, task assignment, and comprehensive logging.

## Tables

### users
Primary user management and quota tracking.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    
    -- Quotas and Limits
    daily_quota INTEGER DEFAULT 10000,
    monthly_quota INTEGER DEFAULT 300000,
    current_daily_usage INTEGER DEFAULT 0,
    current_monthly_usage INTEGER DEFAULT 0,
    
    -- Rate Limiting
    requests_per_hour INTEGER DEFAULT 100,
    
    -- Behavior Tracking
    deviation_score DECIMAL(5,2) DEFAULT 0.0,
    last_activity TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    blocked_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_token_hash ON users(token_hash);
CREATE INDEX idx_users_active ON users(is_active, is_blocked);
```

### tasks
Project definitions and allowed intent categories.

```sql
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Task Configuration
    allowed_intents JSONB DEFAULT '[]'::jsonb,  -- ["coding", "testing", "documentation"]
    task_scope TEXT,  -- Description of allowed work
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_active ON tasks(is_active);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
```

### user_tasks
Many-to-many relationship between users and assigned tasks.

```sql
CREATE TABLE user_tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Assignment Details
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_by INTEGER REFERENCES users(id),
    
    UNIQUE(user_id, task_id)
);

CREATE INDEX idx_user_tasks_user ON user_tasks(user_id, is_active);
CREATE INDEX idx_user_tasks_task ON user_tasks(task_id, is_active);
```

### logs
Comprehensive logging of all API interactions.

```sql
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    
    -- Request Context
    user_id INTEGER REFERENCES users(id),
    task_id INTEGER REFERENCES tasks(id),
    
    -- Request Data
    prompt TEXT NOT NULL,
    system_message TEXT,
    model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    
    -- Response Data
    response TEXT,
    intent_classification VARCHAR(100),
    confidence_score DECIMAL(3,2),
    
    -- Scoring
    deviation_score_delta DECIMAL(5,2) DEFAULT 0.0,
    user_score_before DECIMAL(5,2),
    user_score_after DECIMAL(5,2),
    
    -- Usage Metrics
    openai_tokens_used INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    response_time_ms INTEGER,
    
    -- Request Metadata
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(50),
    
    -- Status
    status VARCHAR(20) DEFAULT 'success',  -- success, blocked, error
    error_message TEXT,
    
    -- Timestamps
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_task_id ON logs(task_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp);
CREATE INDEX idx_logs_intent ON logs(intent_classification);
CREATE INDEX idx_logs_status ON logs(status);
CREATE INDEX idx_logs_user_timestamp ON logs(user_id, timestamp);
```

## Relationships
- `users` 1:N `user_tasks` N:1 `tasks`
- `users` 1:N `logs`
- `tasks` 1:N `logs`
- `users` 1:N `tasks` (created_by)

## Indexes Strategy
- Primary queries: user lookup, recent logs, task assignments
- Analytics queries: usage by time, intent distribution
- Admin queries: user management, suspicious activity

## Data Retention
- `logs`: Partition by month, retain 12 months
- `users`: Soft delete (is_active=false)
- `tasks`: Soft delete (is_active=false)

## Sample Data
```sql
-- Sample Admin User
INSERT INTO users (email, name, token_hash, daily_quota, monthly_quota) 
VALUES ('admin@company.com', 'Admin User', 'hashed_admin_token', 50000, 1000000);

-- Sample Task
INSERT INTO tasks (name, description, allowed_intents, created_by) 
VALUES (
    'Frontend Development',
    'React components and styling work',
    '["coding", "debugging", "testing", "documentation"]',
    1
);

-- Sample User Assignment
INSERT INTO user_tasks (user_id, task_id, assigned_by) 
VALUES (2, 1, 1);
```