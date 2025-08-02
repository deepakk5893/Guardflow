# Guardflow 🛡️

A secure API proxy service for controlled LLM access with built-in abuse prevention and monitoring.

## Features

- 🔐 **Secure Token-Based Access** - JWT authentication with scoped permissions
- 📊 **Usage Quotas & Rate Limiting** - Daily/monthly limits per user
- 🎯 **Intent Classification** - Automatic prompt categorization and monitoring
- 🚨 **Misuse Detection** - Behavioral scoring and automatic blocking
- 📈 **Admin Dashboard** - Complete usage analytics and user management
- 👤 **User Dashboard** - Self-service usage tracking

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repo-url>
   cd guardflow
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Run Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

4. **Run Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## API Usage

```bash
# Make a request through the proxy
curl -X POST http://localhost:8000/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "coding-task-1",
    "messages": [{"role": "user", "content": "Help me debug this Python function"}]
  }'
```

## Documentation

- **API Docs**: http://localhost:8000/docs (when running)
- **Architecture**: See `guardflow-architecture.md`
- **Development**: See `CLAUDE.md`

## License

MIT