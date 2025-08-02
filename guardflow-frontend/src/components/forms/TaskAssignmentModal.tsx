import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../../services/users';
import { TasksService, type Task, type AssignTaskRequest } from '../../services/tasks';
import type { User } from '../../types/auth';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (assignment: AssignTaskRequest) => void;
  task: Task | null;
  isLoading?: boolean;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<AssignTaskRequest>({
    task_id: 0,
    user_id: 0,
    progress_notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: UserService.getUsers,
    enabled: isOpen,
  });

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        task_id: task.id,
        user_id: 0,
        progress_notes: ''
      });
      setErrors({});
    }
  }, [isOpen, task]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.user_id) {
      newErrors.user_id = 'Please select a user';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof AssignTaskRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes a selection
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Filter out blocked users
  const availableUsers = users.filter(user => !user.is_blocked);

  if (!isOpen || !task) return null;

  return (
    <div id="task-assignment-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div id="task-assignment-modal-content" className="bg-white rounded-lg w-full max-w-lg mx-4">
        {/* Header */}
        <div id="task-assignment-header" className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Assign Task</h2>
            <p className="text-sm text-gray-600">Assign "{task.title}" to a user</p>
          </div>
          <button
            id="task-assignment-close-btn"
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Task Details */}
        <div id="task-assignment-details" className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Category:</span>
              <span className="ml-2 text-gray-900">{task.category}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Difficulty:</span>
              <span className="ml-2 text-gray-900">{task.difficulty_level}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Est. Hours:</span>
              <span className="ml-2 text-gray-900">{task.estimated_hours}h</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Daily Limit:</span>
              <span className="ml-2 text-gray-900">{task.daily_quota_limit.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="font-medium text-gray-700">Description:</span>
            <p className="mt-1 text-gray-900 text-sm">{task.description}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* User Selection */}
          <div id="assignment-user-field">
            <label htmlFor="assignment-user" className="block text-sm font-medium text-gray-700 mb-1">
              Select User *
            </label>
            <select
              id="assignment-user"
              value={formData.user_id}
              onChange={(e) => handleInputChange('user_id', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.user_id ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            >
              <option value={0}>Choose a user...</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                  {user.is_blocked ? ' - Blocked' : ''}
                </option>
              ))}
            </select>
            {errors.user_id && (
              <p className="mt-1 text-sm text-red-600">{errors.user_id}</p>
            )}
            {availableUsers.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">No available users found</p>
            )}
          </div>

          {/* Progress Notes */}
          <div id="assignment-notes-field">
            <label htmlFor="assignment-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Progress Notes (Optional)
            </label>
            <textarea
              id="assignment-notes"
              rows={3}
              value={formData.progress_notes}
              onChange={(e) => handleInputChange('progress_notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any specific instructions or notes for this assignment"
              disabled={isLoading}
            />
          </div>

          {/* Form Actions */}
          <div id="assignment-form-actions" className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || availableUsers.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {isLoading && (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              )}
              Assign Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};