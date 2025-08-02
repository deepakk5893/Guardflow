# Guardflow - Secure LLM API Proxy

## Project Overview
Guardflow is a secure API proxy service for controlled LLM access for freelancers/remote workers. It prevents abuse through authentication, quotas, intent monitoring, and automatic misuse detection.

## Architecture
- **Backend**: Python FastAPI + PostgreSQL + Redis + Celery
- **Frontend**: React + TypeScript + Tailwind CSS
- **Deployment**: Docker containers

## Core Features
1. **API Proxy Gateway** - Validates tokens, quotas, forwards to OpenAI
2. **Intent Classification** - Embeds intent detection in OpenAI requests
3. **Deviation Scoring** - Tracks user behavior patterns
4. **Admin Dashboard** - User management, usage logs, alerts
5. **User Dashboard** - Usage stats, quota tracking

## Tech Stack
### Backend (Python)
- FastAPI - Async API framework
- SQLAlchemy + Alembic - ORM and migrations
- Redis - Caching and rate limiting
- PostgreSQL - Primary database
- Celery - Async task processing
- OpenAI SDK - LLM integration

### Frontend (React)
- Vite + React + TypeScript
- Tailwind CSS - Styling
- React Query - API state management
- Chart.js - Analytics visualization

## Project Structure
```
guardflow/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routes
│   │   ├── core/         # Config, auth, deps
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── tasks/        # Celery tasks
│   ├── alembic/          # DB migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API calls
│   │   └── types/        # TypeScript types
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Database Schema
### Users Table
- id, email, name, token_hash
- daily_quota, monthly_quota, current_usage
- deviation_score, is_active, is_blocked
- assigned_tasks[], created_at, updated_at

### Tasks Table
- id, name, description, allowed_intents[]
- created_by, is_active

### Logs Table
- id, user_id, task_id, prompt, response
- intent_classification, deviation_score_delta
- timestamp, openai_tokens_used

### User_Tasks Table
- user_id, task_id, assigned_at, is_active

## Development Commands
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

# Database
docker-compose up -d postgres redis
alembic upgrade head

# Celery
celery -A app.tasks worker --loglevel=info
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `OPENAI_API_KEY` - OpenAI API key
- `JWT_SECRET_KEY` - JWT signing secret
- `ADMIN_EMAIL` - Admin user email