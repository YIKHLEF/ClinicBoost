#!/usr/bin/env node

/**
 * Infrastructure Verification Script
 * Verifies that all technical infrastructure components are properly implemented
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

// Verification checks
const checks = {
  // Environment Management
  environmentConfig: {
    name: 'Environment Configuration',
    files: [
      '.env.development',
      '.env.staging', 
      '.env.production',
      'src/lib/config/secure-config.ts'
    ],
    required: true
  },

  secretManagement: {
    name: 'Secret Management System',
    files: [
      'src/lib/security/secret-manager.ts'
    ],
    required: true
  },

  // Security Implementations
  securityMiddleware: {
    name: 'Security Middleware',
    files: [
      'src/lib/middleware/security-middleware.ts',
      'src/lib/api/middleware-integration.ts'
    ],
    required: true
  },

  // Performance Optimization
  cachingSystem: {
    name: 'Caching System',
    files: [
      'src/lib/performance/cache-manager.ts'
    ],
    required: true
  },

  cdnConfiguration: {
    name: 'CDN Configuration',
    files: [
      'src/lib/performance/cdn-config.ts'
    ],
    required: true
  },

  // Error Handling and Logging
  errorReporting: {
    name: 'Error Reporting System',
    files: [
      'src/lib/monitoring/error-reporting.ts'
    ],
    required: true
  },

  monitoringDashboard: {
    name: 'Monitoring Dashboard',
    files: [
      'src/components/admin/InfrastructureMonitoring.tsx'
    ],
    required: true
  },

  // Docker and Deployment
  dockerConfiguration: {
    name: 'Docker Configuration',
    files: [
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.staging.yml',
      'docker-compose.production.yml',
      'docker/nginx.conf',
      'docker/default.conf'
    ],
    required: true
  },

  // Scripts and Automation
  deploymentScripts: {
    name: 'Deployment Scripts',
    files: [
      'scripts/infrastructure-setup.sh',
      'scripts/deploy.sh'
    ],
    required: true
  }
};

// Environment variable checks
const envVarChecks = {
  development: [
    'VITE_APP_NAME',
    'VITE_APP_VERSION',
    'VITE_APP_ENV'
  ],
  staging: [
    'VITE_APP_NAME',
    'VITE_APP_VERSION',
    'VITE_APP_ENV',
    'VITE_ENABLE_RATE_LIMITING',
    'VITE_ENABLE_CSRF_PROTECTION',
    'VITE_ENABLE_API_CACHING',
    'VITE_ENABLE_ERROR_REPORTING'
  ],
  production: [
    'VITE_APP_NAME',
    'VITE_APP_VERSION',
    'VITE_APP_ENV',
    'VITE_ENABLE_RATE_LIMITING',
    'VITE_ENABLE_CSRF_PROTECTION',
    'VITE_ENABLE_API_CACHING',
    'VITE_ENABLE_ERROR_REPORTING',
    'VITE_ENABLE_CDN',
    'VITE_SENTRY_DSN',
    'VITE_DATADOG_CLIENT_TOKEN'
  ]
};

// Verification functions
function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function checkEnvironmentVariables(envFile, requiredVars) {
  if (!checkFileExists(envFile)) {
    return { success: false, missing: requiredVars };
  }

  try {
    const content = fs.readFileSync(envFile, 'utf8');
    const missing = requiredVars.filter(varName => {
      const regex = new RegExp(`^${varName}=`, 'm');
      return !regex.test(content);
    });

    return { success: missing.length === 0, missing };
  } catch (error) {
    return { success: false, missing: requiredVars };
  }
}

function verifyInfrastructureComponents() {
  log.info('Starting infrastructure verification...\n');

  let totalChecks = 0;
  let passedChecks = 0;
  const failedChecks = [];

  // Check file existence
  Object.entries(checks).forEach(([key, check]) => {
    log.info(`Checking ${check.name}...`);
    
    const missingFiles = check.files.filter(file => !checkFileExists(file));
    
    if (missingFiles.length === 0) {
      log.success(`✓ ${check.name} - All files present`);
      passedChecks++;
    } else {
      log.error(`✗ ${check.name} - Missing files: ${missingFiles.join(', ')}`);
      failedChecks.push({
        name: check.name,
        issue: `Missing files: ${missingFiles.join(', ')}`,
        required: check.required
      });
    }
    
    totalChecks++;
  });

  // Check environment variables
  Object.entries(envVarChecks).forEach(([env, vars]) => {
    log.info(`Checking ${env} environment variables...`);
    
    const envFile = `.env.${env}`;
    const result = checkEnvironmentVariables(envFile, vars);
    
    if (result.success) {
      log.success(`✓ ${env} environment - All variables present`);
      passedChecks++;
    } else {
      log.error(`✗ ${env} environment - Missing variables: ${result.missing.join(', ')}`);
      failedChecks.push({
        name: `${env} Environment Variables`,
        issue: `Missing variables: ${result.missing.join(', ')}`,
        required: true
      });
    }
    
    totalChecks++;
  });

  return { totalChecks, passedChecks, failedChecks };
}

function checkPackageDependencies() {
  log.info('Checking package dependencies...');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      '@sentry/browser',
      '@datadog/browser-rum',
      'logrocket',
      'zod'
    ];
    
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const missing = requiredDeps.filter(dep => !allDeps[dep]);
    
    if (missing.length === 0) {
      log.success('✓ All required dependencies are installed');
      return true;
    } else {
      log.error(`✗ Missing dependencies: ${missing.join(', ')}`);
      return false;
    }
  } catch (error) {
    log.error('✗ Could not read package.json');
    return false;
  }
}

function generateReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('INFRASTRUCTURE VERIFICATION REPORT');
  console.log('='.repeat(60));
  
  console.log(`\nTotal Checks: ${results.totalChecks}`);
  console.log(`Passed: ${colors.green}${results.passedChecks}${colors.reset}`);
  console.log(`Failed: ${colors.red}${results.totalChecks - results.passedChecks}${colors.reset}`);
  
  const successRate = (results.passedChecks / results.totalChecks * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);
  
  if (results.failedChecks.length > 0) {
    console.log('\n' + colors.red + 'FAILED CHECKS:' + colors.reset);
    results.failedChecks.forEach((check, index) => {
      console.log(`${index + 1}. ${check.name}`);
      console.log(`   Issue: ${check.issue}`);
      console.log(`   Required: ${check.required ? 'Yes' : 'No'}`);
    });
    
    console.log('\n' + colors.yellow + 'RECOMMENDATIONS:' + colors.reset);
    console.log('1. Run the infrastructure setup script: ./scripts/infrastructure-setup.sh');
    console.log('2. Ensure all environment files are properly configured');
    console.log('3. Install missing dependencies: npm install');
    console.log('4. Review the TECHNICAL_INFRASTRUCTURE_IMPLEMENTATION.md guide');
  } else {
    console.log('\n' + colors.green + '🎉 ALL CHECKS PASSED!' + colors.reset);
    console.log('Your infrastructure is properly configured and ready for deployment.');
  }
  
  console.log('\n' + '='.repeat(60));
}

// Main execution
function main() {
  console.log(colors.blue + '🔍 ClinicBoost Infrastructure Verification' + colors.reset);
  console.log('Verifying technical infrastructure implementation...\n');
  
  // Run verification checks
  const results = verifyInfrastructureComponents();
  
  // Check dependencies
  const depsOk = checkPackageDependencies();
  if (depsOk) {
    results.passedChecks++;
  } else {
    results.failedChecks.push({
      name: 'Package Dependencies',
      issue: 'Missing required dependencies',
      required: true
    });
  }
  results.totalChecks++;
  
  // Generate report
  generateReport(results);
  
  // Exit with appropriate code
  const hasRequiredFailures = results.failedChecks.some(check => check.required);
  process.exit(hasRequiredFailures ? 1 : 0);
}

// Run the main function
main();

export { verifyInfrastructureComponents, checkEnvironmentVariables };
