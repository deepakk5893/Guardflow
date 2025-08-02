import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();

  return (
    <header id="app-header" className="bg-white shadow-sm border-b border-gray-200">
      <div id="header-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div id="header-content" className="flex justify-between items-center py-4">
          <div id="header-title">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          
          <div id="header-actions" className="flex items-center space-x-4">
            <div id="user-info" className="flex items-center space-x-3">
              <div id="user-avatar" className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              
              <div id="user-details" className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
              </div>
            </div>
            
            <button
              id="logout-button"
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};