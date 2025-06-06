#!/usr/bin/env node

/**
 * Test Automation Script
 * 
 * Orchestrates comprehensive testing including unit, integration, 
 * accessibility, performance, and load testing
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestAutomation {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      accessibility: null,
      performance: null,
      load: null,
      coverage: null
    };
    this.startTime = Date.now();
  }

  /**
   * Run a command and return a promise
   */
  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`\n🚀 Running: ${command} ${args.join(' ')}`);
      
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          resolve({ success: false, code });
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Run unit tests
   */
  async runUnitTests() {
    console.log('\n📋 Running Unit Tests...');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:unit']);
      this.results.unit = result;
      
      if (result.success) {
        console.log('✅ Unit tests passed');
      } else {
        console.log('❌ Unit tests failed');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Unit tests error:', error.message);
      this.results.unit = { success: false, error: error.message };
      return { success: false, error: error.message };
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    console.log('\n🔗 Running Integration Tests...');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:integration']);
      this.results.integration = result;
      
      if (result.success) {
        console.log('✅ Integration tests passed');
      } else {
        console.log('❌ Integration tests failed');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Integration tests error:', error.message);
      this.results.integration = { success: false, error: error.message };
      return { success: false, error: error.message };
    }
  }

  /**
   * Run E2E tests
   */
  async runE2ETests() {
    console.log('\n🎭 Running E2E Tests...');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:e2e']);
      this.results.e2e = result;
      
      if (result.success) {
        console.log('✅ E2E tests passed');
      } else {
        console.log('❌ E2E tests failed');
      }
      
      return result;
    } catch (error) {
      console.error('❌ E2E tests error:', error.message);
      this.results.e2e = { success: false, error: error.message };
      return { success: false, error: error.message };
    }
  }

  /**
   * Run accessibility tests
   */
  async runAccessibilityTests() {
    console.log('\n♿ Running Accessibility Tests...');
    
    try {
      // Run unit accessibility tests
      const unitResult = await this.runCommand('npm', ['run', 'test:accessibility']);
      
      // Run E2E accessibility tests
      const e2eResult = await this.runCommand('npm', ['run', 'test:e2e:accessibility']);
      
      const result = {
        success: unitResult.success && e2eResult.success,
        unit: unitResult,
        e2e: e2eResult
      };
      
      this.results.accessibility = result;
      
      if (result.success) {
        console.log('✅ Accessibility tests passed');
      } else {
        console.log('❌ Accessibility tests failed');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Accessibility tests error:', error.message);
      this.results.accessibility = { success: false, error: error.message };
      return { success: false, error: error.message };
    }
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Tests...');
    
    try {
      // Run unit performance tests
      const unitResult = await this.runCommand('npm', ['run', 'test:performance']);
      
      // Run E2E performance tests
      const e2eResult = await this.runCommand('npm', ['run', 'test:e2e:performance']);
      
      const result = {
        success: unitResult.success && e2eResult.success,
        unit: unitResult,
        e2e: e2eResult
      };
      
      this.results.performance = result;
      
      if (result.success) {
        console.log('✅ Performance tests passed');
      } else {
        console.log('❌ Performance tests failed');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Performance tests error:', error.message);
      this.results.performance = { success: false, error: error.message };
      return { success: false, error: error.message };
    }
  }

  /**
   * Run load tests
   */
  async runLoadTests() {
    console.log('\n🔥 Running Load Tests...');
    
    try {
      // Check if Artillery is available
      const artilleryCheck = await this.runCommand('artillery', ['--version']);
      
      if (!artilleryCheck.success) {
        console.log('⚠️  Artillery not found, skipping load tests');
        this.results.load = { success: true, skipped: true };
        return { success: true, skipped: true };
      }
      
      const result = await this.runCommand('npm', ['run', 'test:load']);
      this.results.load = result;
      
      if (result.success) {
        console.log('✅ Load tests passed');
      } else {
        console.log('❌ Load tests failed');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Load tests error:', error.message);
      this.results.load = { success: false, error: error.message };
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate coverage report
   */
  async generateCoverage() {
    console.log('\n📊 Generating Coverage Report...');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:coverage']);
      this.results.coverage = result;
      
      if (result.success) {
        console.log('✅ Coverage report generated');
      } else {
        console.log('❌ Coverage report failed');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Coverage error:', error.message);
      this.results.coverage = { success: false, error: error.message };
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const endTime = Date.now();
    const duration = Math.round((endTime - this.startTime) / 1000);
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      summary: {
        total: Object.keys(this.results).length,
        passed: Object.values(this.results).filter(r => r?.success).length,
        failed: Object.values(this.results).filter(r => r?.success === false).length,
        skipped: Object.values(this.results).filter(r => r?.skipped).length
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // Write report to file
    const reportPath = path.join(process.cwd(), 'test-results', 'comprehensive-report.json');
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📋 Test Summary:');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏭️  Skipped: ${report.summary.skipped}`);
    console.log(`📄 Report saved to: ${reportPath}`);
    
    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.results.unit?.success) {
      recommendations.push('Fix failing unit tests to ensure component reliability');
    }
    
    if (!this.results.integration?.success) {
      recommendations.push('Address integration test failures to ensure system compatibility');
    }
    
    if (!this.results.accessibility?.success) {
      recommendations.push('Fix accessibility issues to ensure inclusive user experience');
    }
    
    if (!this.results.performance?.success) {
      recommendations.push('Optimize performance bottlenecks identified in tests');
    }
    
    if (!this.results.load?.success && !this.results.load?.skipped) {
      recommendations.push('Address load testing failures to ensure scalability');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All tests passing! Consider adding more edge case coverage');
    }
    
    return recommendations;
  }

  /**
   * Run all tests
   */
  async runAll() {
    console.log('🧪 Starting Comprehensive Test Suite...\n');
    
    // Run tests in sequence
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runAccessibilityTests();
    await this.runPerformanceTests();
    await this.runE2ETests();
    await this.runLoadTests();
    await this.generateCoverage();
    
    // Generate final report
    const report = this.generateReport();
    
    // Exit with appropriate code
    const hasFailures = Object.values(this.results).some(r => r?.success === false);
    process.exit(hasFailures ? 1 : 0);
  }
}

// CLI interface
if (require.main === module) {
  const automation = new TestAutomation();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'unit':
      automation.runUnitTests().then(() => process.exit(0));
      break;
    case 'integration':
      automation.runIntegrationTests().then(() => process.exit(0));
      break;
    case 'e2e':
      automation.runE2ETests().then(() => process.exit(0));
      break;
    case 'accessibility':
      automation.runAccessibilityTests().then(() => process.exit(0));
      break;
    case 'performance':
      automation.runPerformanceTests().then(() => process.exit(0));
      break;
    case 'load':
      automation.runLoadTests().then(() => process.exit(0));
      break;
    case 'coverage':
      automation.generateCoverage().then(() => process.exit(0));
      break;
    case 'all':
    default:
      automation.runAll();
      break;
  }
}

module.exports = TestAutomation;
