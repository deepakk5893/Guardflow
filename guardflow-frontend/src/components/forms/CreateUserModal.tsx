import React, { useState } from 'react';
import type { CreateUserRequest } from '../../services/users';

interface CreateUserInvitationRequest {
  email: string;
  role: string;
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'invite';
  onSubmitUser?: (userData: CreateUserRequest) => void;
  onSubmitInvitation?: (invitationData: CreateUserInvitationRequest) => void;
  isLoading?: boolean;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSubmitUser,
  onSubmitInvitation,
  isLoading = false
}) => {
  const [inviteFormData, setInviteFormData] = useState<CreateUserInvitationRequest>({
    email: '',
    role: 'user'
  });

  const [createFormData, setCreateFormData] = useState<CreateUserRequest>({
    email: '',
    name: '',
    password: '',
    daily_quota: 1000,
    monthly_quota: 30000,
    requests_per_hour: 100
  });

  // Available roles
  const roles = [
    { id: 'user', name: 'user', description: 'Standard user with task access only' },
    { id: 'admin', name: 'admin', description: 'Tenant administrator with company-wide access' }
    // Note: super_admin role excluded - only super_admins should create other super_admins
  ];

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (mode === 'create') {
      setCreateFormData(prev => ({
        ...prev,
        [name]: name === 'daily_quota' || name === 'monthly_quota' || name === 'requests_per_hour' 
          ? parseInt(value) || 0 
          : value
      }));
    } else {
      setInviteFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const data = mode === 'create' ? createFormData : inviteFormData;

    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (mode === 'create') {
      const createData = data as CreateUserRequest;
      if (!createData.name.trim()) {
        newErrors.name = 'Name is required';
      }
      if (!createData.password.trim()) {
        newErrors.password = 'Password is required';
      } else if (createData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (createData.daily_quota && createData.daily_quota < 1) {
        newErrors.daily_quota = 'Daily quota must be at least 1';
      }
      if (createData.monthly_quota && createData.monthly_quota < 1) {
        newErrors.monthly_quota = 'Monthly quota must be at least 1';
      }
      if (createData.requests_per_hour && createData.requests_per_hour < 1) {
        newErrors.requests_per_hour = 'Requests per hour must be at least 1';
      }
    } else {
      const inviteData = data as CreateUserInvitationRequest;
      if (!inviteData.role.trim()) {
        newErrors.role = 'Role selection is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      if (mode === 'create' && onSubmitUser) {
        onSubmitUser(createFormData);
      } else if (mode === 'invite' && onSubmitInvitation) {
        onSubmitInvitation(inviteFormData);
      }
    }
  };

  const resetForm = () => {
    setInviteFormData({
      email: '',
      role: 'user'
    });
    setCreateFormData({
      email: '',
      name: '',
      password: '',
      daily_quota: 1000,
      monthly_quota: 30000,
      requests_per_hour: 100
    });
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
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Create New User' : 'Invite New User'}
          </h2>
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

        <form id={`${mode}-user-form`} onSubmit={handleSubmit} className="space-y-4">
          <div id="email-field">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={mode === 'create' ? createFormData.email : inviteFormData.email}
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

          {mode === 'create' && (
            <>
              <div id="name-field">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={createFormData.name}
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
                  value={createFormData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Min. 6 characters"
                />
                {errors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <div id="quotas-section">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pt-4 border-t border-gray-200">
                  Usage Quotas
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div id="daily-quota-field">
                    <label htmlFor="daily_quota" className="block text-sm font-medium text-gray-700 mb-1">
                      Daily Quota (tokens)
                    </label>
                    <input
                      type="number"
                      id="daily_quota"
                      name="daily_quota"
                      value={createFormData.daily_quota || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.daily_quota ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="1000"
                      min="1"
                    />
                    {errors.daily_quota && (
                      <p id="daily-quota-error" className="mt-1 text-sm text-red-600">{errors.daily_quota}</p>
                    )}
                  </div>

                  <div id="monthly-quota-field">
                    <label htmlFor="monthly_quota" className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Quota (tokens)
                    </label>
                    <input
                      type="number"
                      id="monthly_quota"
                      name="monthly_quota"
                      value={createFormData.monthly_quota || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.monthly_quota ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="30000"
                      min="1"
                    />
                    {errors.monthly_quota && (
                      <p id="monthly-quota-error" className="mt-1 text-sm text-red-600">{errors.monthly_quota}</p>
                    )}
                  </div>

                  <div id="hourly-requests-field">
                    <label htmlFor="requests_per_hour" className="block text-sm font-medium text-gray-700 mb-1">
                      Requests per Hour
                    </label>
                    <input
                      type="number"
                      id="requests_per_hour"
                      name="requests_per_hour"
                      value={createFormData.requests_per_hour || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.requests_per_hour ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="100"
                      min="1"
                    />
                    {errors.requests_per_hour && (
                      <p id="hourly-requests-error" className="mt-1 text-sm text-red-600">{errors.requests_per_hour}</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {mode === 'invite' && (
            <div id="role-field">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={inviteFormData.role}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.role ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name.charAt(0).toUpperCase() + role.name.slice(1)} - {role.description}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p id="role-error" className="mt-1 text-sm text-red-600">{errors.role}</p>
              )}
            </div>
          )}

          {mode === 'invite' && (
            <div id="invitation-info" className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium mb-1">How user invitations work:</p>
                  <ul className="text-xs space-y-1">
                    <li> An invitation email will be sent to the user</li>
                    <li> They can set their own password when accepting</li>
                    <li> The invitation expires in 7 days</li>
                    <li> You can resend or cancel invitations anytime</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {mode === 'create' && (
            <div id="create-info" className="bg-green-50 border border-green-200 rounded-md p-3 text-xs text-green-700">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">User will be created immediately and can log in right away</span>
              </div>
            </div>
          )}

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
              {isLoading 
                ? (mode === 'create' ? 'Creating User...' : 'Sending Invitation...') 
                : (mode === 'create' ? 'Create User' : 'Send Invitation')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};