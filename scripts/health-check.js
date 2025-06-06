#!/usr/bin/env node

/**
 * Health Check Script for ClinicBoost
 * 
 * Performs comprehensive health checks on the application
 */

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

// Configuration
const config = {
  development: {
    url: 'http://localhost:3000',
    timeout: 5000,
  },
  staging: {
    url: 'https://staging.clinicboost.com',
    timeout: 10000,
  },
  production: {
    url: 'https://app.clinicboost.com',
    timeout: 10000,
  },
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`);
}

function makeRequest(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = client.get(url, { timeout }, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          responseTime,
        });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });
    
    req.on('error', reject);
  });
}

async function checkHealth(environment) {
  const envConfig = config[environment];
  if (!envConfig) {
    throw new Error(`Unknown environment: ${environment}`);
  }
  
  log('blue', `Starting health check for ${environment} environment`);
  log('blue', `Target URL: ${envConfig.url}`);
  
  const checks = [];
  
  // 1. Basic health endpoint check
  try {
    log('blue', 'Checking basic health endpoint...');
    const response = await makeRequest(`${envConfig.url}/health`, envConfig.timeout);
    
    if (response.statusCode === 200) {
      log('green', `✓ Health endpoint responded with status 200 (${response.responseTime}ms)`);
      checks.push({ name: 'health_endpoint', status: 'pass', responseTime: response.responseTime });
    } else {
      log('red', `✗ Health endpoint returned status ${response.statusCode}`);
      checks.push({ name: 'health_endpoint', status: 'fail', statusCode: response.statusCode });
    }
  } catch (error) {
    log('red', `✗ Health endpoint check failed: ${error.message}`);
    checks.push({ name: 'health_endpoint', status: 'fail', error: error.message });
  }
  
  // 2. Application root check
  try {
    log('blue', 'Checking application root...');
    const response = await makeRequest(envConfig.url, envConfig.timeout);
    
    if (response.statusCode === 200) {
      log('green', `✓ Application root accessible (${response.responseTime}ms)`);
      checks.push({ name: 'app_root', status: 'pass', responseTime: response.responseTime });
    } else {
      log('yellow', `⚠ Application root returned status ${response.statusCode}`);
      checks.push({ name: 'app_root', status: 'warn', statusCode: response.statusCode });
    }
  } catch (error) {
    log('red', `✗ Application root check failed: ${error.message}`);
    checks.push({ name: 'app_root', status: 'fail', error: error.message });
  }
  
  // 3. API endpoint check
  try {
    log('blue', 'Checking API endpoint...');
    const response = await makeRequest(`${envConfig.url}/api/health`, envConfig.timeout);
    
    if (response.statusCode === 200) {
      log('green', `✓ API endpoint accessible (${response.responseTime}ms)`);
      checks.push({ name: 'api_endpoint', status: 'pass', responseTime: response.responseTime });
    } else {
      log('yellow', `⚠ API endpoint returned status ${response.statusCode}`);
      checks.push({ name: 'api_endpoint', status: 'warn', statusCode: response.statusCode });
    }
  } catch (error) {
    log('yellow', `⚠ API endpoint check failed: ${error.message}`);
    checks.push({ name: 'api_endpoint', status: 'warn', error: error.message });
  }
  
  // 4. Security headers check
  try {
    log('blue', 'Checking security headers...');
    const response = await makeRequest(envConfig.url, envConfig.timeout);
    
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'content-security-policy',
    ];
    
    const missingHeaders = securityHeaders.filter(header => !response.headers[header]);
    
    if (missingHeaders.length === 0) {
      log('green', '✓ All security headers present');
      checks.push({ name: 'security_headers', status: 'pass' });
    } else {
      log('yellow', `⚠ Missing security headers: ${missingHeaders.join(', ')}`);
      checks.push({ name: 'security_headers', status: 'warn', missingHeaders });
    }
  } catch (error) {
    log('yellow', `⚠ Security headers check failed: ${error.message}`);
    checks.push({ name: 'security_headers', status: 'warn', error: error.message });
  }
  
  // 5. SSL certificate check (for HTTPS)
  if (envConfig.url.startsWith('https')) {
    try {
      log('blue', 'Checking SSL certificate...');
      const response = await makeRequest(envConfig.url, envConfig.timeout);
      
      // Basic SSL check - if we got a response, SSL is working
      log('green', '✓ SSL certificate valid');
      checks.push({ name: 'ssl_certificate', status: 'pass' });
    } catch (error) {
      if (error.message.includes('certificate') || error.message.includes('SSL')) {
        log('red', `✗ SSL certificate issue: ${error.message}`);
        checks.push({ name: 'ssl_certificate', status: 'fail', error: error.message });
      } else {
        log('yellow', `⚠ SSL check inconclusive: ${error.message}`);
        checks.push({ name: 'ssl_certificate', status: 'warn', error: error.message });
      }
    }
  }
  
  // 6. Docker container check (if running in Docker)
  if (environment !== 'production') {
    try {
      log('blue', 'Checking Docker containers...');
      const output = execSync('docker ps --format "table {{.Names}}\\t{{.Status}}"', { encoding: 'utf8' });
      
      if (output.includes('clinicboost') || output.includes('app')) {
        log('green', '✓ Docker containers running');
        checks.push({ name: 'docker_containers', status: 'pass' });
      } else {
        log('yellow', '⚠ No ClinicBoost Docker containers found');
        checks.push({ name: 'docker_containers', status: 'warn' });
      }
    } catch (error) {
      log('yellow', `⚠ Docker check failed: ${error.message}`);
      checks.push({ name: 'docker_containers', status: 'warn', error: error.message });
    }
  }
  
  return checks;
}

function generateReport(environment, checks) {
  const passCount = checks.filter(c => c.status === 'pass').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  
  log('blue', '\n=== HEALTH CHECK REPORT ===');
  log('blue', `Environment: ${environment}`);
  log('blue', `Timestamp: ${new Date().toISOString()}`);
  log('blue', `Total Checks: ${checks.length}`);
  log('green', `Passed: ${passCount}`);
  log('yellow', `Warnings: ${warnCount}`);
  log('red', `Failed: ${failCount}`);
  
  log('blue', '\n=== DETAILED RESULTS ===');
  checks.forEach(check => {
    const status = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    const color = check.status === 'pass' ? 'green' : check.status === 'warn' ? 'yellow' : 'red';
    
    let message = `${status} ${check.name}`;
    if (check.responseTime) {
      message += ` (${check.responseTime}ms)`;
    }
    if (check.error) {
      message += ` - ${check.error}`;
    }
    
    log(color, message);
  });
  
  // Overall status
  const overallStatus = failCount > 0 ? 'CRITICAL' : warnCount > 0 ? 'WARNING' : 'HEALTHY';
  const statusColor = overallStatus === 'HEALTHY' ? 'green' : overallStatus === 'WARNING' ? 'yellow' : 'red';
  
  log('blue', '\n=== OVERALL STATUS ===');
  log(statusColor, `Status: ${overallStatus}`);
  
  return {
    environment,
    timestamp: new Date().toISOString(),
    overallStatus,
    checks,
    summary: {
      total: checks.length,
      passed: passCount,
      warnings: warnCount,
      failed: failCount,
    },
  };
}

async function main() {
  const environment = process.argv[2] || 'development';
  
  try {
    const checks = await checkHealth(environment);
    const report = generateReport(environment, checks);
    
    // Write report to file
    const fs = require('fs');
    const reportPath = `./reports/health-check-${environment}-${Date.now()}.json`;
    
    // Ensure reports directory exists
    if (!fs.existsSync('./reports')) {
      fs.mkdirSync('./reports', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log('blue', `\nReport saved to: ${reportPath}`);
    
    // Exit with appropriate code
    const exitCode = report.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    log('red', `Health check failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log('red', `Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('red', `Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the health check
if (require.main === module) {
  main();
}

module.exports = { checkHealth, generateReport };
