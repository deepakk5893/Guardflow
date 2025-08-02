import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  navItems: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ navItems }) => {
  return (
    <div id="sidebar" className="bg-white w-64 shadow-sm border-r border-gray-200">
      <div id="sidebar-header" className="p-6 border-b border-gray-200">
        <div id="sidebar-logo" className="flex items-center">
          <div id="logo-icon" className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <span className="ml-3 text-xl font-semibold text-gray-900">Guardflow</span>
        </div>
      </div>
      
      <nav id="sidebar-nav" className="mt-6">
        <div id="nav-links" className="px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin' || item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};