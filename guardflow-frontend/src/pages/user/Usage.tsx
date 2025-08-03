import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserDashboardService } from '../../services/userDashboard';
import { UsageChart } from '../../components/charts/UsageChart';
import '../../styles/userUsage.css';

export const UserUsage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<number>(30); // days

  // Fetch user data
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: UserDashboardService.getUserStats,
    refetchInterval: 30000,
  });

  const { data: dailyUsage = [], isLoading: usageLoading } = useQuery({
    queryKey: ['user-daily-usage', timeRange],
    queryFn: () => UserDashboardService.getUserDailyUsage(timeRange),
  });

  const { data: quotaStatus } = useQuery({
    queryKey: ['user-quota-status'],
    queryFn: UserDashboardService.getUserQuotaStatus,
    refetchInterval: 10000,
  });

  const handleTimeRangeChange = (days: number) => {
    setTimeRange(days);
  };

  const getUsagePercentage = (used: number, limit: number) => {
    return limit > 0 ? (used / limit) * 100 : 0;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const isLoading = statsLoading || usageLoading;

  return (
    <div id="user-usage-page" className="p-6">
      {/* Header */}
      <div id="usage-header" className="mb-6">
        <div id="usage-title-section" className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
            <p className="text-gray-600">Track your API usage patterns and quota consumption</p>
          </div>
          <div className="flex space-x-2">
            <button
              id="range-7d-btn"
              onClick={() => handleTimeRangeChange(7)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timeRange === 7 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Days
            </button>
            <button
              id="range-30d-btn"
              onClick={() => handleTimeRangeChange(30)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timeRange === 30 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Days
            </button>
            <button
              id="range-90d-btn"
              onClick={() => handleTimeRangeChange(90)}
              className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                timeRange === 90 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* Current Quota Status */}
      {quotaStatus && (
        <div id="quota-status-section" className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Current Quota Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Quota Detail */}
            <div id="daily-quota-detail" className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Daily Quota</h3>
                <span className="text-2xl">📅</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Usage</span>
                  <span className={`font-semibold ${getUsageColor(quotaStatus.daily.percentage)}`}>
                    {quotaStatus.daily.used.toLocaleString()} / {quotaStatus.daily.limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all duration-300 ${
                      quotaStatus.daily.percentage >= 90 ? 'bg-red-500' :
                      quotaStatus.daily.percentage >= 75 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, quotaStatus.daily.percentage)}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Percentage Used</span>
                    <p className="font-medium text-gray-900">{quotaStatus.daily.percentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Resets At</span>
                    <p className="font-medium text-gray-900">
                      {new Date(quotaStatus.daily.reset_time).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Quota Detail */}
            <div id="monthly-quota-detail" className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Monthly Quota</h3>
                <span className="text-2xl">📊</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Usage</span>
                  <span className={`font-semibold ${getUsageColor(quotaStatus.monthly.percentage)}`}>
                    {quotaStatus.monthly.used.toLocaleString()} / {quotaStatus.monthly.limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all duration-300 ${
                      quotaStatus.monthly.percentage >= 90 ? 'bg-red-500' :
                      quotaStatus.monthly.percentage >= 75 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, quotaStatus.monthly.percentage)}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Percentage Used</span>
                    <p className="font-medium text-gray-900">{quotaStatus.monthly.percentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Resets On</span>
                    <p className="font-medium text-gray-900">{quotaStatus.monthly.reset_date}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Charts */}
      <div id="usage-charts-section" className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Trends</h2>
        <div className="grid grid-cols-1 gap-6">
          <UsageChart 
            data={dailyUsage.map(item => ({
              date: item.date,
              tokens: item.tokens,
              unique_users: 1
            }))} 
            type="tokens" 
            height={300} 
          />
        </div>
      </div>

      {/* Token Usage Statistics */}
      {userStats && (
        <div id="detailed-stats-section">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Token Usage Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div id="token-usage-stats" className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Token Usage</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Tokens Used</span>
                  <span className="font-medium text-gray-900">{userStats.total_tokens_used.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Quota Used</span>
                  <span className="font-medium text-blue-600">{userStats.daily_quota_used.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Quota Limit</span>
                  <span className="font-medium text-gray-600">{userStats.daily_quota_limit.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Quota Used</span>
                  <span className="font-medium text-purple-600">{userStats.monthly_quota_used.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Quota Limit</span>
                  <span className="font-medium text-gray-600">{userStats.monthly_quota_limit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div id="deviation-stats" className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Deviation Score</span>
                  <span className={`font-medium ${userStats.current_deviation_score > 0.7 ? 'text-red-600' : userStats.current_deviation_score > 0.5 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {userStats.current_deviation_score.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account Status</span>
                  <span className={`font-medium ${userStats.current_deviation_score > 0.7 ? 'text-red-600' : 'text-green-600'}`}>
                    {userStats.current_deviation_score > 0.7 ? 'At Risk' : 'Good Standing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div id="usage-loading" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-gray-700">Loading usage data...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};