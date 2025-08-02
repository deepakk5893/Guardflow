# Guardflow - Master Development Overview

## Project Structure
```
Guardflow/
├── guardflow-backend/          # FastAPI backend service
├── guardflow-frontend/         # React admin/user dashboards
├── guardflow-architecture.md   # System architecture
├── DEVELOPMENT_OVERVIEW.md     # This file
└── docker-compose.yml          # Development databases
```

## Repository Access Guide

### Backend Repository: `guardflow-backend/`
**Quick Access:**
- Main docs: `guardflow-backend/CLAUDE.md`
- Database schema: `guardflow-backend/docs/database/schema.md`
- Development progress: `guardflow-backend/docs/development/progress.md`
- API structure: `guardflow-backend/docs/api/`

**Key Files to Reference:**
- **Models**: Database table definitions and relationships
- **Services**: Core business logic (proxy, scoring, quota)
- **API Routes**: FastAPI endpoint implementations
- **Schemas**: Pydantic models for request/response validation

### Frontend Repository: `guardflow-frontend/`
**Quick Access:**
- Main docs: `guardflow-frontend/CLAUDE.md`
- Component docs: `guardflow-frontend/docs/components/`
- Development progress: `guardflow-frontend/docs/development/progress.md`
- API integration: `guardflow-frontend/docs/api/`

**Key Files to Reference:**
- **Components**: Reusable UI components
- **Pages**: Admin and user dashboard pages
- **Services**: API integration layer
- **Types**: TypeScript definitions

## System Architecture Summary

### Core Data Flow
```
User Request → API Proxy → Validation → OpenAI + Intent → Response + Logging → Scoring → Dashboard
```

### Key Components
1. **JWT Authentication** - Token-based user access
2. **Quota Management** - Daily/monthly usage limits
3. **Intent Classification** - LLM-powered prompt categorization
4. **Deviation Scoring** - Behavioral anomaly detection
5. **Admin Dashboard** - User management and analytics
6. **User Dashboard** - Self-service usage tracking

### Database Schema (Quick Reference)
- **users**: Authentication, quotas, behavior scores
- **tasks**: Project definitions and allowed intents
- **user_tasks**: User-to-task assignments
- **logs**: Complete request/response audit trail

## Development Progress Tracking

### Current Status: Planning Complete ✅
- [x] Architecture designed
- [x] Database schema finalized
- [x] Repository structure created
- [x] Documentation framework established

### Next Phase: Backend Implementation
**Priority Order:**
1. FastAPI project setup
2. Database models and migrations
3. Authentication system
4. OpenAI proxy service
5. Scoring and monitoring

### Parallel Development
- Backend can be developed independently
- Frontend can start with mock data
- Integration testing after both are functional

## Key Technical Decisions

### Backend Stack
- **FastAPI**: Async performance, auto-docs, type hints
- **PostgreSQL**: Reliability, JSON support, analytics
- **Redis**: Caching, rate limiting, session storage
- **Celery**: Background processing for logging/scoring
- **SQLAlchemy**: ORM with Alembic migrations

### Frontend Stack
- **React + TypeScript**: Type safety, component reusability
- **Vite**: Fast development and building
- **Tailwind CSS**: Utility-first styling
- **React Query**: Server state management
- **React Router**: Client-side routing

## Security Considerations
- JWT token validation on all API endpoints
- Rate limiting to prevent abuse
- Input validation and sanitization
- Secure credential storage
- Audit logging for all actions

## Scalability Considerations
- Async processing for non-blocking operations
- Redis caching for frequently accessed data
- Database indexing for query performance
- Horizontal scaling capability
- Microservice-ready architecture

## Development Workflow
1. **Backend First**: Core API and business logic
2. **Frontend Integration**: Dashboard development
3. **Testing**: Unit and integration tests
4. **Deployment**: Docker containerization
5. **Monitoring**: Logging and analytics

## Quick Reference Commands

### Backend Development
```bash
cd guardflow-backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### Frontend Development
```bash
cd guardflow-frontend
npm run dev
```

### Database Management
```bash
docker-compose up -d  # Start PostgreSQL + Redis
alembic upgrade head  # Apply migrations
```

## Documentation Update Protocol
When making significant changes:
1. Update relevant CLAUDE.md file
2. Update progress.md files
3. Update this master overview if architecture changes
4. Keep database schema docs synchronized with actual models

This structure ensures you can always quickly reference:
- Overall system design (this file)
- Repository-specific implementation details (CLAUDE.md files)
- Current development status (progress.md files)
- Technical specifications (docs/ folders)