import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserService } from '../../services/users';
import type { CreateUserRequest } from '../../services/users';
import { InvitationService } from '../../services/invitations';
import { UsersTable } from '../../components/tables/UsersTable';
import { CreateUserModal } from '../../components/forms/CreateUserModal';
import type { User } from '../../types/auth';
import type { CreateInvitationRequest } from '../../services/invitations';
import '../../styles/users.css';

type ModalType = 'create' | 'invite' | null;

export const Users: React.FC = () => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: UserService.getUsers,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: UserService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalType(null);
    },
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: InvitationService.createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalType(null);
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: number; reason: string }) =>
      UserService.blockUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: UserService.unblockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = (userData: CreateUserRequest) => {
    createUserMutation.mutate(userData);
  };

  const handleCreateInvitation = (invitationData: CreateInvitationRequest) => {
    createInvitationMutation.mutate(invitationData);
  };

  const handleBlockUser = (userId: number, reason: string) => {
    blockUserMutation.mutate({ userId, reason });
  };

  const handleUnblockUser = (userId: number) => {
    unblockUserMutation.mutate(userId);
  };

  const handleEditUser = (user: User) => {
    // TODO: Implement edit user modal
    alert(`Edit User functionality coming soon!\n\nUser: ${user.name}\nEmail: ${user.email}`);
  };

  if (error) {
    return (
      <div id="users-error" className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading users: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div id="admin-users-page" className="p-6">
      {/* Page Header */}
      <div id="users-header" className="mb-6">
        <div id="users-title-section" className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage users, quotas, and access permissions</p>
          </div>
          <div className="flex gap-3">
            <button
              id="create-user-btn"
              onClick={() => setModalType('create')}
            >
              + Create User
            </button>
            <button
              id="invite-user-btn"
              onClick={() => setModalType('invite')}
            >
              + Invite User
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div id="users-controls" className="flex flex-col sm:flex-row gap-4">
          <div id="search-section" className="flex-1">
            <input
              type="text"
              id="users-search"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div id="users-stats" className="flex items-center space-x-4 text-sm text-gray-600">
            <span>Total: {users.length}</span>
            <span>Active: {users.filter(u => u.is_active && !u.is_blocked).length}</span>
            <span>Blocked: {users.filter(u => u.is_blocked).length}</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div id="users-table-section" className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredUsers.length === 0 && !isLoading ? (
          <div id="no-users-found" className="text-center py-12">
            <p className="text-gray-500">
              {searchTerm ? 'No users found matching your search.' : 'No users found.'}
            </p>
          </div>
        ) : (
          <UsersTable
            users={filteredUsers}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            onEditUser={handleEditUser}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Create/Invite User Modal */}
      <CreateUserModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        mode={modalType || 'invite'}
        onSubmitUser={handleCreateUser}
        onSubmitInvitation={handleCreateInvitation}
        isLoading={createUserMutation.isPending || createInvitationMutation.isPending}
      />

      {/* Loading overlay for mutations */}
      {(blockUserMutation.isPending || unblockUserMutation.isPending) && (
        <div id="mutation-loading" className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin border-2 border-blue-500 border-t-transparent rounded-full w-5 h-5"></div>
              <span className="text-gray-700">
                {blockUserMutation.isPending ? 'Blocking user...' : 'Unblocking user...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};