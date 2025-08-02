# Guardflow Backend

FastAPI-based backend service for secure LLM API proxying with authentication, quota management, and misuse detection.

## Features

- 🔐 **JWT Authentication** - Secure admin access
- 🎫 **API Token System** - Individual user tokens with permissions
- 📊 **Usage Quotas** - Daily/monthly limits per user
- 🎯 **Intent Classification** - Automatic prompt categorization
- 🚨 **Misuse Detection** - Behavioral scoring and auto-blocking
- 📈 **Admin Dashboard API** - Complete user and usage management
- 🗄️ **PostgreSQL + Redis** - Robust data storage and caching

## Quick Start

### Prerequisites
- Python 3.8+
- PostgreSQL
- Redis

### Setup

1. **Clone and navigate to backend**
   ```bash
   cd guardflow-backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements-dev.txt
   ```

4. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start databases** (from project root)
   ```bash
   docker-compose up -d postgres redis
   ```

6. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

7. **Start the server**
   ```bash
   uvicorn app.main:app --reload
   ```

The API will be available at:
- **Swagger UI**: http://localhost:8000/api/v1/docs
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Admin login

### Proxy (User API Token Required)
- `POST /api/v1/chat/completions` - Main LLM proxy endpoint

### Admin (JWT Required)
- `GET /api/v1/admin/users` - List users
- `POST /api/v1/admin/users` - Create user
- `GET /api/v1/admin/logs` - View system logs
- `GET /api/v1/admin/analytics/usage` - Usage analytics

### User Dashboard (API Token Required)
- `GET /api/v1/user/profile` - User profile and stats
- `GET /api/v1/user/usage` - Usage history
- `GET /api/v1/user/quota` - Quota status

## Environment Variables

Key configuration (see `.env.example` for all options):

```bash
DATABASE_URL=postgresql://guardflow:password@localhost:5432/guardflow
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET_KEY=your_super_secret_jwt_key
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=admin123
```

## Development

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

### Testing
```bash
pytest
pytest --cov=app tests/  # With coverage
```

### Code Quality
```bash
black app/ tests/        # Format code
isort app/ tests/        # Sort imports
flake8 app/ tests/       # Lint
mypy app/               # Type checking
```

## Usage Example

### Admin Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@yourcompany.com&password=admin123"
```

### Create User (Admin)
```bash
curl -X POST "http://localhost:8000/api/v1/admin/users" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "daily_quota": 10000,
    "monthly_quota": 300000
  }'
```

### Use Proxy (User)
```bash
curl -X POST "http://localhost:8000/api/v1/chat/completions" \
  -H "Authorization: Bearer USER_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": 1,
    "messages": [{"role": "user", "content": "Help me debug this Python function"}],
    "model": "gpt-3.5-turbo"
  }'
```

## Architecture

- **FastAPI** - Async web framework
- **SQLAlchemy** - ORM with Alembic migrations
- **PostgreSQL** - Primary database
- **Redis** - Caching and rate limiting
- **OpenAI SDK** - LLM integration
- **JWT** - Authentication tokens
- **Celery** - Background task processing (future)

## Security Features

- JWT token validation
- API token-based user access
- Rate limiting per user
- Quota enforcement
- Request/response logging
- Behavioral anomaly detection
- Automatic user blocking

## Monitoring

All requests are logged with:
- User identification
- Task context
- Intent classification
- Token usage
- Response times
- Deviation scores

Access logs via admin API or database directly for analysis.

## Production Deployment

1. Set `ENVIRONMENT=production` and `DEBUG=False`
2. Use proper PostgreSQL and Redis instances
3. Set strong `JWT_SECRET_KEY`
4. Configure proper CORS origins
5. Use HTTPS for all endpoints
6. Set up log monitoring and alerts

## Documentation

- **API Reference**: See `/docs` endpoint when running
- **Database Schema**: `docs/database/schema.md`
- **Development Guide**: `CLAUDE.md`