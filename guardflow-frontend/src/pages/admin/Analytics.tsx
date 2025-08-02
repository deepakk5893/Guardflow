import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnalyticsService, type AnalyticsFilters } from '../../services/analytics';
import { UserService } from '../../services/users';
import { UsageChart } from '../../components/charts/UsageChart';
import { IntentChart } from '../../components/charts/IntentChart';
import { DeviationChart } from '../../components/charts/DeviationChart';
import type { User } from '../../types/auth';
import '../../styles/analytics.css';

export const Analytics: React.FC = () => {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end_date: new Date().toISOString().split('T')[0] // today
  });

  // Fetch data
  const { data: usageStats, isLoading: usageLoading } = useQuery({
    queryKey: ['analytics-usage', filters],
    queryFn: () => AnalyticsService.getUsageStats(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: dailyUsage = [], isLoading: dailyLoading } = useQuery({
    queryKey: ['analytics-daily', filters],
    queryFn: () => AnalyticsService.getDailyUsage(filters),
  });

  const { data: intentDistribution = [], isLoading: intentLoading } = useQuery({
    queryKey: ['analytics-intent', filters],
    queryFn: () => AnalyticsService.getIntentDistribution(filters),
  });

  const { data: topUsers = [] } = useQuery({
    queryKey: ['analytics-top-users', filters],
    queryFn: () => AnalyticsService.getTopUsers(filters, 5),
  });

  const { data: deviationTrends = [] } = useQuery({
    queryKey: ['analytics-deviation', filters],
    queryFn: () => AnalyticsService.getDeviationTrends(filters),
  });

  const { data: systemHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: AnalyticsService.getSystemHealth,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: UserService.getUsers,
  });

  const handleFilterChange = (newFilters: Partial<AnalyticsFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handlePresetRange = (days: number) => {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFilters(prev => ({ ...prev, start_date: startDate, end_date: endDate }));
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const isLoading = usageLoading || dailyLoading || intentLoading;

  return (
    <div id="admin-analytics-page" className="p-6">
      {/* Header */}
      <div id="analytics-header" className="mb-6">
        <div id="analytics-title-section" className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">System usage patterns, performance metrics, and insights</p>
          </div>
          <div className="flex space-x-3">
            <button
              id="preset-7d-btn"
              onClick={() => handlePresetRange(7)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              7 Days
            </button>
            <button
              id="preset-30d-btn"
              onClick={() => handlePresetRange(30)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              30 Days
            </button>
            <button
              id="preset-90d-btn"
              onClick={() => handlePresetRange(90)}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              90 Days
            </button>
          </div>
        </div>

        {/* Filters */}
        <div id="analytics-filters" className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex flex-wrap gap-4 items-end">
            <div id="user-filter" className="flex-1 min-w-48">
              <label htmlFor="analytics-user-select" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by User
              </label>
              <select
                id="analytics-user-select"
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

            <div id="date-range-filters" className="flex gap-3">
              <div>
                <label htmlFor="analytics-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="analytics-start-date"
                  value={filters.start_date || ''}
                  onChange={(e) => handleFilterChange({ start_date: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="analytics-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="analytics-end-date"
                  value={filters.end_date || ''}
                  onChange={(e) => handleFilterChange({ end_date: e.target.value || undefined })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      {usageStats && (
        <div id="analytics-overview" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div id="total-requests-stat" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-semibold text-gray-900">{usageStats.total_requests.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div id="success-rate-stat" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {usageStats.total_requests > 0 
                    ? ((usageStats.successful_requests / usageStats.total_requests) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div id="total-tokens-stat" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-lg">🔢</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tokens</p>
                <p className="text-2xl font-semibold text-gray-900">{usageStats.total_tokens_used.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div id="unique-users-stat" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-lg">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">{usageStats.unique_users}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div id="analytics-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="lg:col-span-2">
          <UsageChart data={dailyUsage} type="requests" height={300} />
        </div>
        
        <UsageChart data={dailyUsage} type="tokens" height={250} />
        <UsageChart data={dailyUsage} type="users" height={250} />
        
        <IntentChart data={intentDistribution} height={300} />
        <DeviationChart data={deviationTrends} height={300} />
      </div>

      {/* Bottom Section */}
      <div id="analytics-bottom" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div id="top-users-section" className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Users by Usage</h3>
          <div className="space-y-4">
            {topUsers.map((user, index) => (
              <div key={user.user_id} id={`top-user-${user.user_id}`} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                    {index + 1}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{user.user_name}</p>
                    <p className="text-xs text-gray-500">
                      Score: {user.average_deviation_score.toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.total_requests.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{user.total_tokens.toLocaleString()} tokens</p>
                </div>
              </div>
            ))}
            {topUsers.length === 0 && (
              <p className="text-gray-500 text-center py-4">No user data available</p>
            )}
          </div>
        </div>

        {/* System Health */}
        {systemHealth && (
          <div id="system-health-section" className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
            <div className="space-y-3">
              <div id="uptime-metric" className="flex justify-between">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium text-gray-900">{formatUptime(systemHealth.uptime)}</span>
              </div>
              <div id="cpu-metric" className="flex justify-between">
                <span className="text-sm text-gray-600">CPU Usage</span>
                <span className="text-sm font-medium text-gray-900">{systemHealth.cpu_usage.toFixed(1)}%</span>
              </div>
              <div id="memory-metric" className="flex justify-between">
                <span className="text-sm text-gray-600">Memory Usage</span>
                <span className="text-sm font-medium text-gray-900">{systemHealth.memory_usage.toFixed(1)}%</span>
              </div>
              <div id="disk-metric" className="flex justify-between">
                <span className="text-sm text-gray-600">Disk Usage</span>
                <span className="text-sm font-medium text-gray-900">{systemHealth.disk_usage.toFixed(1)}%</span>
              </div>
              <div id="connections-metric" className="flex justify-between">
                <span className="text-sm text-gray-600">Active Connections</span>
                <span className="text-sm font-medium text-gray-900">{systemHealth.active_connections}</span>
              </div>
              <div id="queue-metric" className="flex justify-between">
                <span className="text-sm text-gray-600">Queue Size</span>
                <span className="text-sm font-medium text-gray-900">{systemHealth.queue_size}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div id="analytics-loading" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-gray-700">Loading analytics...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};