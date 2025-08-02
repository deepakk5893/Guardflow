import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

// Placeholder user pages (will be created next)
const UserDashboard = () => (
  <div id="user-dashboard-placeholder" className="p-6">
    <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
    <p className="text-gray-600">Welcome to your dashboard</p>
  </div>
);

const UserUsage = () => (
  <div id="user-usage-placeholder" className="p-6">
    <h1 className="text-2xl font-bold text-gray-900">Usage History</h1>
    <p className="text-gray-600">View your API usage history</p>
  </div>
);

const UserProfile = () => (
  <div id="user-profile-placeholder" className="p-6">
    <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
    <p className="text-gray-600">Manage your profile settings</p>
  </div>
);

export const UserLayout: React.FC = () => {
  const userNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/dashboard/usage', label: 'Usage', icon: '📊' },
    { path: '/dashboard/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div id="user-layout" className="flex h-screen bg-gray-100">
      <Sidebar navItems={userNavItems} />
      
      <div id="user-main" className="flex-1 flex flex-col overflow-hidden">
        <Header title="User Dashboard" />
        
        <main id="user-content" className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <Routes>
            <Route path="/" element={<UserDashboard />} />
            <Route path="/usage" element={<UserUsage />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};