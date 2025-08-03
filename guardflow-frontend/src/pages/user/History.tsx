import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserDashboardService, type UserLogFilters } from '../../services/userDashboard';
import '../../styles/userHistory.css';

export const UserHistory: React.FC = () => {
  const [filters, setFilters] = useState<UserLogFilters>({});
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch user logs
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['user-logs', filters],
    queryFn: () => UserDashboardService.getUserLogs(filters, 50, 0),
    refetchInterval: 30000,
  });

  // Fetch user tasks for filter dropdown
  const { data: userTasks = [] } = useQuery({
    queryKey: ['user-tasks'],
    queryFn: UserDashboardService.getUserTasks,
  });

  const handleFilterChange = (newFilters: Partial<UserLogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleViewDetails = (log: any) => {
    setSelectedLog(log);
    setIsDetailsModalOpen(true);
  };

  const handleExportLogs = async () => {
    try {
      const csvData = await UserDashboardService.exportUserLogs(filters);
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-requests-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'blocked': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIntentColor = (intent?: string) => {
    if (!intent) return 'bg-gray-100 text-gray-800';
    
    switch (intent.toLowerCase()) {
      case 'coding': return 'bg-blue-100 text-blue-800';
      case 'testing': return 'bg-purple-100 text-purple-800';
      case 'documentation': return 'bg-indigo-100 text-indigo-800';
      case 'research': return 'bg-teal-100 text-teal-800';
      case 'off_topic': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (error) {
    return (
      <div id="history-error" className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading request history: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div id="user-history-page" className="p-6">
      {/* Page Header */}
      <div id="history-header" className="mb-6">
        <div id="history-title-section" className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Request History</h1>
            <p className="text-gray-600">View your API request history and responses</p>
          </div>
          <div className="flex space-x-3">
            <button
              id="refresh-history-btn"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🔄 Refresh
            </button>
            <button
              id="export-history-btn"
              onClick={handleExportLogs}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div id="history-filters" className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Task Filter */}
            {userTasks.length > 0 && (
              <div id="task-filter" className="flex-1 min-w-48">
                <label htmlFor="task-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Task
                </label>
                <select
                  id="task-select"
                  value={filters.task_id || ''}
                  onChange={(e) => handleFilterChange({ task_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Tasks</option>
                  {userTasks.map(task => (
                    <option key={task.task_id} value={task.task_id}>
                      {task.task_title}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                <option value="success">Success</option>
                <option value="error">Error</option>
                <option value="blocked">Blocked</option>
              </select>
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
          </div>

          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div id="search-filter" className="flex-1 min-w-64">
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                Search
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
        <div id="history-stats" className="flex items-center space-x-6 text-sm text-gray-600 mt-4">
          <span>Total Requests: {logs.length}</span>
          <span>Success: {logs.filter(l => l.status === 'success').length}</span>
          <span>Errors: {logs.filter(l => l.status === 'error').length}</span>
          <span>Blocked: {logs.filter(l => l.status === 'blocked').length}</span>
          {isLoading && <span className="text-blue-600">🔄 Loading...</span>}
        </div>
      </div>

      {/* Request History Table */}
      <div id="history-table-section" className="bg-white rounded-lg shadow-sm border border-gray-200">
        {logs.length === 0 && !isLoading ? (
          <div id="no-history-found" className="text-center py-12">
            <p className="text-gray-500">No request history found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => {
                  const { date, time } = formatDate(log.timestamp);
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{date}</div>
                          <div className="text-gray-500">{time}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm max-w-xs">
                          <div className="font-medium text-gray-900 mb-1">
                            {log.model}
                            {log.response_time_ms && (
                              <span className="text-gray-500 ml-2">({log.response_time_ms}ms)</span>
                            )}
                          </div>
                          <div className="text-gray-600">
                            {truncateText(log.prompt)}
                          </div>
                          {log.task_title && (
                            <div className="text-xs text-blue-600 mt-1">
                              Task: {log.task_title}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        {log.intent_classification ? (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIntentColor(log.intent_classification)}`}>
                              {log.intent_classification}
                            </span>
                            {log.confidence_score && (
                              <div className="text-xs text-gray-500 mt-1">
                                {(Number(log.confidence_score) * 100).toFixed(0)}%
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {log.tokens_used.toLocaleString()}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                        {log.deviation_score_delta > 0 && (
                          <div className="text-xs text-orange-600 mt-1">
                            Score: +{log.deviation_score_delta}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Simple Details Modal */}
      {isDetailsModalOpen && selectedLog && (
        <div id="log-details-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Request Details</h2>
                <p className="text-sm text-gray-600">Request ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedLog(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Prompt */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Prompt</h3>
                <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">{selectedLog.prompt}</pre>
                </div>
              </div>

              {/* Response */}
              {selectedLog.response && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Response</h3>
                  <div className="bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">{selectedLog.response}</pre>
                  </div>
                </div>
              )}

              {/* Error */}
              {selectedLog.error_message && (
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-2">Error Message</h3>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <pre className="text-sm text-red-700 whitespace-pre-wrap">{selectedLog.error_message}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedLog(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};