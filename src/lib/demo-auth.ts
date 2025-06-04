/**
 * Demo Authentication System
 * Provides working demo credentials for testing the application
 */

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'dentist' | 'staff' | 'billing';
  avatar?: string;
  phone?: string;
  department?: string;
}

// Demo users with different roles
export const DEMO_USERS: DemoUser[] = [
  {
    id: 'demo-admin-001',
    email: 'admin@clinicboost.demo',
    password: 'demo123',
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 123-4567',
    department: 'Administration'
  },
  {
    id: 'demo-dentist-001',
    email: 'dentist@clinicboost.demo',
    password: 'demo123',
    firstName: 'Dr. Michael',
    lastName: 'Chen',
    role: 'dentist',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 234-5678',
    department: 'General Dentistry'
  },
  {
    id: 'demo-staff-001',
    email: 'staff@clinicboost.demo',
    password: 'demo123',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    role: 'staff',
    avatar: 'https://images.unsplash.com/photo-1594824388853-d0c2b7b5e6b7?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 345-6789',
    department: 'Patient Care'
  },
  {
    id: 'demo-billing-001',
    email: 'billing@clinicboost.demo',
    password: 'demo123',
    firstName: 'James',
    lastName: 'Wilson',
    role: 'billing',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    phone: '+1 (555) 456-7890',
    department: 'Billing & Finance'
  }
];

export class DemoAuthService {
  private currentUser: DemoUser | null = null;
  private isAuthenticated = false;

  constructor() {
    // Check for existing session
    this.loadSession();
  }

  /**
   * Load session from localStorage
   */
  private loadSession(): void {
    try {
      const savedUser = localStorage.getItem('demo_user');
      const savedAuth = localStorage.getItem('demo_authenticated');
      
      if (savedUser && savedAuth === 'true') {
        this.currentUser = JSON.parse(savedUser);
        this.isAuthenticated = true;
      }
    } catch (error) {
      console.warn('Failed to load demo session:', error);
      this.clearSession();
    }
  }

  /**
   * Save session to localStorage
   */
  private saveSession(): void {
    if (this.currentUser && this.isAuthenticated) {
      localStorage.setItem('demo_user', JSON.stringify(this.currentUser));
      localStorage.setItem('demo_authenticated', 'true');
    }
  }

  /**
   * Clear session from localStorage
   */
  private clearSession(): void {
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_authenticated');
    this.currentUser = null;
    this.isAuthenticated = false;
  }

  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<DemoUser> {
    console.log('Demo auth login attempt:', { email, password });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const user = DEMO_USERS.find(u =>
      u.email.toLowerCase() === email.toLowerCase() &&
      u.password === password
    );

    console.log('Demo user found:', user);

    if (!user) {
      console.log('Available demo users:', DEMO_USERS.map(u => ({ email: u.email, password: u.password })));
      throw new Error('Invalid email or password');
    }

    this.currentUser = user;
    this.isAuthenticated = true;
    this.saveSession();

    console.log('Demo login successful, user set:', this.currentUser);
    return user;
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.clearSession();
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): DemoUser | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get all demo users (for admin purposes)
   */
  getAllDemoUsers(): DemoUser[] {
    return DEMO_USERS;
  }

  /**
   * Check if email exists in demo users
   */
  emailExists(email: string): boolean {
    return DEMO_USERS.some(u => u.email.toLowerCase() === email.toLowerCase());
  }

  /**
   * Get user by email
   */
  getUserByEmail(email: string): DemoUser | undefined {
    return DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  /**
   * Update user profile (demo only)
   */
  async updateProfile(updates: Partial<DemoUser>): Promise<DemoUser> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    this.currentUser = { ...this.currentUser, ...updates };
    this.saveSession();

    return this.currentUser;
  }

  /**
   * Reset password (demo - just returns success)
   */
  async resetPassword(email: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!this.emailExists(email)) {
      throw new Error('Email not found');
    }

    // In demo mode, just return success
    console.log(`Password reset email sent to ${email} (demo mode)`);
  }

  /**
   * Sign up new user (demo - not implemented)
   */
  async signUp(email: string, password: string, userData: any): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    throw new Error('Sign up is not available in demo mode. Please use existing demo credentials.');
  }
}

// Export singleton instance
export const demoAuth = new DemoAuthService();

// Demo credentials for easy access
export const DEMO_CREDENTIALS = {
  admin: {
    email: 'admin@clinicboost.demo',
    password: 'demo123',
    role: 'Administrator'
  },
  dentist: {
    email: 'dentist@clinicboost.demo',
    password: 'demo123',
    role: 'Dentist'
  },
  staff: {
    email: 'staff@clinicboost.demo',
    password: 'demo123',
    role: 'Staff Member'
  },
  billing: {
    email: 'billing@clinicboost.demo',
    password: 'demo123',
    role: 'Billing Specialist'
  }
};
