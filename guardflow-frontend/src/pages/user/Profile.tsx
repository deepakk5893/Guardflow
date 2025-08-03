import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserDashboardService } from '../../services/userDashboard';
import '../../styles/userProfile.css';

export const UserProfile: React.FC = () => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [profileData, setProfileData] = useState({ name: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: UserDashboardService.getUserProfile,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: UserDashboardService.updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsEditingProfile(false);
      setErrors({});
    },
    onError: (error) => {
      setErrors({ profile: error instanceof Error ? error.message : 'Failed to update profile' });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      UserDashboardService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
      alert('Password changed successfully!');
    },
    onError: (error) => {
      setErrors({ password: error instanceof Error ? error.message : 'Failed to change password' });
    }
  });

  // Initialize profile data when user profile loads
  React.useEffect(() => {
    if (userProfile) {
      setProfileData({ name: userProfile.name });
    }
  }, [userProfile]);

  const handleProfileEdit = () => {
    setIsEditingProfile(true);
    setErrors({});
  };

  const handleProfileCancel = () => {
    setIsEditingProfile(false);
    if (userProfile) {
      setProfileData({ name: userProfile.name });
    }
    setErrors({});
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileData.name.trim()) {
      setErrors({ profile: 'Name is required' });
      return;
    }

    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordChange = () => {
    setIsChangingPassword(true);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
  };

  const handlePasswordCancel = () => {
    setIsChangingPassword(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      changePasswordMutation.mutate({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div id="profile-loading" className="p-6">
        <div className="flex items-center space-x-3">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-gray-700">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div id="profile-error" className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading profile information
        </div>
      </div>
    );
  }

  return (
    <div id="user-profile-page" className="p-6">
      {/* Header */}
      <div id="profile-header" className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and security settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div id="profile-info-section" className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
            {!isEditingProfile && (
              <button
                id="edit-profile-btn"
                onClick={handleProfileEdit}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div id="profile-name-field">
                <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="profile-name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                />
                {errors.profile && (
                  <p className="mt-1 text-sm text-red-600">{errors.profile}</p>
                )}
              </div>

              <div id="profile-form-actions" className="flex space-x-3">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleProfileCancel}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <p className="mt-1 text-gray-900">{userProfile.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <p className="mt-1 text-gray-900">{userProfile.email}</p>
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Member Since</label>
                <p className="mt-1 text-gray-900">{formatDate(userProfile.created_at)}</p>
              </div>
              {userProfile.last_login && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Login</label>
                  <p className="mt-1 text-gray-900">{formatDate(userProfile.last_login)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account Security */}
        <div id="security-section" className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Account Security</h2>
            {!isChangingPassword && (
              <button
                id="change-password-btn"
                onClick={handlePasswordChange}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Change Password
              </button>
            )}
          </div>

          {isChangingPassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div id="current-password-field">
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  id="current-password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current password"
                />
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                )}
              </div>

              <div id="new-password-field">
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  id="new-password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new password (min 6 characters)"
                />
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                )}
              </div>

              <div id="confirm-new-password-field">
                <label htmlFor="confirm-new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  id="confirm-new-password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm new password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {errors.password && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg">
                  {errors.password}
                </div>
              )}

              <div id="password-form-actions" className="flex space-x-3">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={handlePasswordCancel}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <p className="mt-1 text-gray-900">••••••••••••</p>
                <p className="text-xs text-gray-500">Last changed: Contact admin for details</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg">
                <p className="text-sm">
                  <strong>Security Tip:</strong> Use a strong password with at least 6 characters including letters, numbers, and symbols.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Statistics */}
      {userProfile && (
        <div id="account-stats-section" className="mt-6 bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500">Total Tokens Used</label>
              <p className="text-2xl font-semibold text-gray-900">
                {userProfile.total_tokens_used?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500">Deviation Score</label>
              <p className={`text-2xl font-semibold ${
                (userProfile.current_deviation_score || 0) > 0.7 ? 'text-red-600' : 
                (userProfile.current_deviation_score || 0) > 0.5 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {(userProfile.current_deviation_score || 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};