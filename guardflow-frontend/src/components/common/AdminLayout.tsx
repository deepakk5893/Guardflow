import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Users } from '../../pages/admin/Users';
import { Logs } from '../../pages/admin/Logs';
import { Analytics } from '../../pages/admin/Analytics';
import { Tasks } from '../../pages/admin/Tasks';

// Placeholder admin pages (will be created next)
const AdminDashboard = () => (
  <div id="admin-dashboard-placeholder" className="p-6">
    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
    <p className="text-gray-600">Welcome to the admin dashboard</p>
  </div>
);




export const AdminLayout: React.FC = () => {
  const adminNavItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/users', label: 'Users', icon: '👥' },
    { path: '/admin/tasks', label: 'Tasks', icon: '📋' },
    { path: '/admin/logs', label: 'Logs', icon: '📝' },
    { path: '/admin/analytics', label: 'Analytics', icon: '📈' },
  ];

  return (
    <div id="admin-layout" className="flex h-screen bg-gray-100">
      <Sidebar navItems={adminNavItems} />
      
      <div id="admin-main" className="flex-1 flex flex-col overflow-hidden">
        <Header title="Admin Dashboard" />
        
        <main id="admin-content" className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/analytics" element={<Analytics />} />
            {/* Removed catch-all route to prevent redirect on refresh */}
          </Routes>
        </main>
      </div>
    </div>
  );
};