#!/usr/bin/env node

/**
 * Development Testing Setup Script
 * 
 * Sets up local development environment for enhanced testing
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DevTestingSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.configFiles = [];
  }

  /**
   * Setup complete development testing environment
   */
  async setupDevEnvironment() {
    console.log('🔧 Setting up development testing environment...\n');

    try {
      await this.checkPrerequisites();
      await this.setupTestEnvironment();
      await this.setupGitHooks();
      await this.setupVSCodeConfig();
      await this.setupTestDatabases();
      await this.generateTestData();
      await this.validateSetup();

      console.log('\n✅ Development testing environment setup complete!');
      this.printUsageInstructions();

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check prerequisites
   */
  async checkPrerequisites() {
    console.log('📋 Checking prerequisites...');

    const requirements = [
      { command: 'node --version', name: 'Node.js', minVersion: '18.0.0' },
      { command: 'npm --version', name: 'npm', minVersion: '8.0.0' },
      { command: 'git --version', name: 'Git', required: true }
    ];

    for (const req of requirements) {
      try {
        const output = execSync(req.command, { encoding: 'utf8' }).trim();
        console.log(`   ✅ ${req.name}: ${output}`);
      } catch (error) {
        throw new Error(`${req.name} is required but not installed`);
      }
    }
  }

  /**
   * Setup test environment files
   */
  async setupTestEnvironment() {
    console.log('🌍 Setting up test environment...');

    // Create test environment file
    const testEnvContent = `# Test Environment Configuration
NODE_ENV=test
VITE_TEST_MODE=true

# Test Database
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=test_anon_key
TEST_AUTH_TOKEN=test_auth_token
TEST_USER_ID=test-user-123
TEST_CLINIC_ID=test-clinic-456

# Test API Keys (use test/sandbox keys only)
VITE_TWILIO_ACCOUNT_SID=test_twilio_sid
VITE_TWILIO_AUTH_TOKEN=test_twilio_token
VITE_AZURE_AI_KEY=test_azure_key
VITE_AZURE_AI_ENDPOINT=https://test.cognitiveservices.azure.com/

# Performance Testing
PERFORMANCE_THRESHOLD=100
COVERAGE_THRESHOLD=90
ACCESSIBILITY_THRESHOLD=95

# Load Testing
LOAD_TEST_DURATION=300
LOAD_TEST_USERS=50

# Monitoring (optional)
DATADOG_API_KEY=
SENTRY_DSN=
`;

    fs.writeFileSync('.env.test', testEnvContent);
    console.log('   ✅ Created .env.test');

    // Create test configuration
    const testConfigContent = `{
  "testEnvironment": "jsdom",
  "setupFilesAfterEnv": ["<rootDir>/src/test/setup.ts"],
  "testMatch": [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}"
  ],
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/test/**",
    "!src/**/*.stories.{js,jsx,ts,tsx}"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  },
  "coverageReporters": ["text", "lcov", "json", "html"],
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}`;

    fs.writeFileSync('jest.config.json', testConfigContent);
    console.log('   ✅ Created jest.config.json');
  }

  /**
   * Setup Git hooks for testing
   */
  async setupGitHooks() {
    console.log('🪝 Setting up Git hooks...');

    const hooksDir = path.join('.git', 'hooks');
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Pre-commit hook
    const preCommitHook = `#!/bin/sh
# Pre-commit hook for ClinicBoost

echo "🧪 Running pre-commit tests..."

# Run linting
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix errors before committing."
  exit 1
fi

# Run type checking
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ Type checking failed. Please fix errors before committing."
  exit 1
fi

# Run unit tests
npm run test:unit
if [ $? -ne 0 ]; then
  echo "❌ Unit tests failed. Please fix tests before committing."
  exit 1
fi

# Check test coverage
npm run test:coverage:check
if [ $? -ne 0 ]; then
  echo "❌ Test coverage below threshold. Please add more tests."
  exit 1
fi

echo "✅ Pre-commit checks passed!"
`;

    fs.writeFileSync(path.join(hooksDir, 'pre-commit'), preCommitHook);
    execSync(`chmod +x ${path.join(hooksDir, 'pre-commit')}`);
    console.log('   ✅ Created pre-commit hook');

    // Pre-push hook
    const prePushHook = `#!/bin/sh
# Pre-push hook for ClinicBoost

echo "🚀 Running pre-push tests..."

# Run enhanced testing suite
npm run test:enhanced:unit
if [ $? -ne 0 ]; then
  echo "❌ Enhanced tests failed. Please fix before pushing."
  exit 1
fi

# Run accessibility tests
npm run test:enhanced:a11y
if [ $? -ne 0 ]; then
  echo "❌ Accessibility tests failed. Please fix before pushing."
  exit 1
fi

echo "✅ Pre-push checks passed!"
`;

    fs.writeFileSync(path.join(hooksDir, 'pre-push'), prePushHook);
    execSync(`chmod +x ${path.join(hooksDir, 'pre-push')}`);
    console.log('   ✅ Created pre-push hook');
  }

  /**
   * Setup VS Code configuration
   */
  async setupVSCodeConfig() {
    console.log('💻 Setting up VS Code configuration...');

    const vscodeDir = '.vscode';
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir);
    }

    // Settings
    const settingsContent = `{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "jest.autoRun": "watch",
  "jest.showCoverageOnLoad": true,
  "testing.automaticallyOpenPeekView": "never",
  "files.associations": {
    "*.test.ts": "typescript",
    "*.spec.ts": "typescript"
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}`;

    fs.writeFileSync(path.join(vscodeDir, 'settings.json'), settingsContent);
    console.log('   ✅ Created VS Code settings');

    // Extensions recommendations
    const extensionsContent = `{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "orta.vscode-jest",
    "ms-playwright.playwright",
    "deque-systems.vscode-axe-linter",
    "streetsidesoftware.code-spell-checker"
  ]
}`;

    fs.writeFileSync(path.join(vscodeDir, 'extensions.json'), extensionsContent);
    console.log('   ✅ Created VS Code extensions recommendations');

    // Tasks
    const tasksContent = `{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Run Enhanced Tests",
      "type": "shell",
      "command": "npm run test:enhanced",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Run Unit Tests with Coverage",
      "type": "shell",
      "command": "npm run test:coverage",
      "group": "test",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "Run Accessibility Tests",
      "type": "shell",
      "command": "npm run test:enhanced:a11y",
      "group": "test"
    },
    {
      "label": "Run Performance Tests",
      "type": "shell",
      "command": "npm run test:enhanced:perf",
      "group": "test"
    }
  ]
}`;

    fs.writeFileSync(path.join(vscodeDir, 'tasks.json'), tasksContent);
    console.log('   ✅ Created VS Code tasks');
  }

  /**
   * Setup test databases
   */
  async setupTestDatabases() {
    console.log('🗄️ Setting up test databases...');

    // Create test data directory
    const testDataDir = path.join('src', 'test', 'data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Create mock data generators
    const mockDataContent = `/**
 * Mock data generators for testing
 */

export const createMockPatient = (overrides = {}) => ({
  id: 'patient-' + Math.random().toString(36).substr(2, 9),
  name: 'Test Patient',
  email: 'patient@test.com',
  phone: '555-0123',
  dateOfBirth: '1990-01-01',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  insuranceProvider: 'Test Insurance',
  emergencyContact: {
    name: 'Emergency Contact',
    phone: '555-0124',
    relationship: 'Spouse'
  },
  medicalHistory: [],
  allergies: [],
  medications: [],
  ...overrides
});

export const createMockAppointment = (overrides = {}) => ({
  id: 'appointment-' + Math.random().toString(36).substr(2, 9),
  patientId: 'patient-123',
  clinicId: 'clinic-123',
  providerId: 'provider-123',
  date: new Date().toISOString().split('T')[0],
  time: '10:00',
  duration: 30,
  type: 'consultation',
  status: 'scheduled',
  notes: '',
  ...overrides
});

export const createMockClinic = (overrides = {}) => ({
  id: 'clinic-' + Math.random().toString(36).substr(2, 9),
  name: 'Test Clinic',
  address: '456 Clinic Ave',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  phone: '555-0125',
  email: 'clinic@test.com',
  website: 'https://testclinic.com',
  specialties: ['General Medicine'],
  providers: [],
  ...overrides
});

export const createMockUser = (overrides = {}) => ({
  id: 'user-' + Math.random().toString(36).substr(2, 9),
  email: 'user@test.com',
  name: 'Test User',
  role: 'staff',
  clinicId: 'clinic-123',
  permissions: ['read', 'write'],
  ...overrides
});`;

    fs.writeFileSync(path.join(testDataDir, 'mockData.ts'), mockDataContent);
    console.log('   ✅ Created mock data generators');
  }

  /**
   * Generate test data
   */
  async generateTestData() {
    console.log('📊 Generating test data...');

    const testDataContent = `{
  "patients": [
    {
      "id": "patient-1",
      "name": "John Doe",
      "email": "john.doe@test.com",
      "phone": "555-0101",
      "dateOfBirth": "1985-06-15"
    },
    {
      "id": "patient-2",
      "name": "Jane Smith",
      "email": "jane.smith@test.com",
      "phone": "555-0102",
      "dateOfBirth": "1990-03-22"
    }
  ],
  "appointments": [
    {
      "id": "appointment-1",
      "patientId": "patient-1",
      "date": "2024-01-15",
      "time": "10:00",
      "type": "consultation",
      "status": "scheduled"
    }
  ],
  "clinics": [
    {
      "id": "clinic-1",
      "name": "Test Medical Center",
      "address": "123 Health St",
      "city": "Test City",
      "state": "TS",
      "zipCode": "12345"
    }
  ]
}`;

    fs.writeFileSync(path.join('src', 'test', 'data', 'testData.json'), testDataContent);
    console.log('   ✅ Generated test data');
  }

  /**
   * Validate setup
   */
  async validateSetup() {
    console.log('✅ Validating setup...');

    const validations = [
      { file: '.env.test', description: 'Test environment file' },
      { file: 'jest.config.json', description: 'Jest configuration' },
      { file: '.git/hooks/pre-commit', description: 'Pre-commit hook' },
      { file: '.vscode/settings.json', description: 'VS Code settings' },
      { file: 'src/test/data/mockData.ts', description: 'Mock data generators' }
    ];

    for (const validation of validations) {
      if (fs.existsSync(validation.file)) {
        console.log(`   ✅ ${validation.description}`);
      } else {
        throw new Error(`Missing ${validation.description}: ${validation.file}`);
      }
    }

    // Test npm scripts
    try {
      execSync('npm run test:enhanced -- --help', { stdio: 'pipe' });
      console.log('   ✅ Enhanced testing scripts available');
    } catch (error) {
      console.warn('   ⚠️ Enhanced testing scripts may need npm install');
    }
  }

  /**
   * Print usage instructions
   */
  printUsageInstructions() {
    console.log(`
🎉 Development Testing Environment Ready!

📋 Available Commands:
   npm run test:enhanced              # Run all enhanced tests
   npm run test:enhanced:unit         # Run unit tests only
   npm run test:enhanced:a11y         # Run accessibility tests
   npm run test:enhanced:perf         # Run performance tests
   npm run test:coverage              # Run tests with coverage
   npm run test:watch                 # Run tests in watch mode

🔧 Development Workflow:
   1. Write tests first (TDD approach)
   2. Run tests locally before committing
   3. Git hooks will run automatically
   4. CI/CD pipeline runs on push

📁 Key Files Created:
   .env.test                          # Test environment variables
   jest.config.json                   # Jest configuration
   .git/hooks/pre-commit              # Pre-commit testing
   .vscode/settings.json              # VS Code configuration
   src/test/data/mockData.ts          # Mock data generators

🚀 Next Steps:
   1. Install dependencies: npm install
   2. Run initial test: npm run test:enhanced:unit
   3. Open VS Code and install recommended extensions
   4. Start developing with confidence!

💡 Tips:
   - Use 'npm run test:watch' during development
   - Check coverage with 'npm run test:coverage'
   - Run accessibility tests frequently
   - Monitor performance with each change

📚 Documentation:
   - See ENHANCED_TESTING_IMPLEMENTATION.md for details
   - Check .github/workflows/ for CI/CD configuration
   - Review scripts/ directory for automation tools
`);
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new DevTestingSetup();
  setup.setupDevEnvironment();
}

module.exports = DevTestingSetup;
