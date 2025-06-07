#!/usr/bin/env node

/**
 * Testing Setup Validator
 * 
 * Validates that the testing environment is properly configured
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestingSetupValidator {
  constructor() {
    this.validations = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate complete testing setup
   */
  async validateSetup() {
    console.log('🔍 Validating testing setup...\n');

    try {
      this.validateFiles();
      this.validatePackageScripts();
      this.validateEnvironment();
      this.validateDependencies();
      this.validateGitHooks();
      this.validateVSCodeConfig();
      
      this.printResults();
      
      if (this.errors.length === 0) {
        console.log('\n✅ Testing setup validation passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Testing setup validation failed!');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Validate required files exist
   */
  validateFiles() {
    const requiredFiles = [
      { path: '.env.test', description: 'Test environment file' },
      { path: 'jest.config.json', description: 'Jest configuration' },
      { path: 'vite.config.ts', description: 'Vite configuration' },
      { path: 'tsconfig.json', description: 'TypeScript configuration' },
      { path: 'src/test/setup.ts', description: 'Test setup file' },
      { path: 'src/test/data/mockData.ts', description: 'Mock data generators' },
      { path: 'scripts/run-enhanced-testing.js', description: 'Enhanced testing runner' },
      { path: '.github/workflows/enhanced-testing-pipeline.yml', description: 'CI/CD pipeline' }
    ];

    for (const file of requiredFiles) {
      if (fs.existsSync(file.path)) {
        this.validations.push(`✅ ${file.description}`);
      } else {
        this.errors.push(`❌ Missing ${file.description}: ${file.path}`);
      }
    }
  }

  /**
   * Validate package.json scripts
   */
  validatePackageScripts() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const scripts = packageJson.scripts || {};
      
      const requiredScripts = [
        'test',
        'test:unit',
        'test:integration',
        'test:coverage',
        'test:enhanced',
        'test:enhanced:unit',
        'test:enhanced:a11y',
        'test:enhanced:perf',
        'test:enhanced:load',
        'lint',
        'type-check'
      ];

      for (const script of requiredScripts) {
        if (scripts[script]) {
          this.validations.push(`✅ Script: ${script}`);
        } else {
          this.errors.push(`❌ Missing script: ${script}`);
        }
      }
    } catch (error) {
      this.errors.push(`❌ Could not validate package.json scripts: ${error.message}`);
    }
  }

  /**
   * Validate environment configuration
   */
  validateEnvironment() {
    const envFiles = ['.env.test', '.env.example'];
    
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        try {
          const content = fs.readFileSync(envFile, 'utf8');
          const requiredVars = [
            'NODE_ENV',
            'VITE_TEST_MODE',
            'VITE_SUPABASE_URL',
            'VITE_SUPABASE_ANON_KEY'
          ];

          for (const varName of requiredVars) {
            if (content.includes(varName)) {
              this.validations.push(`✅ Environment variable: ${varName}`);
            } else {
              this.warnings.push(`⚠️ Missing environment variable in ${envFile}: ${varName}`);
            }
          }
        } catch (error) {
          this.errors.push(`❌ Could not read ${envFile}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Validate dependencies
   */
  validateDependencies() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const devDeps = packageJson.devDependencies || {};
      
      const requiredTestDeps = [
        '@testing-library/react',
        '@testing-library/jest-dom',
        '@testing-library/user-event',
        'vitest',
        'jsdom',
        'jest-axe'
      ];

      for (const dep of requiredTestDeps) {
        if (devDeps[dep]) {
          this.validations.push(`✅ Dependency: ${dep}`);
        } else {
          this.errors.push(`❌ Missing test dependency: ${dep}`);
        }
      }

      // Check for optional but recommended dependencies
      const recommendedDeps = [
        '@playwright/test',
        'artillery',
        'lighthouse'
      ];

      for (const dep of recommendedDeps) {
        if (devDeps[dep]) {
          this.validations.push(`✅ Optional dependency: ${dep}`);
        } else {
          this.warnings.push(`⚠️ Recommended dependency missing: ${dep}`);
        }
      }
    } catch (error) {
      this.errors.push(`❌ Could not validate dependencies: ${error.message}`);
    }
  }

  /**
   * Validate Git hooks
   */
  validateGitHooks() {
    const hooks = [
      { path: '.git/hooks/pre-commit', name: 'pre-commit' },
      { path: '.git/hooks/pre-push', name: 'pre-push' }
    ];

    for (const hook of hooks) {
      if (fs.existsSync(hook.path)) {
        try {
          const stats = fs.statSync(hook.path);
          if (stats.mode & parseInt('111', 8)) {
            this.validations.push(`✅ Git hook: ${hook.name} (executable)`);
          } else {
            this.warnings.push(`⚠️ Git hook not executable: ${hook.name}`);
          }
        } catch (error) {
          this.warnings.push(`⚠️ Could not check Git hook: ${hook.name}`);
        }
      } else {
        this.warnings.push(`⚠️ Git hook missing: ${hook.name}`);
      }
    }
  }

  /**
   * Validate VS Code configuration
   */
  validateVSCodeConfig() {
    const vscodeFiles = [
      { path: '.vscode/settings.json', name: 'VS Code settings' },
      { path: '.vscode/extensions.json', name: 'VS Code extensions' },
      { path: '.vscode/tasks.json', name: 'VS Code tasks' }
    ];

    for (const file of vscodeFiles) {
      if (fs.existsSync(file.path)) {
        try {
          JSON.parse(fs.readFileSync(file.path, 'utf8'));
          this.validations.push(`✅ ${file.name}`);
        } catch (error) {
          this.errors.push(`❌ Invalid JSON in ${file.name}: ${error.message}`);
        }
      } else {
        this.warnings.push(`⚠️ Missing ${file.name}`);
      }
    }
  }

  /**
   * Test script execution
   */
  testScriptExecution() {
    const testScripts = [
      { script: 'npm run lint --help', name: 'Linting' },
      { script: 'npm run type-check --help', name: 'Type checking' },
      { script: 'npm run test:enhanced -- --help', name: 'Enhanced testing' }
    ];

    for (const test of testScripts) {
      try {
        execSync(test.script, { stdio: 'pipe' });
        this.validations.push(`✅ ${test.name} script works`);
      } catch (error) {
        this.warnings.push(`⚠️ ${test.name} script may have issues`);
      }
    }
  }

  /**
   * Print validation results
   */
  printResults() {
    console.log('Validation Results:');
    console.log('==================\n');

    if (this.validations.length > 0) {
      console.log('✅ Passed Validations:');
      this.validations.forEach(validation => console.log(`   ${validation}`));
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      this.warnings.forEach(warning => console.log(`   ${warning}`));
      console.log('');
    }

    if (this.errors.length > 0) {
      console.log('❌ Errors:');
      this.errors.forEach(error => console.log(`   ${error}`));
      console.log('');
    }

    // Summary
    console.log('Summary:');
    console.log(`   ✅ Passed: ${this.validations.length}`);
    console.log(`   ⚠️ Warnings: ${this.warnings.length}`);
    console.log(`   ❌ Errors: ${this.errors.length}`);

    if (this.errors.length > 0) {
      console.log('\n🔧 To fix errors, run: npm run setup:dev-testing');
    }

    if (this.warnings.length > 0) {
      console.log('\n💡 Warnings indicate optional improvements that enhance the testing experience.');
    }
  }

  /**
   * Generate setup recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.errors.length > 0) {
      recommendations.push('Run setup script: npm run setup:dev-testing');
    }

    if (this.warnings.some(w => w.includes('Git hook'))) {
      recommendations.push('Setup Git hooks for automated testing');
    }

    if (this.warnings.some(w => w.includes('VS Code'))) {
      recommendations.push('Configure VS Code for optimal development experience');
    }

    if (this.warnings.some(w => w.includes('dependency'))) {
      recommendations.push('Install recommended testing dependencies');
    }

    return recommendations;
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new TestingSetupValidator();
  validator.validateSetup();
}

module.exports = TestingSetupValidator;
