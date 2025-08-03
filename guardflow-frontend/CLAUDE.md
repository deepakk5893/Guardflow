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

### Completed Features ✅

#### System Logs Viewer
- **Location**: `/admin/logs`
- **Components**: 
  - `src/pages/admin/Logs.tsx` - Main logs page with comprehensive filtering
  - `src/components/tables/LogsTable.tsx` - Expandable logs table with status indicators
  - `src/components/modals/LogDetailsModal.tsx` - Detailed log inspection modal
  - `src/services/logs.ts` - Logs API service with filtering and export
  - `src/styles/logs.css` - Professional custom styling
- **Features**:
  - Real-time updates (10-second refresh)
  - Advanced filtering (user, status, intent, date range, text search)
  - Expandable rows for quick view
  - Detailed modal with copy-to-clipboard
  - CSV export functionality
  - Intent classification display with confidence scores
  - Deviation scoring visualization
  - Token usage tracking

#### Analytics Dashboard
- **Location**: `/admin/analytics`
- **Components**:
  - `src/pages/admin/Analytics.tsx` - Main analytics dashboard
  - `src/components/charts/UsageChart.tsx` - Line charts for requests/tokens/users
  - `src/components/charts/IntentChart.tsx` - Pie chart for intent distribution
  - `src/components/charts/DeviationChart.tsx` - Dual-axis chart for deviation trends
  - `src/services/analytics.ts` - Analytics API service
  - `src/styles/analytics.css` - Dashboard styling
- **Features**:
  - Usage statistics overview cards
  - Daily usage trends (requests, tokens, users)
  - Intent classification distribution
  - Deviation score trends with high-risk user tracking
  - Top users by usage
  - System health monitoring
  - Date range filtering with preset ranges
  - Real-time data updates
  - Custom Canvas-based charts (no external dependencies)

#### Admin Tasks Management
- **Location**: `/admin/tasks`
- **Components**:
  - `src/pages/admin/Tasks.tsx` - Main tasks management page
  - `src/components/tables/TasksTable.tsx` - Tasks table with actions
  - `src/components/forms/TaskFormModal.tsx` - Create/edit task modal
  - `src/components/forms/TaskAssignmentModal.tsx` - Task assignment modal
  - `src/services/tasks.ts` - Tasks API service
  - `src/styles/tasks.css` - Tasks page styling
- **Features**:
  - CRUD operations for tasks
  - Task filtering by category, difficulty, status, and search
  - Task assignment to users with progress notes
  - Rich task details (category, difficulty, token limits, quotas)
  - Form validation and error handling
  - Task status toggling (active/inactive)
  - Usage statistics display
  - Comprehensive task assignment workflow

#### User Management (Previously Completed)
- **Location**: `/admin/users`
- **Components**: 
  - `src/pages/admin/Users.tsx` - User management page
  - `src/components/forms/CreateUserModal.tsx` - User creation/editing
  - `src/services/users.ts` - User API service
  - `src/styles/users.css` - Custom styling
- **Features**:
  - Create, edit, delete users
  - Block/unblock functionality
  - User statistics display
  - Form validation
  - Professional UI with custom CSS

### Technical Implementation Details

#### API Services Architecture
- **Base Service**: `src/services/api.ts` - Centralized API client with auth handling
- **Modular Services**: Separate service files for users, logs, analytics, tasks
- **Type Safety**: Full TypeScript interfaces for all API responses
- **Error Handling**: Consistent error handling across all services

#### UI/UX Design Approach
- **Custom CSS**: No Tailwind dependency - all styling in dedicated CSS files
- **Unique IDs**: Every div has unique ID for easy targeting
- **Responsive Design**: Mobile-first approach with proper breakpoints
- **Professional Styling**: Clean, modern interface with consistent color schemes
- **Loading States**: Proper loading indicators and disabled states
- **Error States**: User-friendly error messages and fallbacks

#### Chart Implementation
- **Canvas-based**: Custom chart implementation using HTML5 Canvas
- **No Dependencies**: No external charting libraries required
- **Performance**: Optimized for large datasets
- **Interactive**: Responsive and properly scaled charts
- **Multi-type**: Line charts, pie charts, and dual-axis charts

#### State Management
- **React Query**: Server state management with caching and real-time updates
- **Local State**: useState/useReducer for component-specific state
- **Form State**: Controlled components with validation
- **Modal State**: Proper modal lifecycle management

#### User Dashboard (Self-Service Portal)
- **Location**: `/dashboard/*`
- **Components**:
  - `src/pages/user/Dashboard.tsx` - Main user dashboard with overview
  - `src/pages/user/Usage.tsx` - User usage analytics and quota tracking
  - `src/pages/user/History.tsx` - Personal request history viewer
  - `src/components/common/UserLayout.tsx` - User dashboard layout and routing
  - `src/services/userDashboard.ts` - User-specific API service
  - `src/styles/userDashboard.css` - Dashboard styling
  - `src/styles/userUsage.css` - Usage analytics styling
  - `src/styles/userHistory.css` - History page styling
- **Features**:
  - **Real-time quota monitoring** with visual progress bars
  - **Alert system** for quota limits, deviation scores, and blocks
  - **Usage analytics** with time range selection (7d, 30d, 90d)
  - **Personal request history** with filtering and search
  - **Export functionality** for personal data in CSV format
  - **Task assignment tracking** and progress viewing
  - **Profile management** (limited user-editable fields)
  - **Visual charts** for usage trends using reusable chart components
  - **Responsive design** optimized for mobile and desktop

#### Password Management System
- **Admin User Creation**: Updated CreateUserModal to include password fields with validation
- **User Profile Management**: Complete profile page with password change functionality
- **API Integration**: 
  - `UserService.changeUserPassword()` - Admin can reset user passwords
  - `UserDashboardService.changePassword()` - Users can change their own passwords
- **Security Features**:
  - Password confirmation validation
  - Minimum 6 character requirement
  - Current password verification for changes
  - Form validation and error handling

### Next Steps
- Build remaining User Dashboard features (Tasks)
- Implement WebSocket real-time updates
- Add more advanced analytics features
- Create task assignment tracking views
- Implement notification system
- Backend API integration testing

Track frontend development in `docs/development/progress.md`