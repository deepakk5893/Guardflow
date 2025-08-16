import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/auth/Login';
import { InvitationAcceptance } from './pages/auth/InvitationAcceptance';
import { AdminLayout } from './components/common/AdminLayout';
import { UserLayout } from './components/common/UserLayout';
import { Chat } from './pages/chat/Chat';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import './styles/dashboard.css';

// Component to handle default route redirect
const DefaultRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (isAuthenticated && user) {
    const isAdmin = user.role?.name === 'admin' || user.role?.name === 'super_admin';
    const targetRoute = isAdmin ? '/admin' : '/dashboard';
    return <Navigate to={targetRoute} replace />;
  }
  
  return <Navigate to="/login" replace />;
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <div id="app-root">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <div id="app-container" className="min-h-screen bg-gray-50">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/invitation/:token" element={<InvitationAcceptance />} />
                
                {/* Admin Routes */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                />
                
                {/* User Routes */}
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <UserLayout />
                    </ProtectedRoute>
                  }
                />
                
                {/* Chat Route */}
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />
                
                {/* Default redirect */}
                <Route path="/" element={<DefaultRedirect />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;