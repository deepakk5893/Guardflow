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

### Core Data Flow (Multi-Tenant SaaS)
```
User Request → Tenant Validation → JWT Auth → API Proxy → LLM Provider → Response + Logging → Scoring → Dashboard
```

### Key Components
1. **Multi-Tenant Architecture** - Complete data isolation per organization
2. **JWT Authentication** - Token-based access with tenant context
3. **Role-Based Access Control** - Super admin, admin, and user roles
4. **Subscription Management** - Plan-based billing with user limits
5. **User Invitation System** - Secure token-based team member onboarding
6. **Quota Management** - Daily/monthly usage limits per tenant
7. **Intent Classification** - LLM-powered prompt categorization
8. **Deviation Scoring** - Behavioral anomaly detection
9. **Admin Dashboard** - Multi-tenant user management and analytics
10. **User Dashboard** - Self-service usage tracking

### Database Schema (Quick Reference)
**Core Multi-Tenant Tables:**
- **tenants**: Organizations with subscription and plan info
- **plans**: Subscription tiers (Basic/Pro/Enterprise) with user limits
- **roles**: Role definitions (super_admin, admin, user)
- **user_invitations**: Secure invitation system with token-based acceptance

**User & Access Management:**
- **users**: Authentication, quotas, behavior scores (tenant-scoped)
- **tasks**: Project definitions and allowed intents (tenant-scoped)
- **user_tasks**: User-to-task assignments (tenant-scoped)
- **logs**: Complete request/response audit trail (tenant-scoped)

**LLM Integration:**
- **llm_providers**: Multi-provider support per tenant (OpenAI, Anthropic, etc.)

## Development Progress Tracking

### Current Status: Multi-Tenant SaaS Backend Complete ✅
- [x] Architecture designed and implemented
- [x] Multi-tenant database schema finalized and migrated
- [x] Repository structure created
- [x] Documentation framework established
- [x] **FastAPI project setup** ✅
- [x] **Multi-tenant database models and migrations** ✅
- [x] **JWT authentication system with tenant context** ✅
- [x] **Role-based access control (RBAC)** ✅
- [x] **User invitation system with secure tokens** ✅
- [x] **Subscription plan management** ✅
- [x] **Email template system** ✅
- [x] **Multi-LLM provider support** ✅

### Current Phase: Frontend Integration & Testing
**Priority Order:**
1. Build user invitation acceptance flow (frontend)
2. Create tenant signup and payment integration
3. Implement admin dashboard for multi-tenant management
4. Build user dashboard with tenant-scoped data
5. Integrate OpenAI proxy service with tenant validation
6. Implement scoring and monitoring with tenant isolation

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