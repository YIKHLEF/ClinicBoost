#!/usr/bin/env node

/**
 * Database Migration Script
 * Handles database schema migrations for ClinicBoost
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  migrationsDir: path.join(__dirname, '..', 'database', 'migrations'),
  environment: process.env.NODE_ENV || 'development',
  dryRun: process.env.DRY_RUN === 'true',
  verbose: process.env.VERBOSE === 'true'
};

// Initialize Supabase client
const supabase = createClient(config.supabaseUrl, config.supabaseKey);

/**
 * Migration tracking table
 */
const MIGRATIONS_TABLE = 'schema_migrations';

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
  } else if (level === 'debug' && config.verbose) {
    console.log(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  log('Creating migrations tracking table if not exists...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      execution_time_ms INTEGER,
      checksum VARCHAR(64),
      applied_by VARCHAR(255) DEFAULT current_user
    );
    
    CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
    ON ${MIGRATIONS_TABLE} (version);
  `;
  
  if (config.dryRun) {
    log('DRY RUN: Would create migrations table', 'debug');
    return;
  }
  
  const { error } = await supabase.rpc('execute_sql', { sql: createTableSQL });
  
  if (error && !error.message.includes('already exists')) {
    throw new Error(`Failed to create migrations table: ${error.message}`);
  }
  
  log('Migrations tracking table ready');
}

/**
 * Calculate checksum for migration file
 */
async function calculateChecksum(filePath) {
  const crypto = require('crypto');
  const content = await fs.readFile(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  log('Fetching applied migrations...');
  
  const { data, error } = await supabase
    .from(MIGRATIONS_TABLE)
    .select('version, applied_at, checksum')
    .order('version', { ascending: true });
  
  if (error) {
    throw new Error(`Failed to get applied migrations: ${error.message}`);
  }
  
  log(`Found ${data.length} applied migrations`);
  return data;
}

/**
 * Get list of available migration files
 */
async function getAvailableMigrations() {
  log('Scanning for migration files...');
  
  try {
    const files = await fs.readdir(config.migrationsDir);
    const migrations = [];
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        const filePath = path.join(config.migrationsDir, file);
        const checksum = await calculateChecksum(filePath);
        
        migrations.push({
          version: file.replace('.sql', ''),
          filename: file,
          path: filePath,
          checksum
        });
      }
    }
    
    migrations.sort((a, b) => a.version.localeCompare(b.version));
    log(`Found ${migrations.length} migration files`);
    
    return migrations;
  } catch (error) {
    throw new Error(`Failed to read migrations directory: ${error.message}`);
  }
}

/**
 * Execute a migration file
 */
async function executeMigration(migration) {
  const startTime = Date.now();
  
  try {
    const sql = await fs.readFile(migration.path, 'utf8');
    
    log(`Executing migration: ${migration.version}`);
    log(`File: ${migration.filename}`, 'debug');
    
    if (config.dryRun) {
      log(`DRY RUN: Would execute migration ${migration.version}`, 'debug');
      log(`SQL content preview: ${sql.substring(0, 200)}...`, 'debug');
      return;
    }
    
    // Execute the migration
    const { error } = await supabase.rpc('execute_sql', { sql });
    
    if (error) {
      throw new Error(`Migration execution failed: ${error.message}`);
    }
    
    const executionTime = Date.now() - startTime;
    
    // Record the migration as applied
    const { error: insertError } = await supabase
      .from(MIGRATIONS_TABLE)
      .insert({
        version: migration.version,
        applied_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        checksum: migration.checksum,
        applied_by: process.env.USER || process.env.USERNAME || 'ci-cd'
      });
    
    if (insertError) {
      throw new Error(`Failed to record migration: ${insertError.message}`);
    }
    
    log(`✓ Migration ${migration.version} applied successfully (${executionTime}ms)`);
    
  } catch (error) {
    log(`✗ Migration ${migration.version} failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Run pending migrations
 */
async function runMigrations() {
  try {
    log(`Starting migration process for ${config.environment} environment...`);
    
    if (config.dryRun) {
      log('Running in DRY RUN mode - no changes will be applied', 'warn');
    }
    
    // Ensure migrations table exists
    await createMigrationsTable();
    
    // Get applied and available migrations
    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = await getAvailableMigrations();
    
    // Find pending migrations
    const appliedVersions = appliedMigrations.map(m => m.version);
    const pendingMigrations = availableMigrations.filter(
      migration => !appliedVersions.includes(migration.version)
    );
    
    if (pendingMigrations.length === 0) {
      log('No pending migrations found.');
      return;
    }
    
    log(`Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(migration => {
      log(`  - ${migration.version}`);
    });
    
    if (config.dryRun) {
      log('DRY RUN: Would apply the above migrations');
      return;
    }
    
    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    log(`✓ All migrations completed successfully!`);
    
  } catch (error) {
    log(`Migration failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

/**
 * Show migration status
 */
async function showStatus() {
  try {
    await createMigrationsTable();
    
    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = await getAvailableMigrations();
    
    console.log('\nMigration Status:');
    console.log('================');
    
    availableMigrations.forEach(migration => {
      const applied = appliedMigrations.find(m => m.version === migration.version);
      const status = applied ? '✓ Applied' : '✗ Pending';
      const appliedAt = applied ? ` (${applied.applied_at})` : '';
      console.log(`${status} ${migration.version}${appliedAt}`);
    });
    
    const pendingCount = availableMigrations.length - appliedMigrations.length;
    console.log(`\nTotal: ${availableMigrations.length} migrations`);
    console.log(`Applied: ${appliedMigrations.length}`);
    console.log(`Pending: ${pendingCount}`);
    
  } catch (error) {
    console.error('Failed to show status:', error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2] || 'migrate';
  
  switch (command) {
    case 'migrate':
      runMigrations();
      break;
    case 'status':
      showStatus();
      break;
    default:
      console.log('Usage: node migrate.js [migrate|status]');
      process.exit(1);
  }
}
