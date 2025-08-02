# Guardflow Backend - Development Guide

## Repository Overview
FastAPI-based backend service for secure LLM API proxying with authentication, quota management, and misuse detection.

## Quick Reference
- **Main API Endpoint**: `/api/v1/chat/completions`
- **Admin Dashboard API**: `/api/v1/admin/*`
- **User Dashboard API**: `/api/v1/user/*`
- **Health Check**: `/health`
- **API Docs**: `/docs` (Swagger UI)

## Project Structure
```
guardflow-backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app entry point
│   ├── api/                 # API routes
│   │   ├── __init__.py
│   │   ├── deps.py          # Dependencies (auth, db)
│   │   └── v1/              # API version 1
│   │       ├── __init__.py
│   │       ├── auth.py      # Authentication routes
│   │       ├── proxy.py     # Main LLM proxy endpoint
│   │       ├── admin.py     # Admin dashboard API
│   │       └── users.py     # User dashboard API
│   ├── core/                # Core configuration
│   │   ├── __init__.py
│   │   ├── config.py        # Settings and environment
│   │   ├── security.py      # JWT, password hashing
│   │   └── logging.py       # Logging configuration
│   ├── models/              # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── log.py
│   │   └── user_task.py
│   ├── schemas/             # Pydantic models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── task.py
│   │   ├── proxy.py
│   │   └── response.py
│   ├── services/            # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── proxy_service.py
│   │   ├── quota_service.py
│   │   ├── scoring_service.py
│   │   └── openai_service.py
│   ├── tasks/               # Celery background tasks
│   │   ├── __init__.py
│   │   ├── celery_app.py
│   │   ├── logging_tasks.py
│   │   └── scoring_tasks.py
│   └── database.py          # Database connection
├── alembic/                 # Database migrations
├── tests/                   # Test suite
├── docs/                    # Documentation
│   ├── api/                 # API documentation
│   ├── database/            # DB schema and design
│   └── development/         # Development guides
├── requirements.txt
├── requirements-dev.txt
├── alembic.ini
├── pytest.ini
├── .env.example
└── README.md
```

## Development Commands
```bash
# Setup
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements-dev.txt

# Database
alembic upgrade head
alembic revision --autogenerate -m "description"

# Run
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Celery
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app flower  # monitoring UI

# Testing
pytest
pytest --cov=app tests/

# Linting
black app/ tests/
isort app/ tests/
flake8 app/ tests/
mypy app/
```

## Key Services

### ProxyService (`app/services/proxy_service.py`)
- Validates incoming requests
- Enriches prompts with intent classification
- Forwards to OpenAI API
- Processes responses and extracts intent

### ScoringService (`app/services/scoring_service.py`)
- Calculates deviation scores
- Triggers warnings/blocks
- Updates user behavior patterns

### QuotaService (`app/services/quota_service.py`)
- Tracks token usage
- Enforces daily/monthly limits
- Rate limiting logic

## API Authentication
All endpoints require JWT token in header:
```
Authorization: Bearer <jwt_token>
```

## Environment Variables
See `.env.example` for all required configuration.

## Database Models Reference
See `docs/database/` for complete schema documentation.

## Development Progress
Track development status in `docs/development/progress.md`