import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserDashboardService } from '../../services/userDashboard';
import '../../styles/userDashboard.css';

export const UserDashboard: React.FC = () => {
  // Fetch user data
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats'],
    queryFn: UserDashboardService.getUserStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: quotaStatus, isLoading: quotaLoading } = useQuery({
    queryKey: ['user-quota-status'],
    queryFn: UserDashboardService.getUserQuotaStatus,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: UserDashboardService.getUserProfile,
  });

  const { data: userTasks = [] } = useQuery({
    queryKey: ['user-tasks'],
    queryFn: UserDashboardService.getUserTasks,
  });

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleString();
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-red-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const isLoading = statsLoading || quotaLoading;

  return (
    <div id="user-dashboard-page" className="p-6">
      {/* Welcome Header */}
      <div id="dashboard-welcome" className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back{userProfile?.name ? `, ${userProfile.name}` : ''}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your API usage and current status
        </p>
      </div>

      {/* Alerts & Warnings */}
      {quotaStatus?.warnings && (
        <div id="dashboard-alerts" className="mb-6">
          {quotaStatus.warnings.blocked_status && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-3">
              <div className="flex items-center">
                <span className="text-lg mr-2">⚠️</span>
                <div>
                  <p className="font-medium">Account Blocked</p>
                  <p className="text-sm">Your account has been temporarily blocked due to policy violations.</p>
                </div>
              </div>
            </div>
          )}
          
          {quotaStatus.warnings.high_deviation_score && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-3">
              <div className="flex items-center">
                <span className="text-lg mr-2">⚠️</span>
                <div>
                  <p className="font-medium">High Deviation Score</p>
                  <p className="text-sm">Your deviation score is elevated. Please review your usage patterns.</p>
                </div>
              </div>
            </div>
          )}

          {quotaStatus.warnings.near_daily_limit && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-3">
              <div className="flex items-center">
                <span className="text-lg mr-2">📊</span>
                <div>
                  <p className="font-medium">Approaching Daily Limit</p>
                  <p className="text-sm">You're close to your daily quota limit.</p>
                </div>
              </div>
            </div>
          )}

          {quotaStatus.warnings.near_monthly_limit && (
            <div className="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-3">
              <div className="flex items-center">
                <span className="text-lg mr-2">📈</span>
                <div>
                  <p className="font-medium">Approaching Monthly Limit</p>
                  <p className="text-sm">You're close to your monthly quota limit.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quota Status Cards */}
      {quotaStatus && (
        <div id="quota-overview" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Daily Quota */}
          <div id="daily-quota-card" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Daily Quota</h3>
              <span className="text-2xl">📅</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">
                  {quotaStatus.daily.used.toLocaleString()} / {quotaStatus.daily.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getQuotaColor(quotaStatus.daily.percentage)}`}
                  style={{ width: `${Math.min(100, quotaStatus.daily.percentage)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{quotaStatus.daily.percentage.toFixed(1)}% used</span>
                <span className="text-gray-600">Resets: {formatTime(quotaStatus.daily.reset_time)}</span>
              </div>
            </div>
          </div>

          {/* Monthly Quota */}
          <div id="monthly-quota-card" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Monthly Quota</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">
                  {quotaStatus.monthly.used.toLocaleString()} / {quotaStatus.monthly.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${getQuotaColor(quotaStatus.monthly.percentage)}`}
                  style={{ width: `${Math.min(100, quotaStatus.monthly.percentage)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{quotaStatus.monthly.percentage.toFixed(1)}% used</span>
                <span className="text-gray-600">Resets: {quotaStatus.monthly.reset_date}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {userStats && (
        <div id="usage-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">

          <div id="tokens-used-card" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-lg">🔢</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tokens Used</p>
                <p className="text-2xl font-semibold text-gray-900">{userStats.total_tokens_used.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div id="daily-quota-card" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Daily Quota Used</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {userStats.daily_quota_used.toLocaleString()} / {userStats.daily_quota_limit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div id="deviation-score-card" className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-lg">⚡</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Deviation Score</p>
                <p className={`text-2xl font-semibold ${getScoreColor(userStats.current_deviation_score)}`}>
                  {userStats.current_deviation_score}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity & Tasks */}
      <div id="dashboard-bottom" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Tasks */}
        <div id="active-tasks-card" className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Active Tasks</h3>
          {userTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active tasks assigned</p>
          ) : (
            <div className="space-y-4">
              {userTasks.slice(0, 3).map((task) => (
                <div key={task.id} id={`task-${task.id}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{task.task_title}</h4>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      task.status === 'active' ? 'bg-green-100 text-green-800' :
                      task.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{task.task_description}</p>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{task.task_category} • {task.task_difficulty}</span>
                    <span>{task.tokens_used} tokens used</span>
                  </div>
                </div>
              ))}
              {userTasks.length > 3 && (
                <div className="text-center">
                  <a href="/dashboard/tasks" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View all tasks ({userTasks.length})
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div id="quick-stats-card" className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
          {userStats && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Monthly Quota Used</span>
                <span className="text-sm font-medium text-gray-900">
                  {userStats.monthly_quota_used.toLocaleString()} / {userStats.monthly_quota_limit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Monthly Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {((userStats.monthly_quota_used / userStats.monthly_quota_limit) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deviation Score</span>
                <span className={`text-sm font-medium ${
                  userStats.current_deviation_score > 0.7 ? 'text-red-600' : 
                  userStats.current_deviation_score > 0.5 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {userStats.current_deviation_score.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div id="dashboard-loading" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-gray-700">Loading dashboard...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};