# Component Library 🧩

ClinicBoost uses a comprehensive component library built with React, TypeScript, and Tailwind CSS. This guide covers all available components, their props, and usage examples.

## 📋 Overview

### Design System Principles
- **Consistency**: Uniform design patterns across the application
- **Accessibility**: WCAG 2.1 AA compliance
- **Responsiveness**: Mobile-first responsive design
- **Theming**: Support for light and dark themes
- **Internationalization**: RTL support for Arabic

### Component Categories
- **Base Components**: Fundamental UI elements
- **Form Components**: Input, validation, and form handling
- **Layout Components**: Page structure and navigation
- **Data Display**: Tables, lists, and data visualization
- **Feedback Components**: Notifications, modals, and alerts
- **Domain Components**: Business-specific components

## 🎨 Base Components

### Button
Versatile button component with multiple variants and states.

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  as?: 'button' | 'a' | React.ComponentType;
  children: React.ReactNode;
  onClick?: () => void;
}
```

#### Usage Examples
```tsx
// Primary button
<Button variant="primary" onClick={handleSave}>
  Save Patient
</Button>

// Loading state
<Button variant="primary" loading>
  Saving...
</Button>

// Icon button
<Button variant="outline" size="sm">
  <Plus className="w-4 h-4 mr-2" />
  Add New
</Button>

// Link button
<Button as="a" href="/patients" variant="ghost">
  View All Patients
</Button>
```

#### Variants
- **primary**: Main action buttons (blue background)
- **secondary**: Secondary actions (gray background)
- **outline**: Outlined buttons (transparent with border)
- **ghost**: Minimal buttons (transparent)
- **destructive**: Dangerous actions (red background)

### Input
Flexible input component with validation and accessibility features.

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

#### Usage Examples
```tsx
// Basic input
<Input
  label="Patient Name"
  placeholder="Enter patient name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// Input with validation
<Input
  label="Email Address"
  type="email"
  error={!!errors.email}
  helperText={errors.email?.message}
  leftIcon={<Mail className="w-4 h-4" />}
/>

// Search input
<Input
  placeholder="Search patients..."
  leftIcon={<Search className="w-4 h-4" />}
  rightIcon={
    <Button variant="ghost" size="sm">
      <X className="w-4 h-4" />
    </Button>
  }
/>
```

### Card
Container component for grouping related content.

```typescript
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}
```

#### Usage Examples
```tsx
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Patient Information</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Patient details go here...</p>
  </CardContent>
</Card>

// Card with custom styling
<Card className="border-l-4 border-l-blue-500" shadow="md">
  <div className="p-6">
    <h3 className="font-semibold">Appointment Reminder</h3>
    <p className="text-gray-600">You have an appointment tomorrow.</p>
  </div>
</Card>
```

### Modal
Accessible modal component with backdrop and focus management.

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
}
```

#### Usage Examples
```tsx
// Basic modal
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Add New Patient"
  size="lg"
>
  <PatientForm onSubmit={handleSubmit} />
</Modal>

// Confirmation modal
<Modal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Deletion"
  size="sm"
>
  <div className="space-y-4">
    <p>Are you sure you want to delete this patient?</p>
    <div className="flex justify-end space-x-2">
      <Button variant="outline" onClick={() => setShowConfirm(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </div>
  </div>
</Modal>
```

## 📝 Form Components

### FormField
Wrapper component for form fields with validation.

```typescript
interface FormFieldProps {
  name: string;
  label?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}
```

#### Usage with React Hook Form
```tsx
import { useForm } from 'react-hook-form';

const PatientForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField
        name="firstName"
        label="First Name"
        required
        error={errors.firstName?.message}
      >
        <Input
          {...register('firstName', { required: 'First name is required' })}
          placeholder="Enter first name"
        />
      </FormField>
    </form>
  );
};
```

### Select
Dropdown select component with search and multi-select capabilities.

```typescript
interface SelectProps {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  disabled?: boolean;
}
```

#### Usage Examples
```tsx
// Basic select
<Select
  options={[
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' }
  ]}
  value={gender}
  onChange={setGender}
  placeholder="Select gender"
/>

// Searchable select
<Select
  options={cityOptions}
  value={city}
  onChange={setCity}
  placeholder="Search cities..."
  searchable
/>

// Multi-select
<Select
  options={allergyOptions}
  value={allergies}
  onChange={setAllergies}
  placeholder="Select allergies"
  multiple
/>
```

### DatePicker
Date selection component with calendar interface.

```typescript
interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  format?: string;
}
```

#### Usage Examples
```tsx
// Basic date picker
<DatePicker
  value={birthDate}
  onChange={setBirthDate}
  placeholder="Select birth date"
  maxDate={new Date()} // Can't select future dates
/>

// Appointment date picker
<DatePicker
  value={appointmentDate}
  onChange={setAppointmentDate}
  placeholder="Select appointment date"
  minDate={new Date()} // Can't select past dates
  format="dd/MM/yyyy"
/>
```

## 📊 Data Display Components

### Table
Flexible table component with sorting, filtering, and pagination.

```typescript
interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  sorting?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort: (column: string) => void;
  };
}
```

#### Usage Example
```tsx
const PatientTable = () => {
  const columns = [
    {
      key: 'name',
      title: 'Name',
      render: (patient) => `${patient.first_name} ${patient.last_name}`,
      sortable: true
    },
    {
      key: 'email',
      title: 'Email',
      render: (patient) => patient.email,
      sortable: true
    },
    {
      key: 'phone',
      title: 'Phone',
      render: (patient) => patient.phone
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (patient) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">Edit</Button>
          <Button size="sm" variant="destructive">Delete</Button>
        </div>
      )
    }
  ];

  return (
    <Table
      data={patients}
      columns={columns}
      loading={isLoading}
      pagination={{
        page: currentPage,
        pageSize: 25,
        total: totalPatients,
        onPageChange: setCurrentPage
      }}
      sorting={{
        sortBy: sortColumn,
        sortOrder: sortOrder,
        onSort: handleSort
      }}
    />
  );
};
```

### EmptyState
Component for displaying empty states with actions.

```typescript
interface EmptyStateProps {
  type: 'patients' | 'appointments' | 'invoices' | 'search' | 'generic';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}
```

#### Usage Examples
```tsx
// No patients state
<EmptyState
  type="patients"
  title="No patients found"
  description="Get started by adding your first patient"
  action={{
    label: "Add Patient",
    onClick: () => setShowAddModal(true)
  }}
/>

// Search results empty state
<EmptyState
  type="search"
  title="No results found"
  description="Try adjusting your search criteria"
/>
```

## 🔔 Feedback Components

### Toast
Notification system for user feedback.

```typescript
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

#### Usage with Hook
```tsx
import { useToast } from '../components/ui/Toast';

const PatientForm = () => {
  const { addToast } = useToast();

  const handleSave = async () => {
    try {
      await savePatient(patientData);
      addToast({
        type: 'success',
        title: 'Patient saved',
        description: 'Patient information has been updated successfully'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Save failed',
        description: error.message
      });
    }
  };
};
```

### LoadingSpinner
Loading indicator component.

```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  text?: string;
}
```

#### Usage Examples
```tsx
// Basic spinner
<LoadingSpinner />

// Spinner with text
<LoadingSpinner size="lg" text="Loading patients..." />

// Inline spinner
<Button disabled>
  <LoadingSpinner size="sm" color="white" />
  Saving...
</Button>
```

## 🏗️ Layout Components

### DashboardLayout
Main application layout with navigation.

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}
```

#### Usage Example
```tsx
<DashboardLayout
  title="Patient Management"
  breadcrumbs={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Patients' }
  ]}
  actions={
    <Button variant="primary" onClick={() => setShowAddModal(true)}>
      Add Patient
    </Button>
  }
>
  <PatientList />
</DashboardLayout>
```

### Sidebar
Navigation sidebar component.

```typescript
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType;
  current?: boolean;
  badge?: string | number;
}
```

## 🎯 Domain-Specific Components

### PatientCard
Specialized component for displaying patient information.

```typescript
interface PatientCardProps {
  patient: Patient;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => void;
  onSchedule?: (patient: Patient) => void;
  showActions?: boolean;
}
```

#### Usage Example
```tsx
<PatientCard
  patient={patient}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onSchedule={handleSchedule}
  showActions={userCanEdit}
/>
```

### AppointmentCalendar
Calendar component for appointment scheduling.

```typescript
interface AppointmentCalendarProps {
  appointments: Appointment[];
  onDateSelect: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  view: 'month' | 'week' | 'day';
  onViewChange: (view: string) => void;
}
```

## 🎨 Theming and Customization

### Theme Provider
```tsx
import { ThemeProvider } from '../contexts/ThemeContext';

const App = () => (
  <ThemeProvider>
    <YourApp />
  </ThemeProvider>
);
```

### Custom Styling
```tsx
// Using className prop
<Button className="bg-gradient-to-r from-blue-500 to-purple-600">
  Gradient Button
</Button>

// Using CSS variables
<div style={{ '--primary-color': '#3b82f6' }}>
  <Button variant="primary">Custom Color</Button>
</div>
```

### Dark Mode Support
All components automatically support dark mode:

```tsx
// Components automatically adapt to theme
<Card>
  <CardContent>
    This content adapts to light/dark theme
  </CardContent>
</Card>
```

## ♿ Accessibility Features

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus management in modals and dropdowns
- Skip links for screen readers

### Screen Reader Support
- Proper ARIA labels and descriptions
- Semantic HTML structure
- Live regions for dynamic content

### Color Contrast
- WCAG 2.1 AA compliant color ratios
- High contrast mode support
- Color-blind friendly palette

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile first approach */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Responsive Props
```tsx
// Responsive sizing
<Button size={{ base: 'sm', md: 'md', lg: 'lg' }}>
  Responsive Button
</Button>

// Responsive visibility
<div className="hidden md:block">
  Desktop only content
</div>
```

## 🧪 Testing Components

### Component Testing
```tsx
import { render, screen, userEvent } from '../test/utils/test-utils';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Storybook Integration
```tsx
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading...',
  },
};
```

---

*For more detailed component documentation and live examples, see the [Storybook documentation](https://storybook.clinicboost.com).*
