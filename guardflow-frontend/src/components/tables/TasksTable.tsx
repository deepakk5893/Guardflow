import React from 'react';
import type { Task } from '../../services/tasks';

interface TasksTableProps {
  tasks: Task[];
  isLoading?: boolean;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onToggleStatus: (taskId: number) => void;
  onAssignTask: (task: Task) => void;
  onViewAssignments: (task: Task) => void;
}

export const TasksTable: React.FC<TasksTableProps> = ({
  tasks,
  isLoading = false,
  onEditTask,
  onDeleteTask,
  onToggleStatus,
  onAssignTask,
  onViewAssignments
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'coding': return 'bg-blue-100 text-blue-800';
      case 'testing': return 'bg-purple-100 text-purple-800';
      case 'documentation': return 'bg-indigo-100 text-indigo-800';
      case 'research': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div id="tasks-table-loading" className="flex justify-center items-center py-12">
        <div className="animate-spin border-4 border-blue-500 border-t-transparent rounded-full w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div id="tasks-table-container">
      <div id="tasks-table-wrapper" className="overflow-x-auto">
        <table id="tasks-table" className="w-full border-collapse bg-white shadow-sm rounded-lg">
          <thead id="tasks-table-header">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difficulty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Limits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody id="tasks-table-body" className="bg-white divide-y divide-gray-200">
            {tasks.map((task) => (
              <tr key={task.id} id={`task-row-${task.id}`} className="hover:bg-gray-50">
                <td id={`task-details-${task.id}`} className="px-6 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 mb-1">{task.title}</div>
                    <div className="text-gray-600 max-w-xs">
                      {truncateText(task.description)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Est. {task.estimated_hours}h • Created {formatDate(task.created_at)}
                    </div>
                  </div>
                </td>
                
                <td id={`task-category-${task.id}`} className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(task.category)}`}>
                    {task.category}
                  </span>
                </td>
                
                <td id={`task-difficulty-${task.id}`} className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(task.difficulty_level)}`}>
                    {task.difficulty_level}
                  </span>
                </td>
                
                <td id={`task-limits-${task.id}`} className="px-6 py-4">
                  <div className="text-sm">
                    <div className="text-gray-900">
                      {task.token_limit.toLocaleString()} tokens
                    </div>
                  </div>
                </td>
                
                <td id={`task-usage-${task.id}`} className="px-6 py-4">
                  <div className="text-sm">
                    {task.assigned_users_count !== undefined && (
                      <div className="text-gray-900">
                        {task.assigned_users_count} users assigned
                      </div>
                    )}
                    {task.total_requests !== undefined && (
                      <div className="text-gray-600">
                        {task.total_requests.toLocaleString()} requests
                      </div>
                    )}
                  </div>
                </td>
                
                <td id={`task-assigned-${task.id}`} className="px-6 py-4 text-center">
                  {task.has_assignments ? (
                    <div className="flex justify-center">
                      <span className="text-green-600 text-lg">✓</span>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <span className="text-gray-300 text-lg">—</span>
                    </div>
                  )}
                </td>
                
                <td id={`task-status-${task.id}`} className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    task.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {task.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                
                <td id={`task-actions-${task.id}`} className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      id={`edit-task-${task.id}`}
                      onClick={() => onEditTask(task)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      id={`assign-task-${task.id}`}
                      onClick={() => onAssignTask(task)}
                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                    >
                      {task.has_assignments ? 'Reassign' : 'Assign'}
                    </button>
                    <button
                      id={`assignments-task-${task.id}`}
                      onClick={() => onViewAssignments(task)}
                      className="text-purple-600 hover:text-purple-900 text-sm font-medium"
                    >
                      Assignments
                    </button>
                    <button
                      id={`toggle-task-${task.id}`}
                      onClick={() => onToggleStatus(task.id)}
                      className={`text-sm font-medium ${
                        task.is_active 
                          ? 'text-yellow-600 hover:text-yellow-900' 
                          : 'text-green-600 hover:text-green-900'
                      }`}
                    >
                      {task.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      id={`delete-task-${task.id}`}
                      onClick={() => onDeleteTask(task.id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {tasks.length === 0 && !isLoading && (
        <div id="no-tasks-found" className="text-center py-12">
          <p className="text-gray-500">No tasks found. Create your first task to get started.</p>
        </div>
      )}
    </div>
  );
};