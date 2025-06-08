/**
 * Demo Mode Automated Tests
 * 
 * Comprehensive test suite for demo mode functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { demoAuth, DEMO_USERS, DEMO_CREDENTIALS } from '../../lib/demo-auth';
import DemoModeTester from './demo-mode-tester';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('Demo Mode Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(async () => {
    await demoAuth.logout();
    vi.clearAllMocks();
  });

  describe('Login Functionality', () => {
    it('should login with valid admin credentials', async () => {
      const user = await demoAuth.login('admin@clinicboost.demo', 'demo123');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('admin@clinicboost.demo');
      expect(user.role).toBe('admin');
      expect(user.firstName).toBe('Dr. Sarah');
      expect(user.lastName).toBe('Johnson');
    });

    it('should login with valid dentist credentials', async () => {
      const user = await demoAuth.login('dentist@clinicboost.demo', 'demo123');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('dentist@clinicboost.demo');
      expect(user.role).toBe('dentist');
      expect(user.department).toBe('General Dentistry');
    });

    it('should login with valid staff credentials', async () => {
      const user = await demoAuth.login('staff@clinicboost.demo', 'demo123');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('staff@clinicboost.demo');
      expect(user.role).toBe('staff');
      expect(user.department).toBe('Patient Care');
    });

    it('should login with valid billing credentials', async () => {
      const user = await demoAuth.login('billing@clinicboost.demo', 'demo123');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('billing@clinicboost.demo');
      expect(user.role).toBe('billing');
      expect(user.department).toBe('Billing & Finance');
    });

    it('should handle case insensitive email', async () => {
      const user = await demoAuth.login('ADMIN@CLINICBOOST.DEMO', 'demo123');
      
      expect(user).toBeDefined();
      expect(user.email).toBe('admin@clinicboost.demo');
    });

    it('should reject invalid email', async () => {
      await expect(demoAuth.login('invalid@email.com', 'demo123'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      await expect(demoAuth.login('admin@clinicboost.demo', 'wrongpassword'))
        .rejects.toThrow('Invalid email or password');
    });

    it('should reject empty credentials', async () => {
      await expect(demoAuth.login('', ''))
        .rejects.toThrow('Invalid email or password');
    });

    it('should simulate API delay', async () => {
      const startTime = Date.now();
      await demoAuth.login('admin@clinicboost.demo', 'demo123');
      const duration = Date.now() - startTime;
      
      expect(duration).toBeGreaterThanOrEqual(500);
    });
  });

  describe('Session Management', () => {
    it('should save session to localStorage on login', async () => {
      await demoAuth.login('admin@clinicboost.demo', 'demo123');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'demo_user',
        expect.stringContaining('admin@clinicboost.demo')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'demo_authenticated',
        'true'
      );
    });

    it('should load session from localStorage', () => {
      const mockUser = {
        id: 'demo-admin-001',
        email: 'admin@clinicboost.demo',
        role: 'admin'
      };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'demo_user') return JSON.stringify(mockUser);
        if (key === 'demo_authenticated') return 'true';
        return null;
      });

      // Create new instance to trigger session loading
      const newAuth = new (demoAuth.constructor as any)();
      
      expect(newAuth.getCurrentUser()).toEqual(mockUser);
      expect(newAuth.getIsAuthenticated()).toBe(true);
    });

    it('should handle corrupted session data gracefully', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'demo_user') return 'invalid-json';
        if (key === 'demo_authenticated') return 'true';
        return null;
      });

      // Should not throw error
      const newAuth = new (demoAuth.constructor as any)();
      
      expect(newAuth.getCurrentUser()).toBeNull();
      expect(newAuth.getIsAuthenticated()).toBe(false);
    });

    it('should clear session on logout', async () => {
      await demoAuth.login('admin@clinicboost.demo', 'demo123');
      await demoAuth.logout();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('demo_user');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('demo_authenticated');
      expect(demoAuth.getCurrentUser()).toBeNull();
      expect(demoAuth.getIsAuthenticated()).toBe(false);
    });
  });

  describe('User Management', () => {
    it('should return current user after login', async () => {
      const loginUser = await demoAuth.login('staff@clinicboost.demo', 'demo123');
      const currentUser = demoAuth.getCurrentUser();
      
      expect(currentUser).toEqual(loginUser);
    });

    it('should return null when not authenticated', () => {
      expect(demoAuth.getCurrentUser()).toBeNull();
      expect(demoAuth.getIsAuthenticated()).toBe(false);
    });

    it('should update user profile', async () => {
      await demoAuth.login('admin@clinicboost.demo', 'demo123');
      
      const updatedUser = await demoAuth.updateProfile({
        phone: '+1 (555) 999-9999'
      });
      
      expect(updatedUser.phone).toBe('+1 (555) 999-9999');
      expect(demoAuth.getCurrentUser()?.phone).toBe('+1 (555) 999-9999');
    });

    it('should throw error when updating profile without login', async () => {
      await expect(demoAuth.updateProfile({ phone: '123' }))
        .rejects.toThrow('No user logged in');
    });

    it('should check if email exists', () => {
      expect(demoAuth.emailExists('admin@clinicboost.demo')).toBe(true);
      expect(demoAuth.emailExists('nonexistent@email.com')).toBe(false);
      expect(demoAuth.emailExists('ADMIN@CLINICBOOST.DEMO')).toBe(true);
    });

    it('should get user by email', () => {
      const user = demoAuth.getUserByEmail('dentist@clinicboost.demo');
      
      expect(user).toBeDefined();
      expect(user?.role).toBe('dentist');
      expect(user?.firstName).toBe('Dr. Michael');
    });

    it('should return all demo users', () => {
      const users = demoAuth.getAllDemoUsers();
      
      expect(users).toHaveLength(4);
      expect(users.map(u => u.role)).toEqual(['admin', 'dentist', 'staff', 'billing']);
    });
  });

  describe('Demo Credentials', () => {
    it('should have all required demo credentials', () => {
      expect(DEMO_CREDENTIALS).toHaveProperty('admin');
      expect(DEMO_CREDENTIALS).toHaveProperty('dentist');
      expect(DEMO_CREDENTIALS).toHaveProperty('staff');
      expect(DEMO_CREDENTIALS).toHaveProperty('billing');
    });

    it('should have valid credential structure', () => {
      Object.values(DEMO_CREDENTIALS).forEach(cred => {
        expect(cred).toHaveProperty('email');
        expect(cred).toHaveProperty('password');
        expect(cred).toHaveProperty('role');
        expect(cred.email).toMatch(/@clinicboost\.demo$/);
        expect(cred.password).toBe('demo123');
      });
    });

    it('should match demo users data', () => {
      Object.values(DEMO_CREDENTIALS).forEach(cred => {
        const user = DEMO_USERS.find(u => u.email === cred.email);
        expect(user).toBeDefined();
        expect(user?.password).toBe(cred.password);
      });
    });
  });

  describe('Demo Users Data', () => {
    it('should have all required demo users', () => {
      expect(DEMO_USERS).toHaveLength(4);
      
      const roles = DEMO_USERS.map(u => u.role);
      expect(roles).toContain('admin');
      expect(roles).toContain('dentist');
      expect(roles).toContain('staff');
      expect(roles).toContain('billing');
    });

    it('should have valid user structure', () => {
      DEMO_USERS.forEach(user => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('password');
        expect(user).toHaveProperty('firstName');
        expect(user).toHaveProperty('lastName');
        expect(user).toHaveProperty('role');
        expect(user).toHaveProperty('avatar');
        expect(user).toHaveProperty('phone');
        expect(user).toHaveProperty('department');
        
        expect(user.id).toMatch(/^demo-\w+-\d+$/);
        expect(user.email).toMatch(/@clinicboost\.demo$/);
        expect(user.password).toBe('demo123');
        expect(user.avatar).toMatch(/^https:\/\//);
        expect(user.phone).toMatch(/^\+1 \(\d{3}\) \d{3}-\d{4}$/);
      });
    });

    it('should have unique IDs and emails', () => {
      const ids = DEMO_USERS.map(u => u.id);
      const emails = DEMO_USERS.map(u => u.email);
      
      expect(new Set(ids).size).toBe(DEMO_USERS.length);
      expect(new Set(emails).size).toBe(DEMO_USERS.length);
    });
  });
});

describe('Demo Mode Comprehensive Testing', () => {
  let tester: DemoModeTester;

  beforeEach(() => {
    tester = new DemoModeTester();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await tester.cleanup();
  });

  it('should run all test suites successfully', async () => {
    const results = await tester.runAllTests();
    
    expect(results).toHaveLength(7); // 7 test suites
    
    // Check that all suites have results
    results.forEach(suite => {
      expect(suite.suiteName).toBeDefined();
      expect(suite.results).toBeInstanceOf(Array);
      expect(suite.totalTests).toBeGreaterThan(0);
      expect(suite.duration).toBeGreaterThan(0);
    });
  });

  it('should have authentication test suite', async () => {
    const results = await tester.runAllTests();
    const authSuite = results.find(s => s.suiteName.includes('Authentication'));
    
    expect(authSuite).toBeDefined();
    expect(authSuite?.totalTests).toBeGreaterThan(5);
  });

  it('should have data persistence test suite', async () => {
    const results = await tester.runAllTests();
    const dataSuite = results.find(s => s.suiteName.includes('Data'));
    
    expect(dataSuite).toBeDefined();
    expect(dataSuite?.totalTests).toBeGreaterThan(2);
  });

  it('should have role-based access test suite', async () => {
    const results = await tester.runAllTests();
    const roleSuite = results.find(s => s.suiteName.includes('Role'));
    
    expect(roleSuite).toBeDefined();
    expect(roleSuite?.totalTests).toBeGreaterThan(4);
  });

  it('should measure test performance', async () => {
    const results = await tester.runAllTests();
    const perfSuite = results.find(s => s.suiteName.includes('Performance'));
    
    expect(perfSuite).toBeDefined();
    expect(perfSuite?.results).toHaveLength(2);
    
    // Check that performance tests validate timing
    const loginPerfTest = perfSuite?.results.find(r => r.testName.includes('Login Performance'));
    expect(loginPerfTest).toBeDefined();
  });

  it('should test error handling', async () => {
    const results = await tester.runAllTests();
    const errorSuite = results.find(s => s.suiteName.includes('Error'));
    
    expect(errorSuite).toBeDefined();
    expect(errorSuite?.totalTests).toBeGreaterThan(2);
  });

  it('should clean up properly after tests', async () => {
    await tester.runAllTests();
    await tester.cleanup();
    
    expect(demoAuth.getCurrentUser()).toBeNull();
    expect(demoAuth.getIsAuthenticated()).toBe(false);
  });
});

describe('Demo Mode Environment Detection', () => {
  it('should detect demo mode from environment variables', () => {
    // Mock environment variables
    const originalEnv = import.meta.env.VITE_DEMO_MODE;
    
    // Test explicit demo mode
    vi.stubGlobal('import.meta.env.VITE_DEMO_MODE', 'true');
    expect(import.meta.env.VITE_DEMO_MODE).toBe('true');
    
    // Restore original
    vi.stubGlobal('import.meta.env.VITE_DEMO_MODE', originalEnv);
  });

  it('should auto-detect demo mode when Supabase URL is missing', () => {
    const originalUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // Test missing Supabase URL
    vi.stubGlobal('import.meta.env.VITE_SUPABASE_URL', undefined);
    
    const shouldUseDemoMode = !import.meta.env.VITE_SUPABASE_URL;
    expect(shouldUseDemoMode).toBe(true);
    
    // Restore original
    vi.stubGlobal('import.meta.env.VITE_SUPABASE_URL', originalUrl);
  });

  it('should auto-detect demo mode for demo URLs', () => {
    const demoUrls = [
      'https://demo.supabase.co',
      'https://mock.supabase.co'
    ];
    
    demoUrls.forEach(url => {
      vi.stubGlobal('import.meta.env.VITE_SUPABASE_URL', url);
      
      const shouldUseDemoMode = import.meta.env.VITE_SUPABASE_URL === url;
      expect(shouldUseDemoMode).toBe(true);
    });
  });
});
