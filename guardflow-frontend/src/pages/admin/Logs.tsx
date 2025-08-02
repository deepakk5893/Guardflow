import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogsService, type LogsFilters } from '../../services/logs';
import { UserService } from '../../services/users';
import { LogsTable } from '../../components/tables/LogsTable';
import { LogDetailsModal } from '../../components/modals/LogDetailsModal';
import type { Log } from '../../types/api';
import type { User } from '../../types/auth';
import '../../styles/logs.css';

export const Logs: React.FC = () => {
  const [filters, setFilters] = useState<LogsFilters>({});
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch logs
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['logs', filters],
    queryFn: () => LogsService.getLogs(filters, 100, 0),
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  // Fetch users for filter dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: UserService.getUsers,
  });

  const handleFilterChange = (newFilters: Partial<LogsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleViewDetails = (log: Log) => {
    setSelectedLog(log);
    setIsDetailsModalOpen(true);
  };

  const handleExportLogs = async () => {
    try {
      const csvData = await LogsService.exportLogs(filters);
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guardflow-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Get unique intents from logs for filter dropdown
  const uniqueIntents = Array.from(new Set(logs.map(log => log.intent_classification).filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(logs.map(log => log.status)));

  if (error) {
    return (
      <div id="logs-error" className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading logs: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div id="admin-logs-page" className="p-6">
      {/* Page Header */}
      <div id="logs-header" className="mb-6">
        <div id="logs-title-section" className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Logs</h1>
            <p className="text-gray-600">Monitor API requests, responses, and system activity</p>
          </div>
          <div className="flex space-x-3">
            <button
              id="refresh-logs-btn"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['logs'] })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🔄 Refresh
            </button>
            <button
              id="export-logs-btn"
              onClick={handleExportLogs}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div id="logs-filters" className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* User Filter */}
            <div id="user-filter" className="flex-1 min-w-48">
              <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <select
                id="user-select"
                value={filters.user_id || ''}
                onChange={(e) => handleFilterChange({ user_id: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div id="status-filter" className="flex-1 min-w-32">
              <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-select"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Intent Filter */}
            <div id="intent-filter" className="flex-1 min-w-40">
              <label htmlFor="intent-select" className="block text-sm font-medium text-gray-700 mb-1">
                Intent
              </label>
              <select
                id="intent-select"
                value={filters.intent_classification || ''}
                onChange={(e) => handleFilterChange({ intent_classification: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Intents</option>
                {uniqueIntents.map(intent => (
                  <option key={intent} value={intent}>
                    {intent}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div id="search-filter" className="flex-1 min-w-64">
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                Search Prompts
              </label>
              <input
                type="text"
                id="search-input"
                placeholder="Search in prompts and responses..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange({ search: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date Range */}
            <div id="date-filters" className="flex gap-2">
              <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                  From
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={filters.start_date || ''}
                  onChange={(e) => handleFilterChange({ start_date: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  To
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={filters.end_date || ''}
                  onChange={(e) => handleFilterChange({ end_date: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                id="clear-filters-btn"
                onClick={handleClearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div id="logs-stats" className="flex items-center space-x-6 text-sm text-gray-600 mt-4">
          <span>Total Logs: {logs.length}</span>
          <span>Success: {logs.filter(l => l.status === 'success').length}</span>
          <span>Errors: {logs.filter(l => l.status === 'error').length}</span>
          <span>Blocked: {logs.filter(l => l.status === 'blocked').length}</span>
          {isLoading && <span className="text-blue-600">🔄 Loading...</span>}
        </div>
      </div>

      {/* Logs Table */}
      <div id="logs-table-section" className="bg-white rounded-lg shadow-sm border border-gray-200">
        {logs.length === 0 && !isLoading ? (
          <div id="no-logs-found" className="text-center py-12">
            <p className="text-gray-500">No logs found matching your filters.</p>
          </div>
        ) : (
          <LogsTable
            logs={logs}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
          />
        )}
      </div>

      {/* Log Details Modal */}
      <LogDetailsModal
        log={selectedLog}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
};