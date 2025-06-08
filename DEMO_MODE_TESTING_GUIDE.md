# Demo Mode Testing Guide for ClinicBoost

This comprehensive guide covers how to test demo mode functionality in ClinicBoost, ensuring a smooth demonstration experience for potential users and stakeholders.

## 🎯 Overview

Demo mode provides a fully functional version of ClinicBoost with simulated data, allowing users to explore all features without requiring a backend setup. This guide covers testing all aspects of demo mode functionality.

## 🚀 Quick Start

### Enable Demo Mode

```bash
# Method 1: Environment Variable
echo "VITE_DEMO_MODE=true" >> .env.local

# Method 2: Auto-detection (remove Supabase config)
# Comment out VITE_SUPABASE_URL in .env.local

# Restart development server
npm run dev
```

### Run Demo Tests

```bash
# Complete demo mode testing
npm run test:demo

# Unit tests only
npm run test:demo:unit

# Skip UI tests (faster)
npm run test:demo:ui

# Watch mode for development
npm run test:demo:watch
```

## 🧪 Testing Framework

### Automated Testing Suite

The demo mode testing framework includes:

#### **1. Authentication Testing**
- ✅ Valid login with all demo credentials
- ✅ Invalid credential rejection
- ✅ Case-insensitive email handling
- ✅ Session persistence across page reloads
- ✅ Logout functionality
- ✅ Performance benchmarks (<500ms login)

#### **2. Data Persistence Testing**
- ✅ Local storage session management
- ✅ Profile updates persistence
- ✅ Offline storage integration
- ✅ Corrupted session recovery

#### **3. Role-Based Access Testing**
- ✅ Admin role permissions
- ✅ Dentist role permissions
- ✅ Staff role permissions
- ✅ Billing role permissions
- ✅ Role switching functionality

#### **4. UI Component Testing**
- ✅ Demo mode detection
- ✅ Credential availability
- ✅ User interface elements
- ✅ Avatar URL validation

#### **5. Performance Testing**
- ✅ Login speed (<500ms)
- ✅ Session load performance (<100ms)
- ✅ Memory usage optimization
- ✅ Bundle size validation

#### **6. Error Handling Testing**
- ✅ Invalid email format handling
- ✅ Empty credentials rejection
- ✅ Corrupted session recovery
- ✅ Network error simulation

#### **7. Session Management Testing**
- ✅ Multiple tab simulation
- ✅ Session cleanup on logout
- ✅ Cross-tab synchronization

## 🔧 Manual Testing Procedures

### 1. Environment Setup Testing

```bash
# Test 1: Verify demo mode activation
# Expected: Demo mode should be detected automatically

# Check environment detection
curl http://localhost:5173/env-test

# Expected output should show:
# - Demo Mode: Enabled
# - Supabase URL: Not configured or demo URL
```

### 2. Authentication Flow Testing

#### **Test Admin Login**
```
Email: admin@clinicboost.demo
Password: demo123
Expected: Login successful, admin dashboard access
```

#### **Test Dentist Login**
```
Email: dentist@clinicboost.demo
Password: demo123
Expected: Login successful, clinical features access
```

#### **Test Staff Login**
```
Email: staff@clinicboost.demo
Password: demo123
Expected: Login successful, patient management access
```

#### **Test Billing Login**
```
Email: billing@clinicboost.demo
Password: demo123
Expected: Login successful, billing features access
```

#### **Test Invalid Credentials**
```
Email: invalid@email.com
Password: wrongpassword
Expected: Error message "Invalid email or password"
```

### 3. Feature Functionality Testing

#### **Patient Management**
- ✅ View patient list (should show demo patients)
- ✅ Create new patient (should save to local storage)
- ✅ Edit patient information
- ✅ Search and filter patients
- ✅ Patient profile navigation

#### **Appointment Scheduling**
- ✅ View calendar with demo appointments
- ✅ Create new appointments
- ✅ Edit existing appointments
- ✅ Cancel appointments
- ✅ Time slot validation

#### **Billing & Payments**
- ✅ View invoices and payments
- ✅ Create new invoices
- ✅ Process payments (simulated)
- ✅ Generate reports
- ✅ Insurance claim processing

#### **Reports & Analytics**
- ✅ Dashboard metrics display
- ✅ Revenue analytics
- ✅ Patient analytics
- ✅ Appointment statistics
- ✅ Export functionality

### 4. Performance Testing

#### **Load Time Testing**
```bash
# Test initial page load
time curl -s http://localhost:5173 > /dev/null

# Expected: < 2 seconds for initial load
```

#### **Login Performance Testing**
```javascript
// In browser console
const startTime = performance.now();
// Perform login
const endTime = performance.now();
console.log(`Login took ${endTime - startTime}ms`);

// Expected: < 500ms
```

#### **Memory Usage Testing**
```javascript
// In browser console
console.log('Memory usage:', performance.memory);

// Monitor for memory leaks during navigation
```

### 5. Cross-Browser Testing

Test demo mode in multiple browsers:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### 6. Mobile Responsiveness Testing

Test on various screen sizes:
- ✅ Mobile (320px - 768px)
- ✅ Tablet (768px - 1024px)
- ✅ Desktop (1024px+)

## 🎨 UI Testing with Demo Mode Test Panel

### Access the Test Panel

```bash
# Navigate to the test panel
http://localhost:5173/test/demo-mode

# Or add the component to any page
import DemoModeTestPanel from './components/test/DemoModeTestPanel';
```

### Test Panel Features

#### **Environment Status**
- Demo mode enabled/disabled status
- Environment variable detection
- Current user information
- Supabase URL configuration

#### **Quick Actions**
- Credential selector dropdown
- Quick login buttons for each role
- Logout testing
- Comprehensive test runner

#### **Test Results Display**
- Real-time test execution
- Pass/fail indicators
- Performance metrics
- Detailed error messages

#### **Export Functionality**
- JSON test results export
- Comprehensive test reports
- Performance benchmarks

## 📊 Automated Testing Commands

### Unit Tests
```bash
# Run all demo mode unit tests
npm run test:demo:unit

# Run specific test suite
npm run test -- src/test/demo/demo-mode.test.ts

# Run with coverage
npm run test:coverage -- src/test/demo/
```

### Integration Tests
```bash
# Run comprehensive demo mode tests
npm run test:demo

# Run without UI tests (faster)
npm run test:demo:ui

# Generate detailed report
npm run test:demo && open reports/demo-mode-test-report.html
```

### Performance Tests
```bash
# Run performance benchmarks
npm run test:enhanced:perf

# Lighthouse audit in demo mode
npm run performance:audit
```

## 🔍 Debugging Demo Mode Issues

### Common Issues and Solutions

#### **Demo Mode Not Activating**
```bash
# Check environment variables
cat .env.local | grep DEMO

# Verify detection logic
console.log('Demo mode:', import.meta.env.VITE_DEMO_MODE);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
```

#### **Login Failures**
```bash
# Check demo credentials
console.log('Available credentials:', DEMO_CREDENTIALS);

# Verify demo auth service
console.log('Demo auth status:', demoAuth.getIsAuthenticated());
```

#### **Data Not Persisting**
```bash
# Check local storage
console.log('Demo user:', localStorage.getItem('demo_user'));
console.log('Demo auth:', localStorage.getItem('demo_authenticated'));

# Clear corrupted data
localStorage.removeItem('demo_user');
localStorage.removeItem('demo_authenticated');
```

#### **Performance Issues**
```bash
# Check bundle size
npm run build
du -sh dist/

# Analyze bundle
npm run analyze:bundle
```

### Debug Mode Testing

```bash
# Enable debug logging
VITE_DEBUG_MODE=true npm run dev

# Run tests with verbose output
npm run test:demo -- --verbose

# Check browser console for detailed logs
```

## 📈 Performance Benchmarks

### Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial Load | < 2s | Time to interactive |
| Login Speed | < 500ms | Authentication completion |
| Session Load | < 100ms | Page reload with session |
| Bundle Size | < 2MB | Gzipped assets |
| Memory Usage | < 50MB | Runtime memory |

### Monitoring Commands

```bash
# Bundle size analysis
npm run build && npm run analyze:bundle

# Performance audit
npm run performance:audit

# Memory usage monitoring
npm run test:performance
```

## 🚀 Deployment Testing

### Pre-Deployment Checklist

- ✅ All demo mode tests passing
- ✅ Performance benchmarks met
- ✅ Cross-browser compatibility verified
- ✅ Mobile responsiveness confirmed
- ✅ Demo credentials working
- ✅ Error handling tested
- ✅ Session management verified

### Production Demo Testing

```bash
# Build for production
npm run build:production

# Test production build locally
npm run preview:production

# Run demo tests against production build
VITE_DEMO_MODE=true npm run test:demo
```

## 📚 Best Practices

### Demo Data Management
1. **Realistic Data**: Use realistic but anonymized demo data
2. **Consistent State**: Ensure demo data is consistent across sessions
3. **Performance**: Optimize demo data size for fast loading
4. **Variety**: Include diverse scenarios and edge cases

### User Experience
1. **Clear Indicators**: Make it obvious when in demo mode
2. **Guided Tour**: Provide tooltips or guided tours
3. **Reset Functionality**: Allow users to reset demo state
4. **Help Documentation**: Include demo-specific help content

### Testing Strategy
1. **Automated Tests**: Run demo tests in CI/CD pipeline
2. **Manual Testing**: Regular manual testing of demo flows
3. **Performance Monitoring**: Continuous performance monitoring
4. **User Feedback**: Collect feedback from demo users

## 🔄 Continuous Improvement

### Regular Testing Schedule
- **Daily**: Automated unit tests
- **Weekly**: Comprehensive demo mode testing
- **Monthly**: Performance benchmark review
- **Quarterly**: Demo data refresh and UX review

### Metrics to Track
- Demo mode usage analytics
- User engagement in demo mode
- Performance metrics over time
- Error rates and user feedback

### Update Procedures
1. Test demo mode after each feature update
2. Update demo data to reflect new features
3. Verify demo credentials still work
4. Update documentation and guides

---

**Remember**: Demo mode is often the first impression users have of ClinicBoost. Ensure it's always working perfectly and showcases the best features of the application!
