import React, { useState } from 'react';
import type { User } from '../../types/auth';

interface UsersTableProps {
  users: User[];
  onBlockUser: (userId: number, reason: string) => void;
  onUnblockUser: (userId: number) => void;
  onEditUser: (user: User) => void;
  isLoading?: boolean;
}

export const UsersTable: React.FC<UsersTableProps> = ({
  users,
  onBlockUser,
  onUnblockUser,
  onEditUser,
  isLoading = false
}) => {
  const [blockingUser, setBlockingUser] = useState<number | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const handleBlockClick = (userId: number) => {
    setBlockingUser(userId);
    setBlockReason('');
  };

  const handleBlockConfirm = () => {
    if (blockingUser && blockReason.trim()) {
      onBlockUser(blockingUser, blockReason.trim());
      setBlockingUser(null);
      setBlockReason('');
    }
  };

  const handleBlockCancel = () => {
    setBlockingUser(null);
    setBlockReason('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div id="users-table-loading" className="flex justify-center items-center py-12">
        <div className="animate-spin border-4 border-blue-500 border-t-transparent rounded-full w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div id="users-table-container">
      <div id="users-table-wrapper" className="overflow-x-auto">
        <table id="users-table" className="w-full border-collapse bg-white shadow-sm rounded-lg">
          <thead id="users-table-header">
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody id="users-table-body" className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} id={`user-row-${user.id}`} className="hover:bg-gray-50">
                <td id={`user-info-${user.id}`} className="px-6 py-4">
                  <div className="flex items-center">
                    <div id={`user-avatar-${user.id}`} className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                
                <td id={`user-quotas-${user.id}`} className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    <div>Daily: {user.daily_quota.toLocaleString()}</div>
                    <div>Monthly: {user.monthly_quota.toLocaleString()}</div>
                  </div>
                </td>
                
                <td id={`user-usage-${user.id}`} className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    <div>Daily: {user.current_daily_usage.toLocaleString()}</div>
                    <div>Monthly: {user.current_monthly_usage.toLocaleString()}</div>
                  </div>
                </td>
                
                <td id={`user-status-${user.id}`} className="px-6 py-4">
                  <div className="flex flex-col space-y-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {user.is_blocked && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Blocked
                      </span>
                    )}
                  </div>
                </td>
                
                <td id={`user-created-${user.id}`} className="px-6 py-4 text-sm text-gray-900">
                  {formatDate(user.created_at)}
                </td>
                
                <td id={`user-actions-${user.id}`} className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button
                      id={`edit-user-${user.id}`}
                      onClick={() => onEditUser(user)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    
                    {user.is_blocked ? (
                      <button
                        id={`unblock-user-${user.id}`}
                        onClick={() => onUnblockUser(user.id)}
                        className="text-green-600 hover:text-green-900 text-sm font-medium"
                      >
                        Unblock
                      </button>
                    ) : (
                      <button
                        id={`block-user-${user.id}`}
                        onClick={() => handleBlockClick(user.id)}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                      >
                        Block
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Block User Modal */}
      {blockingUser && (
        <div id="block-user-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div id="block-user-modal-content" className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Block User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for blocking this user:
            </p>
            <textarea
              id="block-reason-input"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Enter reason for blocking..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div id="block-modal-actions" className="flex justify-end space-x-3 mt-6">
              <button
                id="block-cancel-btn"
                onClick={handleBlockCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                id="block-confirm-btn"
                onClick={handleBlockConfirm}
                disabled={!blockReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};