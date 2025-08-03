import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div id="protected-route-loading" className="min-h-screen flex items-center justify-center">
        <div id="loading-spinner" className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login without saving location to avoid subdomain issues
    return <Navigate to="/login" replace />;
  }

  // For admin routes, check if user is admin (using email for now)
  if (requireAdmin) {
    const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL;
    console.log('Admin route check:', {
      email: user?.email,
      adminEmail: import.meta.env.VITE_ADMIN_EMAIL,
      isAdmin,
      requireAdmin
    });
    
    if (!isAdmin) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <div id="protected-route-content">{children}</div>;
};