#!/usr/bin/env node

/**
 * Deployment Status and Monitoring Script
 * Provides comprehensive status information for ClinicBoost deployments
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const config = {
  environments: {
    staging: {
      app: 'https://staging.clinicboost.com',
      api: 'https://staging-api.clinicboost.com',
      name: 'Staging'
    },
    production: {
      app: 'https://app.clinicboost.com',
      api: 'https://api.clinicboost.com',
      name: 'Production'
    }
  },
  timeout: 10000,
  retries: 3
};

/**
 * Logging utility
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (level === 'error') {
    console.error(`${prefix} ${message}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Make HTTP request with timeout and retries
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      timeout: config.timeout,
      headers: {
        'User-Agent': 'ClinicBoost-Monitor/1.0',
        ...options.headers
      }
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          responseTime: Date.now() - startTime
        });
      });
    });
    
    const startTime = Date.now();
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.data) {
      req.write(options.data);
    }
    
    req.end();
  });
}

/**
 * Check endpoint health with retries
 */
async function checkEndpoint(url, retries = config.retries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await makeRequest(url);
      
      return {
        url,
        status: response.statusCode === 200 ? 'healthy' : 'unhealthy',
        statusCode: response.statusCode,
        responseTime: response.responseTime,
        attempt,
        error: null
      };
    } catch (error) {
      if (attempt === retries) {
        return {
          url,
          status: 'error',
          statusCode: null,
          responseTime: null,
          attempt,
          error: error.message
        };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/**
 * Check SSL certificate
 */
async function checkSSL(hostname) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port: 443,
      method: 'GET',
      timeout: config.timeout
    };
    
    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      
      if (cert && cert.valid_to) {
        const expiryDate = new Date(cert.valid_to);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        resolve({
          valid: true,
          expiryDate: expiryDate.toISOString(),
          daysUntilExpiry,
          issuer: cert.issuer?.CN || 'Unknown',
          subject: cert.subject?.CN || 'Unknown'
        });
      } else {
        resolve({
          valid: false,
          error: 'No certificate found'
        });
      }
      
      req.destroy();
    });
    
    req.on('error', (error) => {
      resolve({
        valid: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        valid: false,
        error: 'SSL check timeout'
      });
    });
    
    req.end();
  });
}

/**
 * Get deployment information
 */
async function getDeploymentInfo(apiUrl) {
  try {
    const response = await makeRequest(`${apiUrl}/api/deployment-info`);
    
    if (response.statusCode === 200) {
      return JSON.parse(response.data);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check environment status
 */
async function checkEnvironmentStatus(environment, envConfig) {
  log(`Checking ${envConfig.name} environment...`);
  
  const results = {
    environment,
    name: envConfig.name,
    timestamp: new Date().toISOString(),
    overall: 'unknown',
    services: {},
    ssl: {},
    deployment: null
  };
  
  // Check main application
  const appCheck = await checkEndpoint(`${envConfig.app}/health`);
  results.services.app = appCheck;
  
  // Check API
  const apiCheck = await checkEndpoint(`${envConfig.api}/api/health`);
  results.services.api = apiCheck;
  
  // Check database (via API)
  const dbCheck = await checkEndpoint(`${envConfig.api}/api/health/database`);
  results.services.database = dbCheck;
  
  // Check SSL certificates
  const appHostname = new URL(envConfig.app).hostname;
  const apiHostname = new URL(envConfig.api).hostname;
  
  results.ssl.app = await checkSSL(appHostname);
  if (appHostname !== apiHostname) {
    results.ssl.api = await checkSSL(apiHostname);
  }
  
  // Get deployment information
  results.deployment = await getDeploymentInfo(envConfig.api);
  
  // Determine overall status
  const serviceStatuses = Object.values(results.services).map(s => s.status);
  const hasError = serviceStatuses.includes('error');
  const hasUnhealthy = serviceStatuses.includes('unhealthy');
  
  if (hasError) {
    results.overall = 'error';
  } else if (hasUnhealthy) {
    results.overall = 'unhealthy';
  } else {
    results.overall = 'healthy';
  }
  
  return results;
}

/**
 * Display status results
 */
function displayStatus(results) {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'unhealthy': return '⚠️';
      case 'error': return '❌';
      default: return '❓';
    }
  };
  
  console.log(`\n${getStatusIcon(results.overall)} ${results.name} Environment Status`);
  console.log('='.repeat(50));
  console.log(`Overall Status: ${results.overall.toUpperCase()}`);
  console.log(`Checked at: ${new Date(results.timestamp).toLocaleString()}`);
  
  console.log('\nServices:');
  Object.entries(results.services).forEach(([service, status]) => {
    const icon = getStatusIcon(status.status);
    const responseTime = status.responseTime ? `(${status.responseTime}ms)` : '';
    const error = status.error ? ` - ${status.error}` : '';
    console.log(`  ${icon} ${service.toUpperCase()}: ${status.status} ${responseTime}${error}`);
  });
  
  console.log('\nSSL Certificates:');
  Object.entries(results.ssl).forEach(([service, ssl]) => {
    if (ssl.valid) {
      const icon = ssl.daysUntilExpiry > 30 ? '✅' : ssl.daysUntilExpiry > 7 ? '⚠️' : '❌';
      console.log(`  ${icon} ${service.toUpperCase()}: Valid (expires in ${ssl.daysUntilExpiry} days)`);
    } else {
      console.log(`  ❌ ${service.toUpperCase()}: Invalid - ${ssl.error}`);
    }
  });
  
  if (results.deployment) {
    console.log('\nDeployment Info:');
    console.log(`  Version: ${results.deployment.version || 'Unknown'}`);
    console.log(`  Build Time: ${results.deployment.buildTime || 'Unknown'}`);
    console.log(`  Environment: ${results.deployment.environment || 'Unknown'}`);
    console.log(`  Uptime: ${results.deployment.uptime || 'Unknown'}`);
  }
}

/**
 * Generate status report
 */
async function generateStatusReport(environments = null) {
  const targetEnvs = environments || Object.keys(config.environments);
  const results = [];
  
  for (const env of targetEnvs) {
    if (!config.environments[env]) {
      log(`Unknown environment: ${env}`, 'error');
      continue;
    }
    
    const result = await checkEnvironmentStatus(env, config.environments[env]);
    results.push(result);
    displayStatus(result);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const icon = result.overall === 'healthy' ? '✅' : 
                 result.overall === 'unhealthy' ? '⚠️' : '❌';
    console.log(`${icon} ${result.name}: ${result.overall.toUpperCase()}`);
  });
  
  const hasIssues = results.some(r => r.overall !== 'healthy');
  
  if (hasIssues) {
    console.log('\n⚠️  Issues detected. Check the detailed status above.');
    process.exit(1);
  } else {
    console.log('\n✅ All systems operational.');
    process.exit(0);
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];
  const environment = process.argv[3];
  
  try {
    switch (command) {
      case 'check':
        if (environment && !config.environments[environment]) {
          log(`Unknown environment: ${environment}`, 'error');
          process.exit(1);
        }
        await generateStatusReport(environment ? [environment] : null);
        break;
        
      case 'monitor':
        log('Starting continuous monitoring...');
        setInterval(async () => {
          await generateStatusReport();
        }, 60000); // Check every minute
        break;
        
      default:
        console.log('Usage: node deployment-status.js <command> [environment]');
        console.log('Commands:');
        console.log('  check [env]    - Check status (all environments or specific)');
        console.log('  monitor        - Continuous monitoring');
        console.log('Environments: staging, production');
        process.exit(1);
    }
  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
