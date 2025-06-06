# Development Setup 🛠️

This guide will help you set up a local development environment for ClinicBoost. Follow these steps to get up and running quickly.

## 📋 Prerequisites

### Required Software
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **VS Code** (recommended) ([Download](https://code.visualstudio.com/))

### Optional Tools
- **Docker** (for containerized development)
- **PostgreSQL** (for local database)
- **Supabase CLI** (for database management)

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space
- **OS**: Windows 10+, macOS 10.15+, or Linux

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/clinicboost.git
cd clinicboost
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit environment variables
nano .env.local  # or use your preferred editor
```

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## ⚙️ Environment Configuration

### Environment Variables
Create a `.env.local` file with the following variables:

```env
# Demo Mode (set to false for production setup)
VITE_DEMO_MODE=true

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration (for payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key

# Twilio Configuration (for messaging)
VITE_TWILIO_ACCOUNT_SID=your_twilio_account_sid
VITE_TWILIO_AUTH_TOKEN=your_twilio_auth_token
VITE_TWILIO_PHONE_NUMBER=+1234567890

# Azure AI Configuration (for analytics)
VITE_AZURE_AI_ENDPOINT=your_azure_ai_endpoint
VITE_AZURE_AI_KEY=your_azure_ai_key

# Application Configuration
VITE_APP_NAME=ClinicBoost
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=development
```

### Demo Mode
For quick setup, you can use demo mode:
```env
VITE_DEMO_MODE=true
```
This uses mock data and doesn't require external services.

## 🗄️ Database Setup

### Option 1: Supabase (Recommended)

#### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy the project URL and anon key

#### 2. Run Migrations
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

#### 3. Seed Database (Optional)
```bash
# Run seed script
npm run db:seed
```

### Option 2: Local PostgreSQL

#### 1. Install PostgreSQL
```bash
# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# Windows
# Download from https://www.postgresql.org/download/windows/
```

#### 2. Create Database
```bash
# Create database
createdb clinicboost_dev

# Run migrations
psql -d clinicboost_dev -f supabase/migrations/*.sql
```

## 🔧 Development Tools

### VS Code Extensions
Install these recommended extensions:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json"
  ]
}
```

### VS Code Settings
Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### Git Hooks
Set up pre-commit hooks:

```bash
# Install husky
npm install --save-dev husky

# Initialize husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
```

## 🧪 Testing Setup

### Unit Tests
```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### E2E Tests
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e -- --headed
```

### Test Configuration
The project uses:
- **Vitest** for unit/integration tests
- **Testing Library** for component testing
- **Playwright** for E2E tests
- **MSW** for API mocking

## 🐳 Docker Development

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Configuration
The project includes:
- `Dockerfile` for production builds
- `docker-compose.yml` for development
- `docker-compose.production.yml` for production

## 📱 Mobile Development

### Testing on Mobile Devices

#### 1. Local Network Access
```bash
# Start dev server with network access
npm run dev -- --host

# Access from mobile device
# http://your-local-ip:5173
```

#### 2. Browser DevTools
- Chrome DevTools device simulation
- Firefox Responsive Design Mode
- Safari Web Inspector

#### 3. Real Device Testing
- Use ngrok for external access
- Test on actual devices
- Use browser dev tools for debugging

## 🔍 Debugging

### Browser DevTools
- **React DevTools**: Component inspection
- **Redux DevTools**: State debugging (if using Redux)
- **Network Tab**: API request monitoring
- **Performance Tab**: Performance profiling

### VS Code Debugging
Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### Error Tracking
- **Console Logs**: Use structured logging
- **Error Boundaries**: Catch React errors
- **Sentry**: Production error tracking

## 🚀 Build and Deployment

### Development Build
```bash
# Type check
npm run type-check

# Lint code
npm run lint

# Build for development
npm run build
```

### Production Build
```bash
# Build for production
npm run build:production

# Preview production build
npm run preview
```

### Environment-Specific Builds
```bash
# Staging build
npm run build:staging

# Production build
npm run build:production
```

## 📊 Performance Monitoring

### Development Tools
```bash
# Bundle analyzer
npm run build:analyze

# Lighthouse audit
npm run performance:audit

# Performance testing
npm run test:performance
```

### Monitoring Setup
- **Web Vitals**: Core performance metrics
- **Lighthouse CI**: Automated performance testing
- **Bundle Analyzer**: Bundle size optimization

## 🔧 Troubleshooting

### Common Issues

#### Node Version Issues
```bash
# Check Node version
node --version

# Use Node Version Manager
nvm install 18
nvm use 18
```

#### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port
npm run dev -- --port 3000
```

#### Module Resolution Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### TypeScript Errors
```bash
# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P -> "TypeScript: Restart TS Server"

# Check TypeScript configuration
npm run type-check
```

### Getting Help
- **GitHub Issues**: Report bugs and issues
- **Discussions**: Ask questions and share ideas
- **Discord**: Real-time community support
- **Documentation**: Comprehensive guides and references

## 📚 Next Steps

After setting up your development environment:

1. **[Architecture Overview](./architecture.md)**: Understand the system design
2. **[Component Library](./components.md)**: Learn about UI components
3. **[Testing Guide](./testing.md)**: Write and run tests
4. **[Contributing Guidelines](./contributing.md)**: Contribute to the project
5. **[Deployment Guide](./deployment.md)**: Deploy your changes

## 🎯 Development Workflow

### Daily Workflow
1. Pull latest changes: `git pull origin main`
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test locally
4. Run tests: `npm run test`
5. Commit changes: `git commit -m "feat: add new feature"`
6. Push branch: `git push origin feature/new-feature`
7. Create pull request

### Code Quality
- Follow TypeScript best practices
- Write tests for new features
- Use semantic commit messages
- Keep components small and focused
- Document complex logic

---

*You're now ready to start developing with ClinicBoost! If you encounter any issues, check the troubleshooting section or reach out to the community.*
