import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userDashboardService } from '../../services/userDashboard';
import '../../styles/userTasks.css';

interface UserTask {
  id: number;
  task_id: number;
  task_title: string;
  task_description: string;
  task_category: string;
  task_difficulty: string;
  assigned_at: string;
  status: string;
  progress_notes?: string;
  completion_date?: string;
  estimated_hours: number;
  token_limit: number;
  tokens_used: number;
}

export const UserTasks: React.FC = () => {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userDashboardService.getUserTasks();
      setTasks(response);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'completed':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (difficulty) {
      case 'beginner':
        return `${baseClasses} bg-green-100 text-green-700`;
      case 'intermediate':
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
      case 'advanced':
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-700`;
    }
  };

  if (loading) {
    return (
      <div id="user-tasks-loading" className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div id="user-tasks-error" className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchTasks}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-md text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="user-tasks-page" className="p-6">
      <div id="user-tasks-header" className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600 mt-1">View your assigned tasks and track your progress</p>
      </div>

      {tasks.length === 0 ? (
        <div id="no-tasks-message" className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
            📋
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Assigned</h3>
          <p className="text-gray-500">You don't have any tasks assigned yet. Contact your administrator for task assignments.</p>
        </div>
      ) : (
        <div id="user-tasks-grid" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <div key={task.id} id={`task-card-${task.id}`} className="user-task-card">
              <div className="task-card-header">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="task-title">{task.task_title}</h3>
                  <span className={getStatusBadge(task.status)}>{task.status}</span>
                </div>
                
                <div className="flex items-center space-x-2 mb-3">
                  <span className="task-category-badge">{task.task_category}</span>
                  <span className={getDifficultyBadge(task.task_difficulty)}>{task.task_difficulty}</span>
                </div>
              </div>

              <div className="task-card-body">
                <p className="task-description">{task.task_description}</p>
                
                <div className="task-stats">
                  <div className="stat-item">
                    <span className="stat-label">Tokens Used:</span>
                    <span className="stat-value">{task.tokens_used.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Estimated Hours:</span>
                    <span className="stat-value">{task.estimated_hours}</span>
                  </div>
                </div>

                <div className="task-limits">
                  <div className="limit-item">
                    <span className="limit-label">Token Limit:</span>
                    <span className="limit-value">{task.token_limit?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>

                {task.progress_notes && (
                  <div className="progress-notes">
                    <h4 className="notes-title">Progress Notes:</h4>
                    <p className="notes-content">{task.progress_notes}</p>
                  </div>
                )}
              </div>

              <div className="task-card-footer">
                <div className="task-dates">
                  <div className="date-item">
                    <span className="date-label">Assigned:</span>
                    <span className="date-value">{new Date(task.assigned_at).toLocaleDateString()}</span>
                  </div>
                  {task.completion_date && (
                    <div className="date-item">
                      <span className="date-label">Completed:</span>
                      <span className="date-value">{new Date(task.completion_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                
                {task.status === 'active' && (
                  <div className="task-actions">
                    <Link
                      to={`/chat?task=${task.task_id}`}
                      className="start-chat-btn"
                    >
                      {task.tokens_used > 0 ? 'Continue Chat' : 'Start Chat'}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};