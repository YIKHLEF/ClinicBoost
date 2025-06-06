/**
 * User Management Service
 * 
 * This module provides comprehensive user management including:
 * - User CRUD operations
 * - Role-based access control
 * - Permission management
 * - User authentication and authorization
 * - Profile management
 * - Activity tracking
 */

import { logger } from '../logging-monitoring';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  department?: string;
  title?: string;
  status: UserStatus;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  settings: UserSettings;
  preferences: UserPreferences;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  level: number; // 1-10, higher = more access
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: PermissionAction;
  conditions?: PermissionCondition[];
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXECUTE = 'execute',
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'starts_with';
  value: any;
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
  LOCKED = 'locked',
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  appointments: boolean;
  reminders: boolean;
  marketing: boolean;
  security: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'team';
  activityTracking: boolean;
  dataSharing: boolean;
  analyticsOptOut: boolean;
}

export interface UserPreferences {
  dashboardLayout: string;
  defaultView: string;
  itemsPerPage: number;
  autoSave: boolean;
  shortcuts: Record<string, string>;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  department?: string;
  title?: string;
  sendWelcomeEmail?: boolean;
  temporaryPassword?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleId?: string;
  department?: string;
  title?: string;
  status?: UserStatus;
  settings?: Partial<UserSettings>;
  preferences?: Partial<UserPreferences>;
}

export interface UserSearchFilters {
  query?: string;
  role?: string;
  department?: string;
  status?: UserStatus;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface UserSearchResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

class UserManagementService {
  private users: Map<string, User> = new Map();
  private roles: Map<string, UserRole> = new Map();
  private permissions: Map<string, Permission> = new Map();

  constructor() {
    this.initializeDefaultRoles();
    this.initializeDefaultPermissions();
    this.loadMockUsers();
  }

  /**
   * Initialize default system roles
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: UserRole[] = [
      {
        id: 'super-admin',
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        permissions: [],
        level: 10,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Administrative access to manage users and settings',
        permissions: [],
        level: 8,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'doctor',
        name: 'Doctor',
        description: 'Medical professional with patient care access',
        permissions: [],
        level: 7,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'nurse',
        name: 'Nurse',
        description: 'Nursing staff with patient care access',
        permissions: [],
        level: 6,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'receptionist',
        name: 'Receptionist',
        description: 'Front desk staff with appointment and patient management',
        permissions: [],
        level: 4,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'billing',
        name: 'Billing Specialist',
        description: 'Billing and financial management access',
        permissions: [],
        level: 5,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access to basic information',
        permissions: [],
        level: 2,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultRoles.forEach(role => {
      this.roles.set(role.id, role);
    });
  }

  /**
   * Initialize default permissions
   */
  private initializeDefaultPermissions(): void {
    const resources = [
      'users', 'patients', 'appointments', 'medical_records', 'billing',
      'reports', 'settings', 'integrations', 'campaigns', 'messaging'
    ];

    const actions = Object.values(PermissionAction);

    resources.forEach(resource => {
      actions.forEach(action => {
        const permission: Permission = {
          id: `${resource}:${action}`,
          name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
          description: `Permission to ${action} ${resource}`,
          resource,
          action,
        };
        this.permissions.set(permission.id, permission);
      });
    });

    // Assign permissions to roles
    this.assignPermissionsToRoles();
  }

  /**
   * Assign permissions to roles based on role level
   */
  private assignPermissionsToRoles(): void {
    const allPermissions = Array.from(this.permissions.values());

    this.roles.forEach(role => {
      switch (role.id) {
        case 'super-admin':
          role.permissions = [...allPermissions];
          break;
        case 'admin':
          role.permissions = allPermissions.filter(p => 
            !p.resource.includes('system') || p.action !== PermissionAction.DELETE
          );
          break;
        case 'doctor':
          role.permissions = allPermissions.filter(p => 
            ['patients', 'appointments', 'medical_records', 'reports'].includes(p.resource)
          );
          break;
        case 'nurse':
          role.permissions = allPermissions.filter(p => 
            ['patients', 'appointments', 'medical_records'].includes(p.resource) &&
            p.action !== PermissionAction.DELETE
          );
          break;
        case 'receptionist':
          role.permissions = allPermissions.filter(p => 
            ['patients', 'appointments'].includes(p.resource)
          );
          break;
        case 'billing':
          role.permissions = allPermissions.filter(p => 
            ['patients', 'billing', 'reports'].includes(p.resource)
          );
          break;
        case 'viewer':
          role.permissions = allPermissions.filter(p => 
            p.action === PermissionAction.READ
          );
          break;
      }
    });
  }

  /**
   * Load mock users for development
   */
  private loadMockUsers(): void {
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@clinicboost.com',
        firstName: 'System',
        lastName: 'Administrator',
        role: this.roles.get('super-admin')!,
        permissions: this.roles.get('super-admin')!.permissions,
        status: UserStatus.ACTIVE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        createdBy: 'system',
        settings: this.getDefaultSettings(),
        preferences: this.getDefaultPreferences(),
      },
      {
        id: '2',
        email: 'dr.smith@clinicboost.com',
        firstName: 'John',
        lastName: 'Smith',
        title: 'Chief Medical Officer',
        department: 'Medical',
        role: this.roles.get('doctor')!,
        permissions: this.roles.get('doctor')!.permissions,
        status: UserStatus.ACTIVE,
        lastLogin: new Date(),
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date(),
        createdBy: '1',
        settings: this.getDefaultSettings(),
        preferences: this.getDefaultPreferences(),
      },
      {
        id: '3',
        email: 'nurse.johnson@clinicboost.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        title: 'Head Nurse',
        department: 'Nursing',
        role: this.roles.get('nurse')!,
        permissions: this.roles.get('nurse')!.permissions,
        status: UserStatus.ACTIVE,
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date(),
        createdBy: '1',
        settings: this.getDefaultSettings(),
        preferences: this.getDefaultPreferences(),
      },
      {
        id: '4',
        email: 'reception@clinicboost.com',
        firstName: 'Emily',
        lastName: 'Davis',
        title: 'Receptionist',
        department: 'Front Desk',
        role: this.roles.get('receptionist')!,
        permissions: this.roles.get('receptionist')!.permissions,
        status: UserStatus.ACTIVE,
        lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date(),
        createdBy: '1',
        settings: this.getDefaultSettings(),
        preferences: this.getDefaultPreferences(),
      },
      {
        id: '5',
        email: 'billing@clinicboost.com',
        firstName: 'Michael',
        lastName: 'Brown',
        title: 'Billing Specialist',
        department: 'Finance',
        role: this.roles.get('billing')!,
        permissions: this.roles.get('billing')!.permissions,
        status: UserStatus.INACTIVE,
        lastLogin: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date(),
        createdBy: '1',
        settings: this.getDefaultSettings(),
        preferences: this.getDefaultPreferences(),
      },
    ];

    mockUsers.forEach(user => {
      this.users.set(user.id, user);
    });
  }

  /**
   * Get default user settings
   */
  private getDefaultSettings(): UserSettings {
    return {
      theme: 'system',
      language: 'en',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      notifications: {
        email: true,
        sms: false,
        push: true,
        appointments: true,
        reminders: true,
        marketing: false,
        security: true,
      },
      privacy: {
        profileVisibility: 'team',
        activityTracking: true,
        dataSharing: false,
        analyticsOptOut: false,
      },
    };
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
      dashboardLayout: 'default',
      defaultView: 'dashboard',
      itemsPerPage: 25,
      autoSave: true,
      shortcuts: {},
    };
  }

  /**
   * Create a new user
   */
  async createUser(request: CreateUserRequest, createdBy: string): Promise<User> {
    try {
      // Validate email uniqueness
      const existingUser = Array.from(this.users.values()).find(u => u.email === request.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate role exists
      const role = this.roles.get(request.roleId);
      if (!role) {
        throw new Error('Invalid role specified');
      }

      const userId = this.generateUserId();
      const now = new Date();

      const user: User = {
        id: userId,
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        phone: request.phone,
        role,
        permissions: role.permissions,
        department: request.department,
        title: request.title,
        status: UserStatus.PENDING,
        createdAt: now,
        updatedAt: now,
        createdBy,
        settings: this.getDefaultSettings(),
        preferences: this.getDefaultPreferences(),
      };

      this.users.set(userId, user);

      // Send welcome email if requested
      if (request.sendWelcomeEmail) {
        await this.sendWelcomeEmail(user, request.temporaryPassword);
      }

      logger.info('User created successfully', 'user-management', {
        userId,
        email: request.email,
        role: request.roleId,
        createdBy,
      });

      return user;
    } catch (error) {
      logger.error('Failed to create user', 'user-management', { error, request });
      throw error;
    }
  }

  /**
   * Update an existing user
   */
  async updateUser(userId: string, request: UpdateUserRequest, updatedBy: string): Promise<User> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate role if provided
      if (request.roleId) {
        const role = this.roles.get(request.roleId);
        if (!role) {
          throw new Error('Invalid role specified');
        }
        user.role = role;
        user.permissions = role.permissions;
      }

      // Update user fields
      if (request.firstName !== undefined) user.firstName = request.firstName;
      if (request.lastName !== undefined) user.lastName = request.lastName;
      if (request.phone !== undefined) user.phone = request.phone;
      if (request.department !== undefined) user.department = request.department;
      if (request.title !== undefined) user.title = request.title;
      if (request.status !== undefined) user.status = request.status;

      // Update settings and preferences
      if (request.settings) {
        user.settings = { ...user.settings, ...request.settings };
      }
      if (request.preferences) {
        user.preferences = { ...user.preferences, ...request.preferences };
      }

      user.updatedAt = new Date();

      this.users.set(userId, user);

      logger.info('User updated successfully', 'user-management', {
        userId,
        updatedBy,
        changes: Object.keys(request),
      });

      return user;
    } catch (error) {
      logger.error('Failed to update user', 'user-management', { error, userId, request });
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deletion of system admin
      if (user.role.id === 'super-admin') {
        throw new Error('Cannot delete super administrator');
      }

      this.users.delete(userId);

      logger.info('User deleted successfully', 'user-management', {
        userId,
        email: user.email,
        deletedBy,
      });
    } catch (error) {
      logger.error('Failed to delete user', 'user-management', { error, userId });
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(u => u.email === email) || null;
  }

  /**
   * Search users with filters
   */
  async searchUsers(
    filters: UserSearchFilters = {},
    page: number = 1,
    limit: number = 25
  ): Promise<UserSearchResult> {
    let users = Array.from(this.users.values());

    // Apply filters
    if (filters.query) {
      const query = filters.query.toLowerCase();
      users = users.filter(user => 
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    if (filters.role) {
      users = users.filter(user => user.role.id === filters.role);
    }

    if (filters.department) {
      users = users.filter(user => user.department === filters.department);
    }

    if (filters.status) {
      users = users.filter(user => user.status === filters.status);
    }

    if (filters.createdAfter) {
      users = users.filter(user => user.createdAt >= filters.createdAfter!);
    }

    if (filters.createdBefore) {
      users = users.filter(user => user.createdAt <= filters.createdBefore!);
    }

    if (filters.lastLoginAfter && filters.lastLoginBefore) {
      users = users.filter(user => 
        user.lastLogin && 
        user.lastLogin >= filters.lastLoginAfter! &&
        user.lastLogin <= filters.lastLoginBefore!
      );
    }

    // Sort by creation date (newest first)
    users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Pagination
    const total = users.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      users: paginatedUsers,
      total,
      page,
      limit,
      hasMore: endIndex < total,
    };
  }

  /**
   * Get all roles
   */
  async getRoles(): Promise<UserRole[]> {
    return Array.from(this.roles.values());
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId: string): Promise<UserRole | null> {
    return this.roles.get(roleId) || null;
  }

  /**
   * Get all permissions
   */
  async getPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: User, resource: string, action: PermissionAction): boolean {
    return user.permissions.some(permission => 
      permission.resource === resource && permission.action === action
    );
  }

  /**
   * Check if user has any permission for resource
   */
  hasAnyPermission(user: User, resource: string): boolean {
    return user.permissions.some(permission => permission.resource === resource);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    byRole: Record<string, number>;
    byDepartment: Record<string, number>;
  }> {
    const users = Array.from(this.users.values());
    
    const stats = {
      total: users.length,
      active: users.filter(u => u.status === UserStatus.ACTIVE).length,
      inactive: users.filter(u => u.status === UserStatus.INACTIVE).length,
      pending: users.filter(u => u.status === UserStatus.PENDING).length,
      byRole: {} as Record<string, number>,
      byDepartment: {} as Record<string, number>,
    };

    // Count by role
    users.forEach(user => {
      stats.byRole[user.role.name] = (stats.byRole[user.role.name] || 0) + 1;
    });

    // Count by department
    users.forEach(user => {
      if (user.department) {
        stats.byDepartment[user.department] = (stats.byDepartment[user.department] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Send welcome email to new user
   */
  private async sendWelcomeEmail(user: User, temporaryPassword?: string): Promise<void> {
    try {
      const { sendWelcomeEmail } = await import('../email');

      const emailSent = await sendWelcomeEmail(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        patientId: user.id,
        temporaryPassword,
        portalUrl: `${window.location.origin}/login`,
        clinicName: 'ClinicBoost',
        clinicPhone: '+212 5 22 XX XX XX',
        clinicEmail: 'support@clinicboost.com',
      });

      if (emailSent) {
        logger.info('Welcome email sent successfully', 'user-management', {
          userId: user.id,
          email: user.email,
          hasTemporaryPassword: !!temporaryPassword,
        });
      } else {
        logger.warn('Failed to send welcome email', 'user-management', {
          userId: user.id,
          email: user.email,
        });
      }
    } catch (error: any) {
      logger.error('Error sending welcome email', 'user-management', {
        userId: user.id,
        email: user.email,
        error: error.message,
      });
    }
  }

  /**
   * Generate unique user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const userService = new UserManagementService();

// Export utility functions
export const createUser = (request: CreateUserRequest, createdBy: string) =>
  userService.createUser(request, createdBy);

export const updateUser = (userId: string, request: UpdateUserRequest, updatedBy: string) =>
  userService.updateUser(userId, request, updatedBy);

export const deleteUser = (userId: string, deletedBy: string) =>
  userService.deleteUser(userId, deletedBy);

export const getUserById = (userId: string) => userService.getUserById(userId);

export const getUserByEmail = (email: string) => userService.getUserByEmail(email);

export const searchUsers = (filters?: UserSearchFilters, page?: number, limit?: number) =>
  userService.searchUsers(filters, page, limit);

export const getRoles = () => userService.getRoles();

export const getPermissions = () => userService.getPermissions();

export const hasPermission = (user: User, resource: string, action: PermissionAction) =>
  userService.hasPermission(user, resource, action);

export const hasAnyPermission = (user: User, resource: string) =>
  userService.hasAnyPermission(user, resource);
