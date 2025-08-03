import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { UserDashboard } from '../../pages/user/Dashboard';
import { UserUsage } from '../../pages/user/Usage';
import { UserHistory } from '../../pages/user/History';
import { UserProfile } from '../../pages/user/Profile';
import { UserTasks } from '../../pages/user/Tasks';

export const UserLayout: React.FC = () => {
  const userNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/dashboard/usage', label: 'Usage', icon: '📈' },
    { path: '/dashboard/history', label: 'History', icon: '📝' },
    { path: '/dashboard/tasks', label: 'My Tasks', icon: '📋' },
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
            <Route path="/history" element={<UserHistory />} />
            <Route path="/tasks" element={<UserTasks />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};