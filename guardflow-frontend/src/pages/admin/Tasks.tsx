import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TasksService, type Task, type TaskFilters, type CreateTaskRequest, type AssignTaskRequest } from '../../services/tasks';
import { TasksTable } from '../../components/tables/TasksTable';
import { TaskFormModal } from '../../components/forms/TaskFormModal';
import { TaskAssignmentModal } from '../../components/forms/TaskAssignmentModal';
import '../../styles/tasks.css';

export const Tasks: React.FC = () => {
  const [filters, setFilters] = useState<TaskFilters>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => TasksService.getTasks(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: TasksService.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateModalOpen(false);
      setSelectedTask(null);
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: number; updates: Partial<CreateTaskRequest> }) =>
      TasksService.updateTask(taskId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsCreateModalOpen(false);
      setSelectedTask(null);
      setIsEditing(false);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: TasksService.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Toggle task status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: TasksService.toggleTaskStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Assign task mutation
  const assignTaskMutation = useMutation({
    mutationFn: TasksService.assignTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsAssignModalOpen(false);
      setSelectedTask(null);
    },
  });

  const handleFilterChange = (newFilters: Partial<TaskFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsEditing(false);
    setIsCreateModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditing(true);
    setIsCreateModalOpen(true);
  };

  const handleDeleteTask = (taskId: number) => {
    if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleToggleStatus = (taskId: number) => {
    toggleStatusMutation.mutate(taskId);
  };

  const handleAssignTask = (task: Task) => {
    setSelectedTask(task);
    setIsAssignModalOpen(true);
  };

  const handleViewAssignments = (task: Task) => {
    // TODO: Implement assignments view modal
    alert(`View assignments for task: ${task.title}`);
  };

  const handleTaskSubmit = (taskData: CreateTaskRequest) => {
    if (isEditing && selectedTask) {
      updateTaskMutation.mutate({ taskId: selectedTask.id, updates: taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleAssignmentSubmit = (assignment: AssignTaskRequest) => {
    assignTaskMutation.mutate(assignment);
  };

  // Get unique categories and difficulty levels from tasks for filter dropdowns
  const uniqueCategories = Array.from(new Set(tasks.map(task => task.category)));
  const uniqueDifficulties = Array.from(new Set(tasks.map(task => task.difficulty_level)));

  if (error) {
    return (
      <div id="tasks-error" className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading tasks: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div id="admin-tasks-page" className="p-6">
      {/* Page Header */}
      <div id="tasks-header" className="mb-6">
        <div id="tasks-title-section" className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
            <p className="text-gray-600">Create, manage, and assign tasks to users</p>
          </div>
          <div className="flex space-x-3">
            <button
              id="refresh-tasks-btn"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🔄 Refresh
            </button>
            <button
              id="create-task-btn"
              onClick={handleCreateTask}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              ➕ Create Task
            </button>
          </div>
        </div>

        {/* Filters */}
        <div id="tasks-filters" className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div id="category-filter" className="flex-1 min-w-40">
              <label htmlFor="category-select" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category-select"
                value={filters.category || ''}
                onChange={(e) => handleFilterChange({ category: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {TasksService.getTaskCategories().map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div id="difficulty-filter" className="flex-1 min-w-40">
              <label htmlFor="difficulty-select" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                id="difficulty-select"
                value={filters.difficulty_level || ''}
                onChange={(e) => handleFilterChange({ difficulty_level: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Levels</option>
                {TasksService.getDifficultyLevels().map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div id="status-filter" className="flex-1 min-w-32">
              <label htmlFor="status-select" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-select"
                value={filters.is_active !== undefined ? filters.is_active.toString() : ''}
                onChange={(e) => handleFilterChange({ 
                  is_active: e.target.value === '' ? undefined : e.target.value === 'true' 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            {/* Search */}
            <div id="search-filter" className="flex-1 min-w-64">
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
                Search Tasks
              </label>
              <input
                type="text"
                id="search-input"
                placeholder="Search by title or description..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange({ search: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                id="clear-filters-btn"
                onClick={handleClearFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div id="tasks-stats" className="flex items-center space-x-6 text-sm text-gray-600 mt-4">
          <span>Total Tasks: {tasks.length}</span>
          <span>Active: {tasks.filter(t => t.is_active).length}</span>
          <span>Inactive: {tasks.filter(t => !t.is_active).length}</span>
          {isLoading && <span className="text-blue-600">🔄 Loading...</span>}
        </div>
      </div>

      {/* Tasks Table */}
      <div id="tasks-table-section" className="bg-white rounded-lg shadow-sm border border-gray-200">
        {tasks.length === 0 && !isLoading ? (
          <div id="no-tasks-found" className="text-center py-12">
            <p className="text-gray-500 mb-4">No tasks found.</p>
            <button
              onClick={handleCreateTask}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create Your First Task
            </button>
          </div>
        ) : (
          <TasksTable
            tasks={tasks}
            isLoading={isLoading}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onToggleStatus={handleToggleStatus}
            onAssignTask={handleAssignTask}
            onViewAssignments={handleViewAssignments}
          />
        )}
      </div>

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedTask(null);
          setIsEditing(false);
        }}
        onSubmit={handleTaskSubmit}
        task={isEditing ? selectedTask : null}
        isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
      />

      {/* Task Assignment Modal */}
      <TaskAssignmentModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedTask(null);
        }}
        onSubmit={handleAssignmentSubmit}
        task={selectedTask}
        isLoading={assignTaskMutation.isPending}
      />
    </div>
  );
};