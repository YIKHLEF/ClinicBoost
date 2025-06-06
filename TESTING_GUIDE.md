# Testing Guide

This document provides comprehensive guidelines for testing the ClinicBoost application.

## Overview

Our testing strategy includes:
- **Unit Tests**: Component and function-level testing
- **Integration Tests**: Feature workflow testing
- **End-to-End Tests**: Full user journey testing
- **Performance Tests**: Load and stress testing
- **Accessibility Tests**: WCAG compliance testing

## Test Structure

```
src/
├── test/
│   ├── utils/
│   │   └── test-utils.tsx          # Custom render functions and utilities
│   ├── mocks/
│   │   ├── server.ts               # MSW server setup
│   │   ├── handlers.ts             # API mock handlers
│   │   └── i18n.ts                 # Mock i18n for testing
│   ├── integration/                # Integration tests
│   └── performance/                # Performance tests
├── components/
│   └── __tests__/                  # Component unit tests
e2e/                                # End-to-end tests
```

## Running Tests

### All Tests
```bash
npm run test:all
```

### Unit Tests
```bash
npm run test:unit
npm run test:unit -- --watch    # Watch mode
npm run test:coverage           # With coverage
```

### Integration Tests
```bash
npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e
npm run test:e2e -- --headed     # With browser UI
npm run test:e2e -- --debug      # Debug mode
```

### Performance Tests
```bash
npm run test:performance
```

## Writing Tests

### Unit Tests

Use the custom render function from test-utils:

```typescript
import { render, screen, userEvent } from '../test/utils/test-utils';
import { PatientForm } from '../components/patients/PatientForm';

describe('PatientForm', () => {
  it('validates required fields', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn();
    
    render(<PatientForm onSubmit={mockOnSubmit} onCancel={vi.fn()} />);
    
    await user.click(screen.getByRole('button', { name: /save/i }));
    
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

### Integration Tests

Test complete workflows:

```typescript
import { render, screen, userEvent } from '../utils/test-utils';
import { Patients } from '../../pages/Patients';

describe('Patient Management Integration', () => {
  it('completes patient creation workflow', async () => {
    const user = userEvent.setup();
    
    render(<Patients />, { initialUser: mockUser });
    
    // Navigate through the complete workflow
    await user.click(screen.getByRole('button', { name: /add patient/i }));
    // ... fill form and submit
    // ... verify patient appears in list
  });
});
```

### End-to-End Tests

Test from user perspective:

```typescript
import { test, expect } from '@playwright/test';

test('patient management workflow', async ({ page }) => {
  await page.goto('/patients');
  
  await page.click('[data-testid="add-patient-button"]');
  await page.fill('[data-testid="first-name-input"]', 'John');
  // ... complete workflow
  
  await expect(page.locator('[data-testid="patient-row"]')).toContainText('John');
});
```

### Performance Tests

Test component performance:

```typescript
import { measureRenderTime } from '../utils/test-utils';

describe('Performance Tests', () => {
  it('renders large patient list efficiently', async () => {
    const renderTime = await measureRenderTime(() => {
      render(<PatientList patients={largePatientList} />);
    });
    
    expect(renderTime).toBeLessThan(100); // 100ms threshold
  });
});
```

## Test Data

### Mock Data Generation

Use the provided generators:

```typescript
import { generateMockPatient, generateMockAppointment } from '../test/utils/test-utils';

const patient = generateMockPatient({
  first_name: 'Custom',
  last_name: 'Name'
});

const appointment = generateMockAppointment({
  patient_id: patient.id,
  status: 'confirmed'
});
```

### MSW Handlers

API mocking is handled by MSW. Add new handlers in `src/test/mocks/handlers.ts`:

```typescript
export const handlers = [
  http.get('/api/patients', () => {
    return HttpResponse.json(mockPatients);
  }),
  
  http.post('/api/patients', async ({ request }) => {
    const newPatient = await request.json();
    // Handle creation logic
    return HttpResponse.json(createdPatient, { status: 201 });
  }),
];
```

## Testing Best Practices

### 1. Test Structure (AAA Pattern)
```typescript
it('should do something', async () => {
  // Arrange
  const mockData = generateMockPatient();
  const mockOnSubmit = vi.fn();
  
  // Act
  render(<Component data={mockData} onSubmit={mockOnSubmit} />);
  await user.click(screen.getByRole('button'));
  
  // Assert
  expect(mockOnSubmit).toHaveBeenCalledWith(expectedData);
});
```

### 2. Test User Behavior, Not Implementation
```typescript
// ❌ Bad - testing implementation details
expect(component.state.isLoading).toBe(true);

// ✅ Good - testing user-visible behavior
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

### 3. Use Semantic Queries
```typescript
// ❌ Bad
screen.getByTestId('submit-button');

// ✅ Good
screen.getByRole('button', { name: /submit/i });
```

### 4. Test Accessibility
```typescript
it('should be accessible', () => {
  render(<Component />);
  
  // Check for proper labels
  expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
  
  // Test keyboard navigation
  await user.tab();
  expect(screen.getByLabelText(/first name/i)).toHaveFocus();
});
```

### 5. Mock External Dependencies
```typescript
// Mock API calls
vi.mock('../lib/api', () => ({
  patientService: {
    createPatient: vi.fn(),
    getPatients: vi.fn(),
  },
}));

// Mock timers
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

## Coverage Requirements

Maintain minimum coverage thresholds:
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

## Performance Benchmarks

### Component Rendering
- Simple components: < 10ms
- Complex forms: < 50ms
- Large lists: < 100ms
- Dashboard: < 150ms

### Network Operations
- API calls: < 2s
- File uploads: < 10s
- Data export: < 5s

### Memory Usage
- Component mounting/unmounting: < 5MB increase
- Large dataset processing: < 50MB increase

## Debugging Tests

### Unit/Integration Tests
```bash
# Run specific test file
npm run test -- PatientForm.test.tsx

# Run tests in watch mode
npm run test:watch

# Debug with VS Code
# Add breakpoint and run "Debug Test" in VS Code
```

### E2E Tests
```bash
# Run with browser UI
npm run test:e2e -- --headed

# Debug mode
npm run test:e2e -- --debug

# Run specific test
npm run test:e2e -- --grep "patient management"
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to main/develop branches
- Nightly builds

### Test Reports
- Unit test coverage: Codecov
- E2E test results: Playwright HTML report
- Performance metrics: Custom dashboard
- Lighthouse scores: LHCI

## Common Issues and Solutions

### 1. Flaky Tests
```typescript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// Increase timeout for slow operations
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 10000 });
```

### 2. Memory Leaks
```typescript
// Clean up after tests
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

### 3. Network Timeouts
```typescript
// Increase timeout for network operations
test.setTimeout(30000);

// Mock slow networks
const restoreNetwork = simulateSlowNetwork();
// ... test code
restoreNetwork();
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
