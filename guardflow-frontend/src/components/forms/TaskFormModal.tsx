import React, { useState, useEffect } from 'react';
import { TasksService, type Task, type CreateTaskRequest } from '../../services/tasks';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskRequest) => void;
  task?: Task | null;
  isLoading?: boolean;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  task = null,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    category: 'coding',
    difficulty_level: 'beginner',
    estimated_hours: 1,
    max_tokens_per_request: 1000,
    daily_quota_limit: 10000,
    is_active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or task changes
  useEffect(() => {
    if (isOpen) {
      if (task) {
        // Edit mode - populate with existing task data
        setFormData({
          title: task.title,
          description: task.description,
          category: task.category,
          difficulty_level: task.difficulty_level,
          estimated_hours: task.estimated_hours,
          max_tokens_per_request: task.max_tokens_per_request,
          daily_quota_limit: task.daily_quota_limit,
          is_active: task.is_active
        });
      } else {
        // Create mode - reset to defaults
        setFormData({
          title: '',
          description: '',
          category: 'coding',
          difficulty_level: 'beginner',
          estimated_hours: 1,
          max_tokens_per_request: 1000,
          daily_quota_limit: 10000,
          is_active: true
        });
      }
      setErrors({});
    }
  }, [isOpen, task]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (formData.estimated_hours < 0.5) {
      newErrors.estimated_hours = 'Estimated hours must be at least 0.5';
    } else if (formData.estimated_hours > 1000) {
      newErrors.estimated_hours = 'Estimated hours cannot exceed 1000';
    }

    if (formData.max_tokens_per_request < 100) {
      newErrors.max_tokens_per_request = 'Max tokens per request must be at least 100';
    } else if (formData.max_tokens_per_request > 100000) {
      newErrors.max_tokens_per_request = 'Max tokens per request cannot exceed 100,000';
    }

    if (formData.daily_quota_limit < 1000) {
      newErrors.daily_quota_limit = 'Daily quota limit must be at least 1,000';
    } else if (formData.daily_quota_limit > 1000000) {
      newErrors.daily_quota_limit = 'Daily quota limit cannot exceed 1,000,000';
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

  const handleInputChange = (field: keyof CreateTaskRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div id="task-form-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div id="task-form-modal-content" className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div id="task-form-header" className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {task ? 'Edit Task' : 'Create New Task'}
            </h2>
            <p className="text-sm text-gray-600">
              {task ? 'Update task details and settings' : 'Define a new task for users to work on'}
            </p>
          </div>
          <button
            id="task-form-close-btn"
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div id="task-title-field">
            <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              id="task-title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter task title"
              disabled={isLoading}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div id="task-description-field">
            <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="task-description"
              rows={4}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe what this task involves and any specific requirements"
              disabled={isLoading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Category and Difficulty */}
          <div id="task-category-difficulty" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div id="task-category-field">
              <label htmlFor="task-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="task-category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {TasksService.getTaskCategories().map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div id="task-difficulty-field">
              <label htmlFor="task-difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                id="task-difficulty"
                value={formData.difficulty_level}
                onChange={(e) => handleInputChange('difficulty_level', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                {TasksService.getDifficultyLevels().map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated Hours */}
          <div id="task-hours-field">
            <label htmlFor="task-hours" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Hours *
            </label>
            <input
              type="number"
              id="task-hours"
              min="0.5"
              max="1000"
              step="0.5"
              value={formData.estimated_hours}
              onChange={(e) => handleInputChange('estimated_hours', parseFloat(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.estimated_hours ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.estimated_hours && (
              <p className="mt-1 text-sm text-red-600">{errors.estimated_hours}</p>
            )}
          </div>

          {/* Token Limits */}
          <div id="task-limits" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div id="task-max-tokens-field">
              <label htmlFor="task-max-tokens" className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens per Request *
              </label>
              <input
                type="number"
                id="task-max-tokens"
                min="100"
                max="100000"
                step="100"
                value={formData.max_tokens_per_request}
                onChange={(e) => handleInputChange('max_tokens_per_request', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.max_tokens_per_request ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.max_tokens_per_request && (
                <p className="mt-1 text-sm text-red-600">{errors.max_tokens_per_request}</p>
              )}
            </div>

            <div id="task-daily-quota-field">
              <label htmlFor="task-daily-quota" className="block text-sm font-medium text-gray-700 mb-1">
                Daily Quota Limit *
              </label>
              <input
                type="number"
                id="task-daily-quota"
                min="1000"
                max="1000000"
                step="1000"
                value={formData.daily_quota_limit}
                onChange={(e) => handleInputChange('daily_quota_limit', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.daily_quota_limit ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isLoading}
              />
              {errors.daily_quota_limit && (
                <p className="mt-1 text-sm text-red-600">{errors.daily_quota_limit}</p>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div id="task-active-field">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => handleInputChange('is_active', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <span className="ml-2 text-sm text-gray-700">
                Task is active and available for assignment
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div id="task-form-actions" className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {isLoading && (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              )}
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};