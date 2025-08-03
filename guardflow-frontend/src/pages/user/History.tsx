import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserDashboardService, type UserLogFilters } from '../../services/userDashboard';
import '../../styles/userHistory.css';

export const UserHistory: React.FC = () => {
  const [filters, setFilters] = useState<any>({});
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Fetch user task history
  const { data: taskHistory = [], isLoading, error } = useQuery({
    queryKey: ['user-task-history', filters],
    queryFn: () => UserDashboardService.getUserTasks(),
    refetchInterval: 30000,
  });

  // Filter tasks based on filters
  const filteredTasks = taskHistory.filter(task => {
    if (filters.status && task.status !== filters.status) return false;
    if (filters.category && task.task_category !== filters.category) return false;
    if (filters.start_date && task.assigned_at < filters.start_date) return false;
    if (filters.end_date && task.assigned_at > filters.end_date) return false;
    if (filters.search && !task.task_title.toLowerCase().includes(filters.search.toLowerCase()) && 
        !task.task_description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const handleFilterChange = (newFilters: Partial<UserLogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleViewDetails = (task: any) => {
    setSelectedTask(task);
    setIsDetailsModalOpen(true);
  };

  const handleExportTasks = async () => {
    try {
      // Create CSV content from filtered tasks
      const headers = ['Task Title', 'Category', 'Difficulty', 'Status', 'Assigned Date', 'Completion Date', 'Tokens Used', 'Token Limit'];
      const csvContent = [
        headers.join(','),
        ...filteredTasks.map(task => [
          `"${task.task_title}"`,
          task.task_category,
          task.task_difficulty,
          task.status,
          task.assigned_at,
          task.completion_date || '',
          task.tokens_used,
          task.token_limit
        ].join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-tasks-${new Date().toISOString().split('T')[0]}.csv`;
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

  const getTaskStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
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
            <h1 className="text-2xl font-bold text-gray-900">Task History</h1>
            <p className="text-gray-600">View your assigned tasks and their progress</p>
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
              onClick={handleExportTasks}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div id="history-filters" className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div id="category-filter" className="flex-1 min-w-48">
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category-select"
                value={filters.category || ''}
                onChange={(e) => handleFilterChange({ category: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                <option value="coding">Coding</option>
                <option value="testing">Testing</option>
                <option value="documentation">Documentation</option>
                <option value="research">Research</option>
                <option value="other">Other</option>
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
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
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
          <span>Total Tasks: {filteredTasks.length}</span>
          <span>Active: {filteredTasks.filter(t => t.status === 'active').length}</span>
          <span>Completed: {filteredTasks.filter(t => t.status === 'completed').length}</span>
          <span>Cancelled: {filteredTasks.filter(t => t.status === 'cancelled').length}</span>
          {isLoading && <span className="text-blue-600">🔄 Loading...</span>}
        </div>
      </div>

      {/* Task History Table */}
      <div id="history-table-section" className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredTasks.length === 0 && !isLoading ? (
          <div id="no-history-found" className="text-center py-12">
            <p className="text-gray-500">No task history found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => {
                  const { date, time } = formatDate(task.assigned_at);
                  
                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{date}</div>
                          <div className="text-gray-500">{time}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm max-w-xs">
                          <div className="font-medium text-gray-900 mb-1">
                            {task.task_title}
                          </div>
                          <div className="text-gray-600">
                            {truncateText(task.task_description)}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Difficulty: {task.task_difficulty}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getIntentColor(task.task_category)}`}>
                          {task.task_category}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {task.tokens_used.toLocaleString()} / {task.token_limit.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {((task.tokens_used / task.token_limit) * 100).toFixed(1)}% used
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTaskStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        {task.completion_date && (
                          <div className="text-xs text-green-600 mt-1">
                            Completed: {formatDate(task.completion_date).date}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(task)}
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
      {isDetailsModalOpen && selectedTask && (
        <div id="log-details-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-screen overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
                <p className="text-sm text-gray-600">Task: {selectedTask.task_title}</p>
              </div>
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedTask(null);
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
              {/* Task Description */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Task Description</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">{selectedTask.task_description}</p>
                </div>
              </div>

              {/* Progress Notes */}
              {selectedTask.progress_notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Progress Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">{selectedTask.progress_notes}</p>
                  </div>
                </div>
              )}

              {/* Task Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Task Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Category:</span> {selectedTask.task_category}</div>
                    <div><span className="font-medium">Difficulty:</span> {selectedTask.task_difficulty}</div>
                    <div><span className="font-medium">Estimated Hours:</span> {selectedTask.estimated_hours}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Usage & Progress</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Tokens Used:</span> {selectedTask.tokens_used?.toLocaleString()}</div>
                    <div><span className="font-medium">Token Limit:</span> {selectedTask.token_limit?.toLocaleString()}</div>
                    <div><span className="font-medium">Assigned:</span> {formatDate(selectedTask.assigned_at).date}</div>
                    {selectedTask.completion_date && (
                      <div><span className="font-medium">Completed:</span> {formatDate(selectedTask.completion_date).date}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedTask(null);
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