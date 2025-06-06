# Contributing Guidelines 🤝

Thank you for your interest in contributing to ClinicBoost! This guide will help you get started with contributing to our dental practice management system.

## 📋 Overview

ClinicBoost is an open-source project that welcomes contributions from developers of all skill levels. Whether you're fixing bugs, adding features, improving documentation, or helping with translations, your contributions are valuable.

### Types of Contributions
- 🐛 **Bug fixes**: Fix issues and improve stability
- ✨ **New features**: Add functionality and enhancements
- 📚 **Documentation**: Improve guides and API docs
- 🌍 **Translations**: Add support for new languages
- 🧪 **Testing**: Write tests and improve coverage
- 🎨 **UI/UX**: Improve design and user experience

## 🚀 Getting Started

### Prerequisites
Before contributing, ensure you have:
- Node.js 18+ installed
- Git configured with your GitHub account
- Basic knowledge of React, TypeScript, and Tailwind CSS
- Familiarity with the project structure

### Development Setup
1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/clinicboost.git
   cd clinicboost
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/clinicboost.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Start development server**:
   ```bash
   npm run dev
   ```

For detailed setup instructions, see the [Development Setup Guide](./setup.md).

## 🔄 Contribution Workflow

### 1. Find or Create an Issue
- **Browse existing issues**: Check [GitHub Issues](https://github.com/your-username/clinicboost/issues)
- **Create new issue**: For bugs or feature requests
- **Discuss first**: For major changes, discuss in issues or discussions

### 2. Create a Branch
```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/issue-description
```

### 3. Make Your Changes
- Follow the [code style guidelines](#code-style)
- Write tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 4. Commit Your Changes
Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Feature
git commit -m "feat(patients): add bulk patient import functionality"

# Bug fix
git commit -m "fix(appointments): resolve scheduling conflict detection"

# Documentation
git commit -m "docs(api): update patient API examples"

# Tests
git commit -m "test(billing): add invoice generation tests"
```

#### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create Pull Request
```bash
# Push your branch
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## 📝 Pull Request Guidelines

### PR Title Format
Use the same format as commit messages:
```
feat(patients): add bulk patient import functionality
```

### PR Description Template
```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented, particularly in hard-to-understand areas
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### Review Process
1. **Automated checks**: CI/CD pipeline runs tests and linting
2. **Code review**: Maintainers review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged

## 🎨 Code Style Guidelines

### TypeScript Standards
```typescript
// ✅ Good: Use explicit types
interface PatientData {
  firstName: string;
  lastName: string;
  email?: string;
}

// ❌ Bad: Avoid any type
const patientData: any = { ... };

// ✅ Good: Use proper naming conventions
const isPatientActive = true;
const patientCount = 10;

// ❌ Bad: Unclear naming
const flag = true;
const num = 10;
```

### React Component Guidelines
```typescript
// ✅ Good: Functional component with proper typing
interface PatientCardProps {
  patient: Patient;
  onEdit: (patient: Patient) => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onEdit }) => {
  return (
    <div className="patient-card">
      {/* Component content */}
    </div>
  );
};

// ✅ Good: Use custom hooks for logic
const usePatientData = (patientId: string) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  // Hook logic
  return { patient, loading, error };
};
```

### CSS/Tailwind Guidelines
```tsx
// ✅ Good: Use Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">

// ✅ Good: Group related classes
<button className={cn(
  "px-4 py-2 rounded-md font-medium transition-colors",
  "bg-blue-500 text-white hover:bg-blue-600",
  "disabled:opacity-50 disabled:cursor-not-allowed"
)}>

// ❌ Bad: Inline styles (avoid when possible)
<div style={{ padding: '16px', backgroundColor: 'white' }}>
```

### File Organization
```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── patients/        # Domain-specific components
│   └── __tests__/       # Component tests
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configurations
├── pages/               # Page components
└── utils/               # Helper functions
```

## 🧪 Testing Guidelines

### Test Structure
```typescript
// Component test example
describe('PatientForm', () => {
  it('should validate required fields', async () => {
    // Arrange
    const mockOnSubmit = vi.fn();
    render(<PatientForm onSubmit={mockOnSubmit} />);

    // Act
    await user.click(screen.getByRole('button', { name: /save/i }));

    // Assert
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
```

### Testing Requirements
- **Unit tests**: For utility functions and hooks
- **Component tests**: For React components
- **Integration tests**: For feature workflows
- **E2E tests**: For critical user journeys

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

## 📚 Documentation Guidelines

### Code Documentation
```typescript
/**
 * Creates a new patient record in the database
 * @param patientData - The patient information to create
 * @param clinicId - The clinic ID to associate the patient with
 * @returns Promise resolving to the created patient
 * @throws {ValidationError} When patient data is invalid
 * @throws {DuplicateError} When patient already exists
 */
export const createPatient = async (
  patientData: PatientInsert,
  clinicId: string
): Promise<Patient> => {
  // Implementation
};
```

### README Updates
- Update feature lists when adding new functionality
- Add new environment variables to setup instructions
- Update screenshots if UI changes significantly

### API Documentation
- Document new endpoints in `/docs/api/`
- Include request/response examples
- Document error codes and responses

## 🌍 Internationalization

### Adding Translations
1. **Add translation keys** to locale files:
   ```json
   // src/i18n/locales/en.json
   {
     "patients": {
       "add_patient": "Add Patient",
       "patient_name": "Patient Name"
     }
   }
   ```

2. **Use translation hook** in components:
   ```typescript
   const { t } = useTranslation();
   
   return (
     <button>{t('patients.add_patient')}</button>
   );
   ```

### RTL Support
- Test components with Arabic language
- Ensure proper text alignment and layout
- Use logical CSS properties when possible

## 🐛 Bug Reports

### Bug Report Template
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OS: [e.g. Windows 10, macOS 11.0]
- Browser: [e.g. Chrome 91.0, Firefox 89.0]
- ClinicBoost Version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

## ✨ Feature Requests

### Feature Request Template
```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## 🏆 Recognition

### Contributors
All contributors are recognized in:
- GitHub contributors list
- Project documentation
- Release notes for significant contributions

### Contribution Levels
- **First-time contributor**: Welcome badge and guidance
- **Regular contributor**: Recognition in monthly updates
- **Core contributor**: Invitation to maintainer discussions
- **Maintainer**: Full repository access and responsibilities

## 📞 Getting Help

### Communication Channels
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Discord**: Real-time chat with the community
- **Email**: maintainers@clinicboost.com

### Mentorship
New contributors can request mentorship:
- Pair programming sessions
- Code review guidance
- Architecture discussions
- Career advice

## 📜 Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Expected Behavior
- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement
Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at conduct@clinicboost.com.

---

*Thank you for contributing to ClinicBoost! Your efforts help improve dental practice management for clinics worldwide.*
