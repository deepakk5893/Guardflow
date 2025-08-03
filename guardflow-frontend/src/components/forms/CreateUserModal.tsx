import React, { useState } from 'react';
import type { CreateUserRequest } from '../../services/users';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserRequest) => void;
  isLoading?: boolean;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: '',
    name: '',
    password: '',
    daily_quota: 10000,
    monthly_quota: 300000,
    requests_per_hour: 100
  });

  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('quota') || name === 'requests_per_hour' ? parseInt(value) || 0 : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm the password';
    } else if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.daily_quota || formData.daily_quota < 1) {
      newErrors.daily_quota = 'Daily quota must be at least 1';
    }

    if (!formData.monthly_quota || formData.monthly_quota < 1) {
      newErrors.monthly_quota = 'Monthly quota must be at least 1';
    }

    if (!formData.requests_per_hour || formData.requests_per_hour < 1) {
      newErrors.requests_per_hour = 'Requests per hour must be at least 1';
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

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      daily_quota: 10000,
      monthly_quota: 300000,
      requests_per_hour: 100
    });
    setConfirmPassword('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div id="create-user-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div id="create-user-modal-content" className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
        <div id="modal-header" className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Create New User</h2>
          <button
            id="modal-close-btn"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
          <div id="email-field">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div id="name-field">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="John Doe"
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div id="password-field">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter password (min 6 characters)"
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div id="confirm-password-field">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirm-password"
              name="confirm-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors(prev => ({ ...prev, confirmPassword: '' }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Confirm password"
            />
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <div id="quotas-section">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Usage Limits</h3>
            
            <div id="daily-quota-field" className="mb-3">
              <label htmlFor="daily_quota" className="block text-sm text-gray-600 mb-1">
                Daily Quota (tokens)
              </label>
              <input
                type="number"
                id="daily_quota"
                name="daily_quota"
                value={formData.daily_quota}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.daily_quota ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.daily_quota && (
                <p id="daily-quota-error" className="mt-1 text-sm text-red-600">{errors.daily_quota}</p>
              )}
            </div>

            <div id="monthly-quota-field" className="mb-3">
              <label htmlFor="monthly_quota" className="block text-sm text-gray-600 mb-1">
                Monthly Quota (tokens)
              </label>
              <input
                type="number"
                id="monthly_quota"
                name="monthly_quota"
                value={formData.monthly_quota}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.monthly_quota ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.monthly_quota && (
                <p id="monthly-quota-error" className="mt-1 text-sm text-red-600">{errors.monthly_quota}</p>
              )}
            </div>

            <div id="rate-limit-field">
              <label htmlFor="requests_per_hour" className="block text-sm text-gray-600 mb-1">
                Requests per Hour
              </label>
              <input
                type="number"
                id="requests_per_hour"
                name="requests_per_hour"
                value={formData.requests_per_hour}
                onChange={handleInputChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.requests_per_hour ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.requests_per_hour && (
                <p id="rate-limit-error" className="mt-1 text-sm text-red-600">{errors.requests_per_hour}</p>
              )}
            </div>
          </div>

          <div id="form-actions" className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              id="cancel-btn"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-btn"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md"
            >
              {isLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};