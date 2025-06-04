import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Shield,
  UserCheck,
  UserX,
  Clock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MoreVertical,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  type User,
  type UserRole,
  type UserSearchFilters,
  type UserSearchResult,
  UserStatus,
  searchUsers,
  getRoles,
  deleteUser,
  userService,
} from '../../lib/user-management/user-service';
import { useRBAC, ProtectedComponent } from '../../hooks/useRBAC';
import { UserForm } from './UserForm';
import { UserDetails } from './UserDetails';

export const UserManagement: React.FC = () => {
  const { addToast } = useToast();
  const rbac = useRBAC();
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [searchResult, setSearchResult] = useState<UserSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<UserStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Load users and roles
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const filters: UserSearchFilters = {};
      if (searchQuery) filters.query = searchQuery;
      if (selectedRole) filters.role = selectedRole;
      if (selectedDepartment) filters.department = selectedDepartment;
      if (selectedStatus) filters.status = selectedStatus;

      const [usersResult, rolesData] = await Promise.all([
        searchUsers(filters, currentPage, itemsPerPage),
        getRoles(),
      ]);

      setSearchResult(usersResult);
      setUsers(usersResult.users);
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load users:', error);
      addToast({
        type: 'error',
        title: 'Failed to load users',
        message: 'Unable to retrieve user data.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedRole, selectedDepartment, selectedStatus, currentPage, itemsPerPage, addToast]);

  // Load data on mount and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle user creation
  const handleCreateUser = useCallback(() => {
    setEditingUser(null);
    setShowUserForm(true);
  }, []);

  // Handle user editing
  const handleEditUser = useCallback((user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  }, []);

  // Handle user deletion
  const handleDeleteUser = useCallback(async (user: User) => {
    if (!rbac.canDeleteUsers) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'You do not have permission to delete users.',
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      try {
        await deleteUser(user.id, rbac.user?.id || 'unknown');
        await loadData();
        
        addToast({
          type: 'success',
          title: 'User Deleted',
          message: `${user.firstName} ${user.lastName} has been deleted.`,
        });
      } catch (error) {
        console.error('Failed to delete user:', error);
        addToast({
          type: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete user. Please try again.',
        });
      }
    }
  }, [rbac, addToast, loadData]);

  // Handle user details view
  const handleViewUser = useCallback((user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  }, []);

  // Handle form close
  const handleFormClose = useCallback(() => {
    setShowUserForm(false);
    setEditingUser(null);
    loadData();
  }, [loadData]);

  // Handle details close
  const handleDetailsClose = useCallback(() => {
    setShowUserDetails(false);
    setSelectedUser(null);
  }, []);

  // Get status icon
  const getStatusIcon = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return <CheckCircle className="text-green-600" size={16} />;
      case UserStatus.INACTIVE:
        return <XCircle className="text-gray-400" size={16} />;
      case UserStatus.SUSPENDED:
        return <XCircle className="text-red-600" size={16} />;
      case UserStatus.PENDING:
        return <Clock className="text-yellow-600" size={16} />;
      case UserStatus.LOCKED:
        return <AlertTriangle className="text-red-600" size={16} />;
      default:
        return <XCircle className="text-gray-400" size={16} />;
    }
  };

  // Get status color
  const getStatusColor = (status: UserStatus): string => {
    switch (status) {
      case UserStatus.ACTIVE:
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case UserStatus.INACTIVE:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
      case UserStatus.SUSPENDED:
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case UserStatus.PENDING:
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case UserStatus.LOCKED:
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  // Get unique departments
  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage users, roles, and permissions
          </p>
        </div>
        
        <div className="flex space-x-3">
          <ProtectedComponent resource="users" action="create">
            <Button onClick={handleCreateUser}>
              <Plus size={16} className="mr-2" />
              Add User
            </Button>
          </ProtectedComponent>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as UserStatus | '')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value={UserStatus.ACTIVE}>Active</option>
            <option value={UserStatus.INACTIVE}>Inactive</option>
            <option value={UserStatus.PENDING}>Pending</option>
            <option value={UserStatus.SUSPENDED}>Suspended</option>
            <option value={UserStatus.LOCKED}>Locked</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Users ({searchResult?.total || 0})
            </h2>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download size={14} className="mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Upload size={14} className="mr-2" />
                Import
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                        {user.title && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            {user.title}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield size={14} className="text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.role.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {user.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(user.status)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <ProtectedComponent resource="users" action="read">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye size={14} />
                        </Button>
                      </ProtectedComponent>
                      
                      <ProtectedComponent resource="users" action="update">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit size={14} />
                        </Button>
                      </ProtectedComponent>
                      
                      <ProtectedComponent resource="users" action="delete">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </ProtectedComponent>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {searchResult && searchResult.total > itemsPerPage && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, searchResult.total)} of {searchResult.total} users
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {Math.ceil(searchResult.total / itemsPerPage)}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!searchResult.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={editingUser}
          roles={roles}
          onClose={handleFormClose}
        />
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <UserDetails
          user={selectedUser}
          onClose={handleDetailsClose}
          onEdit={() => {
            handleDetailsClose();
            handleEditUser(selectedUser);
          }}
        />
      )}
    </div>
  );
};
