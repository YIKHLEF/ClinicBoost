import React from 'react';
import { Button } from '../ui/Button';
import {
  X,
  Edit,
  Mail,
  Phone,
  Shield,
  Building,
  Briefcase,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  Activity,
  Key,
} from 'lucide-react';
import {
  type User as UserType,
  UserStatus,
} from '../../lib/user-management/user-service';
import { useRBAC, ProtectedComponent } from '../../hooks/useRBAC';

interface UserDetailsProps {
  user: UserType;
  onClose: () => void;
  onEdit: () => void;
}

export const UserDetails: React.FC<UserDetailsProps> = ({ user, onClose, onEdit }) => {
  const rbac = useRBAC();

  // Get status icon and color
  const getStatusDisplay = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return {
          icon: <CheckCircle className="text-green-600" size={16} />,
          color: 'text-green-600 bg-green-100 dark:bg-green-900/20',
          text: 'Active',
        };
      case UserStatus.INACTIVE:
        return {
          icon: <XCircle className="text-gray-400" size={16} />,
          color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20',
          text: 'Inactive',
        };
      case UserStatus.SUSPENDED:
        return {
          icon: <XCircle className="text-red-600" size={16} />,
          color: 'text-red-600 bg-red-100 dark:bg-red-900/20',
          text: 'Suspended',
        };
      case UserStatus.PENDING:
        return {
          icon: <Clock className="text-yellow-600" size={16} />,
          color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
          text: 'Pending',
        };
      case UserStatus.LOCKED:
        return {
          icon: <AlertTriangle className="text-red-600" size={16} />,
          color: 'text-red-600 bg-red-100 dark:bg-red-900/20',
          text: 'Locked',
        };
      default:
        return {
          icon: <XCircle className="text-gray-400" size={16} />,
          color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20',
          text: 'Unknown',
        };
    }
  };

  const statusDisplay = getStatusDisplay(user.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <span className="text-lg font-medium text-primary-600 dark:text-primary-400">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ProtectedComponent resource="users" action="update">
              <Button onClick={onEdit}>
                <Edit size={16} className="mr-2" />
                Edit User
              </Button>
            </ProtectedComponent>
            
            <Button variant="ghost" onClick={onClose}>
              <X size={20} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Basic Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                      <p className="text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Mail className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white">{user.email}</p>
                    </div>
                  </div>
                  
                  {user.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="text-gray-400" size={16} />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="text-gray-900 dark:text-white">{user.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Activity className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <div className="flex items-center space-x-2">
                        {statusDisplay.icon}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.color}`}>
                          {statusDisplay.text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Information */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Organization
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                      <p className="text-gray-900 dark:text-white">{user.role.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.role.description}
                      </p>
                    </div>
                  </div>
                  
                  {user.department && (
                    <div className="flex items-center space-x-3">
                      <Building className="text-gray-400" size={16} />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                        <p className="text-gray-900 dark:text-white">{user.department}</p>
                      </div>
                    </div>
                  )}
                  
                  {user.title && (
                    <div className="flex items-center space-x-3">
                      <Briefcase className="text-gray-400" size={16} />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Job Title</p>
                        <p className="text-gray-900 dark:text-white">{user.title}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Key className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Role Level</p>
                      <p className="text-gray-900 dark:text-white">Level {user.role.level}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Account Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                      <p className="text-gray-900 dark:text-white">
                        {user.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Last Login</p>
                      <p className="text-gray-900 dark:text-white">
                        {user.lastLogin ? user.lastLogin.toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                      <p className="text-gray-900 dark:text-white">
                        {user.updatedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Permissions */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Permissions
                </h3>
                
                <div className="space-y-2">
                  {user.permissions.slice(0, 10).map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {permission.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {permission.resource}:{permission.action}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {user.permissions.length > 10 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      +{user.permissions.length - 10} more permissions
                    </p>
                  )}
                </div>
              </div>

              {/* User Settings */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Settings
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Theme</span>
                    <span className="text-sm text-gray-900 dark:text-white capitalize">
                      {user.settings.theme}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Language</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.settings.language.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Timezone</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.settings.timezone}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Email Notifications</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.settings.notifications.email ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">SMS Notifications</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {user.settings.notifications.sms ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                
                <div className="space-y-2">
                  <ProtectedComponent resource="users" action="update">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Settings size={14} className="mr-2" />
                      Reset Password
                    </Button>
                  </ProtectedComponent>
                  
                  <ProtectedComponent resource="users" action="update">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Mail size={14} className="mr-2" />
                      Send Welcome Email
                    </Button>
                  </ProtectedComponent>
                  
                  <ProtectedComponent resource="users" action="update">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Activity size={14} className="mr-2" />
                      View Activity Log
                    </Button>
                  </ProtectedComponent>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
