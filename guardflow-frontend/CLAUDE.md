# Guardflow Frontend - Development Guide

## Repository Overview
React-based dashboard application for admin user management and user self-service portal.

## Quick Reference
- **Admin Dashboard**: `/admin/*` - User management, analytics, system monitoring
- **User Dashboard**: `/dashboard/*` - Usage stats, quota tracking, warnings
- **Public Routes**: `/login`, `/` - Authentication and landing
- **API Base URL**: `http://localhost:8000/api/v1` (configurable)

## Project Structure
```
guardflow-frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/          # Generic components
│   │   │   ├── Layout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── forms/           # Form components
│   │   │   ├── LoginForm.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── TaskForm.tsx
│   │   ├── charts/          # Analytics charts
│   │   │   ├── UsageChart.tsx
│   │   │   ├── IntentChart.tsx
│   │   │   └── DeviationChart.tsx
│   │   └── tables/          # Data tables
│   │       ├── UsersTable.tsx
│   │       ├── LogsTable.tsx
│   │       └── TasksTable.tsx
│   ├── pages/               # Page components
│   │   ├── admin/           # Admin dashboard pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── Analytics.tsx
│   │   │   └── Logs.tsx
│   │   ├── user/            # User dashboard pages
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Usage.tsx
│   │   │   └── Profile.tsx
│   │   ├── auth/            # Authentication pages
│   │   │   ├── Login.tsx
│   │   │   └── Logout.tsx
│   │   └── Home.tsx         # Landing page
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useUsers.ts
│   │   ├── useLogs.ts
│   │   └── useWebSocket.ts
│   ├── services/            # API service functions
│   │   ├── api.ts           # Base API configuration
│   │   ├── auth.ts          # Authentication API
│   │   ├── users.ts         # User management API
│   │   ├── tasks.ts         # Task management API
│   │   ├── logs.ts          # Logs and analytics API
│   │   └── websocket.ts     # Real-time updates
│   ├── types/               # TypeScript type definitions
│   │   ├── auth.ts
│   │   ├── user.ts
│   │   ├── task.ts
│   │   ├── log.ts
│   │   └── api.ts
│   ├── utils/               # Utility functions
│   │   ├── formatters.ts    # Data formatting
│   │   ├── validators.ts    # Form validation
│   │   ├── constants.ts     # App constants
│   │   └── helpers.ts       # Helper functions
│   ├── context/             # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── styles/              # Global styles
│   │   ├── globals.css
│   │   └── tailwind.css
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # App entry point
│   └── router.tsx           # Route definitions
├── docs/                    # Documentation
│   ├── components/          # Component documentation
│   ├── api/                 # API integration docs
│   └── development/         # Development guides
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── .env.example
└── README.md
```

## Development Commands
```bash
# Setup
npm install

# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # ESLint
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript checking
npm run format       # Prettier formatting

# Testing
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Key Features

### Admin Dashboard
- **User Management**: Create, edit, block/unblock users
- **Task Management**: Define tasks and assign to users
- **Analytics**: Usage patterns, intent distribution, anomaly detection
- **Logs**: Real-time request logs with filtering
- **Alerts**: System notifications and user warnings

### User Dashboard
- **Usage Overview**: Daily/monthly quota consumption
- **Request History**: Personal API usage logs
- **Warnings**: Deviation score and any blocks
- **Profile**: Basic account information

## State Management
- **React Query**: Server state management and caching
- **Context API**: Global app state (auth, theme)
- **Local State**: Component-specific state with useState/useReducer

## Authentication Flow
1. User submits credentials
2. Frontend calls `/api/v1/auth/login`
3. Backend returns JWT token
4. Token stored in localStorage
5. Token included in all API requests
6. Auto-logout on token expiration

## API Integration
Base API client with automatic token handling:
```typescript
// Example usage
const users = await userService.getUsers();
const logs = await logService.getLogs({ userId: 123 });
```

## Real-time Updates
WebSocket connection for live updates:
- New user requests
- Quota changes
- System alerts
- User status changes

## Environment Variables
```
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_APP_NAME=Guardflow
VITE_ENABLE_ANALYTICS=true
```

## Design System
- **Framework**: Tailwind CSS
- **Components**: Custom components following design system
- **Icons**: Heroicons or Lucide React
- **Charts**: Chart.js or Recharts
- **Tables**: TanStack Table

## Development Progress
Track frontend development in `docs/development/progress.md`