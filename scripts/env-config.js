#!/usr/bin/env node

/**
 * Environment Configuration Management Script
 * Manages environment-specific configurations for ClinicBoost
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  environments: ['development', 'staging', 'production'],
  configDir: path.join(__dirname, '..'),
  secretsRequired: {
    production: [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VITE_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_SECRET_KEY',
      'VITE_TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'VITE_AZURE_AI_ENDPOINT',
      'AZURE_AI_KEY'
    ],
    staging: [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ],
    development: []
  }
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
 * Parse environment file
 */
async function parseEnvFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    
    return env;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

/**
 * Write environment file
 */
async function writeEnvFile(filePath, env, comments = {}) {
  const lines = [];
  
  // Add header comment
  lines.push(`# Environment Configuration - ${path.basename(filePath)}`);
  lines.push(`# Generated on ${new Date().toISOString()}`);
  lines.push('# DO NOT commit this file to version control');
  lines.push('');
  
  // Group variables by category
  const categories = {
    'Application': ['VITE_APP_', 'NODE_ENV'],
    'Database': ['VITE_SUPABASE_', 'SUPABASE_', 'DATABASE_', 'POSTGRES_'],
    'External Services': ['VITE_TWILIO_', 'TWILIO_', 'VITE_STRIPE_', 'STRIPE_', 'VITE_AZURE_', 'AZURE_'],
    'Security': ['JWT_', 'CORS_', 'RATE_LIMIT_'],
    'Storage': ['VITE_S3_', 'S3_', 'VITE_STORAGE_'],
    'Monitoring': ['VITE_SENTRY_', 'SENTRY_', 'VITE_GOOGLE_ANALYTICS_'],
    'Features': ['VITE_ENABLE_'],
    'Other': []
  };
  
  const categorized = {};
  const uncategorized = [];
  
  Object.keys(env).forEach(key => {
    let found = false;
    for (const [category, prefixes] of Object.entries(categories)) {
      if (category === 'Other') continue;
      
      if (prefixes.some(prefix => key.startsWith(prefix))) {
        if (!categorized[category]) categorized[category] = [];
        categorized[category].push(key);
        found = true;
        break;
      }
    }
    
    if (!found) {
      uncategorized.push(key);
    }
  });
  
  // Write categorized variables
  Object.entries(categorized).forEach(([category, keys]) => {
    if (keys.length > 0) {
      lines.push(`# ${category}`);
      keys.sort().forEach(key => {
        if (comments[key]) {
          lines.push(`# ${comments[key]}`);
        }
        lines.push(`${key}=${env[key]}`);
      });
      lines.push('');
    }
  });
  
  // Write uncategorized variables
  if (uncategorized.length > 0) {
    lines.push('# Other Configuration');
    uncategorized.sort().forEach(key => {
      if (comments[key]) {
        lines.push(`# ${comments[key]}`);
      }
      lines.push(`${key}=${env[key]}`);
    });
    lines.push('');
  }
  
  await fs.writeFile(filePath, lines.join('\n'));
}

/**
 * Validate environment configuration
 */
async function validateEnvironment(environment) {
  log(`Validating ${environment} environment configuration...`);
  
  const envFile = path.join(config.configDir, `.env.${environment}`);
  const env = await parseEnvFile(envFile);
  
  const issues = [];
  const warnings = [];
  
  // Check required secrets
  const requiredSecrets = config.secretsRequired[environment] || [];
  requiredSecrets.forEach(secret => {
    if (!env[secret] || env[secret].includes('your-') || env[secret].includes('demo-')) {
      issues.push(`Missing or placeholder value for required secret: ${secret}`);
    }
  });
  
  // Check for common issues
  if (env.NODE_ENV && env.NODE_ENV !== environment) {
    warnings.push(`NODE_ENV (${env.NODE_ENV}) doesn't match environment (${environment})`);
  }
  
  if (environment === 'production') {
    if (env.VITE_ENABLE_DEBUG_MODE === 'true') {
      issues.push('Debug mode should be disabled in production');
    }
    
    if (env.VITE_ENABLE_DEVTOOLS === 'true') {
      issues.push('Dev tools should be disabled in production');
    }
    
    if (env.VITE_LOG_LEVEL === 'debug') {
      warnings.push('Debug logging enabled in production');
    }
  }
  
  // Report results
  if (issues.length > 0) {
    log(`Validation failed for ${environment}:`, 'error');
    issues.forEach(issue => log(`  - ${issue}`, 'error'));
    return false;
  }
  
  if (warnings.length > 0) {
    log(`Validation warnings for ${environment}:`, 'warn');
    warnings.forEach(warning => log(`  - ${warning}`, 'warn'));
  }
  
  log(`✓ ${environment} environment validation passed`);
  return true;
}

/**
 * Compare environments
 */
async function compareEnvironments(env1, env2) {
  log(`Comparing ${env1} and ${env2} environments...`);
  
  const env1File = path.join(config.configDir, `.env.${env1}`);
  const env2File = path.join(config.configDir, `.env.${env2}`);
  
  const env1Config = await parseEnvFile(env1File);
  const env2Config = await parseEnvFile(env2File);
  
  const env1Keys = new Set(Object.keys(env1Config));
  const env2Keys = new Set(Object.keys(env2Config));
  
  const onlyInEnv1 = [...env1Keys].filter(key => !env2Keys.has(key));
  const onlyInEnv2 = [...env2Keys].filter(key => !env1Keys.has(key));
  const common = [...env1Keys].filter(key => env2Keys.has(key));
  const different = common.filter(key => env1Config[key] !== env2Config[key]);
  
  console.log(`\nEnvironment Comparison: ${env1} vs ${env2}`);
  console.log('='.repeat(50));
  
  if (onlyInEnv1.length > 0) {
    console.log(`\nOnly in ${env1}:`);
    onlyInEnv1.forEach(key => console.log(`  + ${key}`));
  }
  
  if (onlyInEnv2.length > 0) {
    console.log(`\nOnly in ${env2}:`);
    onlyInEnv2.forEach(key => console.log(`  + ${key}`));
  }
  
  if (different.length > 0) {
    console.log(`\nDifferent values:`);
    different.forEach(key => {
      console.log(`  ~ ${key}`);
      console.log(`    ${env1}: ${env1Config[key]}`);
      console.log(`    ${env2}: ${env2Config[key]}`);
    });
  }
  
  console.log(`\nSummary:`);
  console.log(`  Common variables: ${common.length}`);
  console.log(`  Different values: ${different.length}`);
  console.log(`  Only in ${env1}: ${onlyInEnv1.length}`);
  console.log(`  Only in ${env2}: ${onlyInEnv2.length}`);
}

/**
 * Generate environment template
 */
async function generateTemplate(environment) {
  log(`Generating template for ${environment} environment...`);
  
  const exampleFile = path.join(config.configDir, '.env.example');
  const templateFile = path.join(config.configDir, `.env.${environment}.template`);
  
  const exampleEnv = await parseEnvFile(exampleFile);
  const templateEnv = {};
  
  // Copy all variables with placeholder values
  Object.keys(exampleEnv).forEach(key => {
    if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
      templateEnv[key] = `your-${environment}-${key.toLowerCase().replace(/_/g, '-')}`;
    } else {
      templateEnv[key] = exampleEnv[key];
    }
  });
  
  // Environment-specific overrides
  templateEnv.NODE_ENV = environment;
  templateEnv.VITE_APP_ENV = environment;
  
  if (environment === 'production') {
    templateEnv.VITE_ENABLE_DEBUG_MODE = 'false';
    templateEnv.VITE_ENABLE_DEVTOOLS = 'false';
    templateEnv.VITE_LOG_LEVEL = 'warn';
  }
  
  await writeEnvFile(templateFile, templateEnv);
  log(`Template generated: ${templateFile}`);
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];
  const environment = process.argv[3];
  const environment2 = process.argv[4];
  
  try {
    switch (command) {
      case 'validate':
        if (!environment) {
          log('Usage: node env-config.js validate <environment>', 'error');
          process.exit(1);
        }
        const isValid = await validateEnvironment(environment);
        process.exit(isValid ? 0 : 1);
        break;
        
      case 'validate-all':
        let allValid = true;
        for (const env of config.environments) {
          const isValid = await validateEnvironment(env);
          allValid = allValid && isValid;
        }
        process.exit(allValid ? 0 : 1);
        break;
        
      case 'compare':
        if (!environment || !environment2) {
          log('Usage: node env-config.js compare <env1> <env2>', 'error');
          process.exit(1);
        }
        await compareEnvironments(environment, environment2);
        break;
        
      case 'template':
        if (!environment) {
          log('Usage: node env-config.js template <environment>', 'error');
          process.exit(1);
        }
        await generateTemplate(environment);
        break;
        
      default:
        console.log('Usage: node env-config.js <command> [options]');
        console.log('Commands:');
        console.log('  validate <env>     - Validate environment configuration');
        console.log('  validate-all       - Validate all environments');
        console.log('  compare <env1> <env2> - Compare two environments');
        console.log('  template <env>     - Generate environment template');
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
