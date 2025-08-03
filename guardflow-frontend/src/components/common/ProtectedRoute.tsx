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
    // Save the attempted location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For admin routes, check if user is admin (using email for now)
  if (requireAdmin && user?.email !== import.meta.env.VITE_ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  return <div id="protected-route-content">{children}</div>;
};