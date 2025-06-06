#!/usr/bin/env node

/**
 * Integration Setup Script
 * 
 * This script helps users configure their third-party integrations
 * by validating credentials and setting up environment variables.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(colorize(prompt, 'cyan'), resolve);
  });
}

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

async function setupIntegrations() {
  log('\n🚀 ClinicBoost Integration Setup', 'bright');
  log('=====================================\n', 'bright');

  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  // Check if .env.example exists
  if (!fs.existsSync(envExamplePath)) {
    log('❌ .env.example file not found!', 'red');
    log('Please make sure you\'re running this script from the project root.', 'yellow');
    process.exit(1);
  }

  // Read .env.example
  const envExample = fs.readFileSync(envExamplePath, 'utf8');
  let envContent = envExample;

  log('This script will help you configure your third-party integrations.\n', 'green');

  // Environment selection
  log('1. Environment Configuration', 'bright');
  log('============================\n');
  
  const environment = await question('Select environment (development/staging/production) [development]: ');
  const env = environment.trim() || 'development';
  
  envContent = envContent.replace('NODE_ENV=development', `NODE_ENV=${env}`);
  envContent = envContent.replace('VITE_MODE=development', `VITE_MODE=${env}`);

  // Application configuration
  const appName = await question('Application name [ClinicBoost]: ');
  if (appName.trim()) {
    envContent = envContent.replace('VITE_APP_NAME=ClinicBoost', `VITE_APP_NAME=${appName.trim()}`);
  }

  const appUrl = await question(`Application URL [${env === 'production' ? 'https://your-domain.com' : 'http://localhost:5173'}]: `);
  if (appUrl.trim()) {
    envContent = envContent.replace('VITE_APP_URL=http://localhost:5173', `VITE_APP_URL=${appUrl.trim()}`);
  }

  // Security configuration
  log('\n2. Security Configuration', 'bright');
  log('==========================\n');
  
  const generateKeys = await question('Generate secure encryption keys automatically? (y/n) [y]: ');
  if (generateKeys.toLowerCase() !== 'n') {
    const encryptionKey = generateSecureKey(32);
    const jwtSecret = generateSecureKey(64);
    
    envContent = envContent.replace('ENCRYPTION_KEY=your_256_bit_encryption_key', `ENCRYPTION_KEY=${encryptionKey}`);
    envContent = envContent.replace('JWT_SECRET=your_jwt_secret_key', `JWT_SECRET=${jwtSecret}`);
    
    log('✅ Generated secure encryption keys', 'green');
  }

  // Supabase configuration
  log('\n3. Supabase Configuration', 'bright');
  log('==========================\n');
  
  const setupSupabase = await question('Configure Supabase? (y/n) [y]: ');
  if (setupSupabase.toLowerCase() !== 'n') {
    const supabaseUrl = await question('Supabase Project URL: ');
    const supabaseAnonKey = await question('Supabase Anonymous Key: ');
    
    if (supabaseUrl.trim()) {
      envContent = envContent.replace('VITE_SUPABASE_URL=your_supabase_project_url', `VITE_SUPABASE_URL=${supabaseUrl.trim()}`);
    }
    
    if (supabaseAnonKey.trim()) {
      envContent = envContent.replace('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key', `VITE_SUPABASE_ANON_KEY=${supabaseAnonKey.trim()}`);
    }
    
    if (env !== 'development') {
      const supabaseServiceKey = await question('Supabase Service Role Key (server-side only): ');
      if (supabaseServiceKey.trim()) {
        envContent = envContent.replace('SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key', `SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey.trim()}`);
      }
    }
    
    log('✅ Supabase configuration updated', 'green');
  }

  // Stripe configuration
  log('\n4. Stripe Configuration', 'bright');
  log('========================\n');
  
  const setupStripe = await question('Configure Stripe payments? (y/n) [y]: ');
  if (setupStripe.toLowerCase() !== 'n') {
    const stripePublishableKey = await question('Stripe Publishable Key: ');
    
    if (stripePublishableKey.trim()) {
      envContent = envContent.replace('VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key', `VITE_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey.trim()}`);
    }
    
    if (env !== 'development') {
      const stripeSecretKey = await question('Stripe Secret Key (server-side only): ');
      const stripeWebhookSecret = await question('Stripe Webhook Secret (server-side only): ');
      
      if (stripeSecretKey.trim()) {
        envContent = envContent.replace('STRIPE_SECRET_KEY=your_stripe_secret_key', `STRIPE_SECRET_KEY=${stripeSecretKey.trim()}`);
      }
      
      if (stripeWebhookSecret.trim()) {
        envContent = envContent.replace('STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret', `STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret.trim()}`);
      }
    }
    
    log('✅ Stripe configuration updated', 'green');
  }

  // Twilio configuration
  log('\n5. Twilio Configuration', 'bright');
  log('========================\n');
  
  const setupTwilio = await question('Configure Twilio messaging? (y/n) [y]: ');
  if (setupTwilio.toLowerCase() !== 'n') {
    if (env !== 'development') {
      const twilioAccountSid = await question('Twilio Account SID: ');
      const twilioAuthToken = await question('Twilio Auth Token: ');
      const twilioPhoneNumber = await question('Twilio Phone Number: ');
      
      if (twilioAccountSid.trim()) {
        envContent = envContent.replace('TWILIO_ACCOUNT_SID=your_twilio_account_sid', `TWILIO_ACCOUNT_SID=${twilioAccountSid.trim()}`);
      }
      
      if (twilioAuthToken.trim()) {
        envContent = envContent.replace('TWILIO_AUTH_TOKEN=your_twilio_auth_token', `TWILIO_AUTH_TOKEN=${twilioAuthToken.trim()}`);
      }
      
      if (twilioPhoneNumber.trim()) {
        envContent = envContent.replace('TWILIO_FROM_NUMBER=your_twilio_phone_number', `TWILIO_FROM_NUMBER=${twilioPhoneNumber.trim()}`);
      }
    } else {
      log('ℹ️  Twilio configuration skipped for development environment', 'yellow');
    }
    
    log('✅ Twilio configuration updated', 'green');
  }

  // Azure AI configuration
  log('\n6. Azure AI Configuration', 'bright');
  log('==========================\n');
  
  const setupAzureAI = await question('Configure Azure AI Text Analytics? (y/n) [y]: ');
  if (setupAzureAI.toLowerCase() !== 'n') {
    if (env !== 'development') {
      const azureEndpoint = await question('Azure AI Endpoint: ');
      const azureApiKey = await question('Azure AI API Key: ');
      
      if (azureEndpoint.trim()) {
        envContent = envContent.replace('AZURE_AI_ENDPOINT=your_azure_endpoint', `AZURE_AI_ENDPOINT=${azureEndpoint.trim()}`);
      }
      
      if (azureApiKey.trim()) {
        envContent = envContent.replace('AZURE_AI_API_KEY=your_azure_key', `AZURE_AI_API_KEY=${azureApiKey.trim()}`);
      }
    } else {
      log('ℹ️  Azure AI configuration skipped for development environment', 'yellow');
    }
    
    log('✅ Azure AI configuration updated', 'green');
  }

  // Feature flags
  log('\n7. Feature Configuration', 'bright');
  log('=========================\n');
  
  const enablePayments = await question('Enable payments? (y/n) [y]: ');
  const enableSMS = await question('Enable SMS messaging? (y/n) [y]: ');
  const enableAnalytics = await question('Enable AI analytics? (y/n) [y]: ');
  
  if (enablePayments.toLowerCase() === 'n') {
    envContent = envContent.replace('VITE_ENABLE_PAYMENTS=true', 'VITE_ENABLE_PAYMENTS=false');
  }
  
  if (enableSMS.toLowerCase() === 'n') {
    envContent = envContent.replace('VITE_ENABLE_SMS=true', 'VITE_ENABLE_SMS=false');
  }
  
  if (enableAnalytics.toLowerCase() === 'n') {
    envContent = envContent.replace('VITE_ENABLE_ANALYTICS=true', 'VITE_ENABLE_ANALYTICS=false');
  }

  // Write .env file
  log('\n8. Saving Configuration', 'bright');
  log('========================\n');
  
  const overwrite = fs.existsSync(envPath) ? 
    await question('⚠️  .env file already exists. Overwrite? (y/n) [n]: ') : 'y';
  
  if (overwrite.toLowerCase() === 'y') {
    fs.writeFileSync(envPath, envContent);
    log('✅ Configuration saved to .env file', 'green');
  } else {
    const backupPath = `${envPath}.new`;
    fs.writeFileSync(backupPath, envContent);
    log(`✅ Configuration saved to ${backupPath}`, 'green');
    log('Please review and manually merge the changes.', 'yellow');
  }

  // Final instructions
  log('\n🎉 Setup Complete!', 'bright');
  log('==================\n', 'bright');
  
  log('Next steps:', 'green');
  log('1. Review your .env file and update any remaining placeholders', 'cyan');
  log('2. Install dependencies: npm install', 'cyan');
  log('3. Start the development server: npm run dev', 'cyan');
  log('4. Test your integrations using the status dashboard', 'cyan');
  
  if (env === 'production') {
    log('\n⚠️  Production Environment Notes:', 'yellow');
    log('- Ensure all server-side keys are properly secured', 'yellow');
    log('- Set up proper CORS and CSP headers', 'yellow');
    log('- Configure rate limiting and DDoS protection', 'yellow');
    log('- Enable HTTPS and proper SSL certificates', 'yellow');
  }

  rl.close();
}

// Run the setup
setupIntegrations().catch((error) => {
  log(`\n❌ Setup failed: ${error.message}`, 'red');
  process.exit(1);
});
