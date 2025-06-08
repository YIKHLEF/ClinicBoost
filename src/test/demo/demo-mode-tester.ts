/**
 * Demo Mode Testing Framework
 * 
 * Comprehensive testing suite for demo mode functionality including:
 * - Authentication testing
 * - Data persistence testing
 * - Role-based access testing
 * - UI/UX testing
 * - Performance testing
 */

import { demoAuth, DEMO_USERS, DEMO_CREDENTIALS, type DemoUser } from '../../lib/demo-auth';
import { offlineStorageService } from '../../lib/offline/offline-storage';

export interface DemoTestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: any;
}

export interface DemoTestSuite {
  suiteName: string;
  results: DemoTestResult[];
  passed: boolean;
  totalTests: number;
  passedTests: number;
  duration: number;
}

export class DemoModeTester {
  private results: DemoTestSuite[] = [];
  private currentUser: DemoUser | null = null;

  /**
   * Run complete demo mode test suite
   */
  async runAllTests(): Promise<DemoTestSuite[]> {
    console.log('🧪 Starting Demo Mode Test Suite...\n');
    
    this.results = [];
    
    try {
      // Test suites
      await this.testAuthentication();
      await this.testDataPersistence();
      await this.testRoleBasedAccess();
      await this.testUserInterface();
      await this.testPerformance();
      await this.testErrorHandling();
      await this.testSessionManagement();
      
      this.printSummary();
      return this.results;
      
    } catch (error) {
      console.error('❌ Demo test suite failed:', error);
      throw error;
    }
  }

  /**
   * Test authentication functionality
   */
  private async testAuthentication(): Promise<void> {
    const suite: DemoTestSuite = {
      suiteName: 'Authentication Tests',
      results: [],
      passed: false,
      totalTests: 0,
      passedTests: 0,
      duration: 0
    };

    const startTime = performance.now();

    // Test 1: Valid login
    suite.results.push(await this.runTest(
      'Valid Login',
      async () => {
        const user = await demoAuth.login('admin@clinicboost.demo', 'demo123');
        this.currentUser = user;
        return user.email === 'admin@clinicboost.demo' && user.role === 'admin';
      }
    ));

    // Test 2: Invalid credentials
    suite.results.push(await this.runTest(
      'Invalid Credentials',
      async () => {
        try {
          await demoAuth.login('invalid@email.com', 'wrongpassword');
          return false; // Should have thrown an error
        } catch (error) {
          return error.message.includes('Invalid email or password');
        }
      }
    ));

    // Test 3: Case insensitive email
    suite.results.push(await this.runTest(
      'Case Insensitive Email',
      async () => {
        const user = await demoAuth.login('ADMIN@CLINICBOOST.DEMO', 'demo123');
        return user.email === 'admin@clinicboost.demo';
      }
    ));

    // Test 4: Session persistence
    suite.results.push(await this.runTest(
      'Session Persistence',
      async () => {
        await demoAuth.login('staff@clinicboost.demo', 'demo123');
        const isAuth1 = demoAuth.getIsAuthenticated();
        const user1 = demoAuth.getCurrentUser();
        
        // Simulate page reload by creating new instance
        const newDemoAuth = new (demoAuth.constructor as any)();
        const isAuth2 = newDemoAuth.getIsAuthenticated();
        const user2 = newDemoAuth.getCurrentUser();
        
        return isAuth1 && isAuth2 && user1?.id === user2?.id;
      }
    ));

    // Test 5: Logout functionality
    suite.results.push(await this.runTest(
      'Logout Functionality',
      async () => {
        await demoAuth.login('dentist@clinicboost.demo', 'demo123');
        await demoAuth.logout();
        return !demoAuth.getIsAuthenticated() && !demoAuth.getCurrentUser();
      }
    ));

    // Test 6: All demo users can login
    suite.results.push(await this.runTest(
      'All Demo Users Login',
      async () => {
        for (const credentials of Object.values(DEMO_CREDENTIALS)) {
          const user = await demoAuth.login(credentials.email, credentials.password);
          if (!user || user.email !== credentials.email) {
            return false;
          }
          await demoAuth.logout();
        }
        return true;
      }
    ));

    suite.duration = performance.now() - startTime;
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.passed).length;
    suite.passed = suite.passedTests === suite.totalTests;
    
    this.results.push(suite);
  }

  /**
   * Test data persistence
   */
  private async testDataPersistence(): Promise<void> {
    const suite: DemoTestSuite = {
      suiteName: 'Data Persistence Tests',
      results: [],
      passed: false,
      totalTests: 0,
      passedTests: 0,
      duration: 0
    };

    const startTime = performance.now();

    // Test 1: Local storage persistence
    suite.results.push(await this.runTest(
      'Local Storage Persistence',
      async () => {
        await demoAuth.login('admin@clinicboost.demo', 'demo123');
        const savedUser = localStorage.getItem('demo_user');
        const savedAuth = localStorage.getItem('demo_authenticated');
        return savedUser !== null && savedAuth === 'true';
      }
    ));

    // Test 2: Profile updates persist
    suite.results.push(await this.runTest(
      'Profile Updates Persist',
      async () => {
        await demoAuth.login('staff@clinicboost.demo', 'demo123');
        const originalPhone = demoAuth.getCurrentUser()?.phone;
        
        await demoAuth.updateProfile({ phone: '+1 (555) 999-9999' });
        const updatedUser = demoAuth.getCurrentUser();
        
        // Restore original phone
        await demoAuth.updateProfile({ phone: originalPhone });
        
        return updatedUser?.phone === '+1 (555) 999-9999';
      }
    ));

    // Test 3: Offline storage integration
    suite.results.push(await this.runTest(
      'Offline Storage Integration',
      async () => {
        const testData = { id: 'test-1', name: 'Test Patient' };
        await offlineStorageService.store('test-patients', 'test-1', testData);
        const retrieved = await offlineStorageService.get('test-patients', 'test-1');
        await offlineStorageService.remove('test-patients', 'test-1');
        return retrieved?.name === 'Test Patient';
      }
    ));

    suite.duration = performance.now() - startTime;
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.passed).length;
    suite.passed = suite.passedTests === suite.totalTests;
    
    this.results.push(suite);
  }

  /**
   * Test role-based access
   */
  private async testRoleBasedAccess(): Promise<void> {
    const suite: DemoTestSuite = {
      suiteName: 'Role-Based Access Tests',
      results: [],
      passed: false,
      totalTests: 0,
      passedTests: 0,
      duration: 0
    };

    const startTime = performance.now();

    // Test 1: Admin role permissions
    suite.results.push(await this.runTest(
      'Admin Role Permissions',
      async () => {
        const user = await demoAuth.login('admin@clinicboost.demo', 'demo123');
        return user.role === 'admin' && user.firstName === 'Dr. Sarah';
      }
    ));

    // Test 2: Dentist role permissions
    suite.results.push(await this.runTest(
      'Dentist Role Permissions',
      async () => {
        const user = await demoAuth.login('dentist@clinicboost.demo', 'demo123');
        return user.role === 'dentist' && user.department === 'General Dentistry';
      }
    ));

    // Test 3: Staff role permissions
    suite.results.push(await this.runTest(
      'Staff Role Permissions',
      async () => {
        const user = await demoAuth.login('staff@clinicboost.demo', 'demo123');
        return user.role === 'staff' && user.department === 'Patient Care';
      }
    ));

    // Test 4: Billing role permissions
    suite.results.push(await this.runTest(
      'Billing Role Permissions',
      async () => {
        const user = await demoAuth.login('billing@clinicboost.demo', 'demo123');
        return user.role === 'billing' && user.department === 'Billing & Finance';
      }
    ));

    // Test 5: Role switching
    suite.results.push(await this.runTest(
      'Role Switching',
      async () => {
        await demoAuth.login('admin@clinicboost.demo', 'demo123');
        const adminUser = demoAuth.getCurrentUser();
        
        await demoAuth.logout();
        await demoAuth.login('staff@clinicboost.demo', 'demo123');
        const staffUser = demoAuth.getCurrentUser();
        
        return adminUser?.role === 'admin' && staffUser?.role === 'staff';
      }
    ));

    suite.duration = performance.now() - startTime;
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.passed).length;
    suite.passed = suite.passedTests === suite.totalTests;
    
    this.results.push(suite);
  }

  /**
   * Test user interface elements
   */
  private async testUserInterface(): Promise<void> {
    const suite: DemoTestSuite = {
      suiteName: 'User Interface Tests',
      results: [],
      passed: false,
      totalTests: 0,
      passedTests: 0,
      duration: 0
    };

    const startTime = performance.now();

    // Test 1: Demo mode detection
    suite.results.push(await this.runTest(
      'Demo Mode Detection',
      async () => {
        const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' ||
                          !import.meta.env.VITE_SUPABASE_URL ||
                          import.meta.env.VITE_SUPABASE_URL === 'https://demo.supabase.co';
        return isDemoMode;
      }
    ));

    // Test 2: Demo credentials availability
    suite.results.push(await this.runTest(
      'Demo Credentials Available',
      async () => {
        return Object.keys(DEMO_CREDENTIALS).length === 4 &&
               DEMO_CREDENTIALS.admin.email === 'admin@clinicboost.demo';
      }
    ));

    // Test 3: User avatar URLs
    suite.results.push(await this.runTest(
      'User Avatar URLs',
      async () => {
        return DEMO_USERS.every(user => 
          user.avatar && user.avatar.startsWith('https://')
        );
      }
    ));

    suite.duration = performance.now() - startTime;
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.passed).length;
    suite.passed = suite.passedTests === suite.totalTests;
    
    this.results.push(suite);
  }

  /**
   * Test performance
   */
  private async testPerformance(): Promise<void> {
    const suite: DemoTestSuite = {
      suiteName: 'Performance Tests',
      results: [],
      passed: false,
      totalTests: 0,
      passedTests: 0,
      duration: 0
    };

    const startTime = performance.now();

    // Test 1: Login performance
    suite.results.push(await this.runTest(
      'Login Performance (<500ms)',
      async () => {
        const loginStart = performance.now();
        await demoAuth.login('admin@clinicboost.demo', 'demo123');
        const loginDuration = performance.now() - loginStart;
        return loginDuration < 500;
      }
    ));

    // Test 2: Session load performance
    suite.results.push(await this.runTest(
      'Session Load Performance (<100ms)',
      async () => {
        await demoAuth.login('staff@clinicboost.demo', 'demo123');
        
        const loadStart = performance.now();
        const newAuth = new (demoAuth.constructor as any)();
        newAuth.getCurrentUser();
        const loadDuration = performance.now() - loadStart;
        
        return loadDuration < 100;
      }
    ));

    suite.duration = performance.now() - startTime;
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.passed).length;
    suite.passed = suite.passedTests === suite.totalTests;
    
    this.results.push(suite);
  }

  /**
   * Test error handling
   */
  private async testErrorHandling(): Promise<void> {
    const suite: DemoTestSuite = {
      suiteName: 'Error Handling Tests',
      results: [],
      passed: false,
      totalTests: 0,
      passedTests: 0,
      duration: 0
    };

    const startTime = performance.now();

    // Test 1: Invalid email format
    suite.results.push(await this.runTest(
      'Invalid Email Format',
      async () => {
        try {
          await demoAuth.login('invalid-email', 'demo123');
          return false;
        } catch (error) {
          return error.message.includes('Invalid email or password');
        }
      }
    ));

    // Test 2: Empty credentials
    suite.results.push(await this.runTest(
      'Empty Credentials',
      async () => {
        try {
          await demoAuth.login('', '');
          return false;
        } catch (error) {
          return error.message.includes('Invalid email or password');
        }
      }
    ));

    // Test 3: Corrupted session recovery
    suite.results.push(await this.runTest(
      'Corrupted Session Recovery',
      async () => {
        // Corrupt the session data
        localStorage.setItem('demo_user', 'invalid-json');
        localStorage.setItem('demo_authenticated', 'true');
        
        // Should handle gracefully
        const newAuth = new (demoAuth.constructor as any)();
        const user = newAuth.getCurrentUser();
        const isAuth = newAuth.getIsAuthenticated();
        
        return user === null && !isAuth;
      }
    ));

    suite.duration = performance.now() - startTime;
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.passed).length;
    suite.passed = suite.passedTests === suite.totalTests;
    
    this.results.push(suite);
  }

  /**
   * Test session management
   */
  private async testSessionManagement(): Promise<void> {
    const suite: DemoTestSuite = {
      suiteName: 'Session Management Tests',
      results: [],
      passed: false,
      totalTests: 0,
      passedTests: 0,
      duration: 0
    };

    const startTime = performance.now();

    // Test 1: Multiple tab simulation
    suite.results.push(await this.runTest(
      'Multiple Tab Simulation',
      async () => {
        await demoAuth.login('admin@clinicboost.demo', 'demo123');
        
        // Simulate another tab
        const auth2 = new (demoAuth.constructor as any)();
        const user2 = auth2.getCurrentUser();
        
        return user2?.email === 'admin@clinicboost.demo';
      }
    ));

    // Test 2: Session cleanup on logout
    suite.results.push(await this.runTest(
      'Session Cleanup on Logout',
      async () => {
        await demoAuth.login('dentist@clinicboost.demo', 'demo123');
        await demoAuth.logout();
        
        const savedUser = localStorage.getItem('demo_user');
        const savedAuth = localStorage.getItem('demo_authenticated');
        
        return savedUser === null && savedAuth === null;
      }
    ));

    suite.duration = performance.now() - startTime;
    suite.totalTests = suite.results.length;
    suite.passedTests = suite.results.filter(r => r.passed).length;
    suite.passed = suite.passedTests === suite.totalTests;
    
    this.results.push(suite);
  }

  /**
   * Run individual test
   */
  private async runTest(testName: string, testFn: () => Promise<boolean>): Promise<DemoTestResult> {
    const startTime = performance.now();
    
    try {
      const passed = await testFn();
      const duration = performance.now() - startTime;
      
      return {
        testName,
        passed,
        message: passed ? 'Test passed' : 'Test failed',
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      return {
        testName,
        passed: false,
        message: `Test error: ${error.message}`,
        duration,
        details: error
      };
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    console.log('\n📊 Demo Mode Test Summary');
    console.log('========================\n');
    
    let totalTests = 0;
    let totalPassed = 0;
    let totalDuration = 0;
    
    for (const suite of this.results) {
      const status = suite.passed ? '✅' : '❌';
      console.log(`${status} ${suite.suiteName}: ${suite.passedTests}/${suite.totalTests} (${suite.duration.toFixed(2)}ms)`);
      
      // Show failed tests
      const failedTests = suite.results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        failedTests.forEach(test => {
          console.log(`   ❌ ${test.testName}: ${test.message}`);
        });
      }
      
      totalTests += suite.totalTests;
      totalPassed += suite.passedTests;
      totalDuration += suite.duration;
    }
    
    console.log('\n📈 Overall Results:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed}`);
    console.log(`   Failed: ${totalTests - totalPassed}`);
    console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    console.log(`   Total Duration: ${totalDuration.toFixed(2)}ms`);
    
    if (totalPassed === totalTests) {
      console.log('\n🎉 All demo mode tests passed!');
    } else {
      console.log('\n⚠️ Some demo mode tests failed. Check the details above.');
    }
  }

  /**
   * Get test results
   */
  getResults(): DemoTestSuite[] {
    return this.results;
  }

  /**
   * Clean up after tests
   */
  async cleanup(): Promise<void> {
    await demoAuth.logout();
    localStorage.removeItem('demo_user');
    localStorage.removeItem('demo_authenticated');
    await offlineStorageService.clear('test-patients');
  }
}

// Export for browser console usage
(window as any).DemoModeTester = DemoModeTester;

export default DemoModeTester;
