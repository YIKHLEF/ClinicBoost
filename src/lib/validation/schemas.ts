import { z } from 'zod';

// Common validation patterns
const phoneRegex = /^\+212[5-7]\d{8}$|^0[5-7]\d{8}$|^[5-7]\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// Custom validation messages
const messages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid Moroccan phone number',
  password: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  positive: 'Must be a positive number',
  future: 'Date must be in the future',
  past: 'Date must be in the past',
};

// User validation schemas
export const userRegistrationSchema = z.object({
  email: z.string()
    .min(1, messages.required)
    .regex(emailRegex, messages.email),
  password: z.string()
    .min(8, messages.minLength(8))
    .regex(passwordRegex, messages.password),
  confirmPassword: z.string(),
  firstName: z.string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  lastName: z.string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  role: z.enum(['admin', 'dentist', 'staff', 'billing']).default('staff'),
  phone: z.string()
    .optional()
    .refine((val) => !val || phoneRegex.test(val), messages.phone),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const userLoginSchema = z.object({
  email: z.string()
    .min(1, messages.required)
    .regex(emailRegex, messages.email),
  password: z.string()
    .min(1, messages.required),
  rememberMe: z.boolean().default(false),
});

export const passwordResetSchema = z.object({
  email: z.string()
    .min(1, messages.required)
    .regex(emailRegex, messages.email),
});

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, messages.required),
  newPassword: z.string()
    .min(8, messages.minLength(8))
    .regex(passwordRegex, messages.password),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Patient validation schemas
export const medicalHistorySchema = z.object({
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  conditions: z.array(z.string()).default([]),
  notes: z.string().max(1000, messages.maxLength(1000)).default(''),
});

export const patientSchema = z.object({
  firstName: z.string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  lastName: z.string()
    .min(1, messages.required)
    .min(2, messages.minLength(2))
    .max(50, messages.maxLength(50)),
  email: z.string()
    .optional()
    .refine((val) => !val || emailRegex.test(val), messages.email),
  phone: z.string()
    .min(1, messages.required)
    .refine((val) => phoneRegex.test(val), messages.phone),
  dateOfBirth: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      return date < today;
    }, messages.past),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().max(200, messages.maxLength(200)).optional(),
  city: z.string().max(100, messages.maxLength(100)).optional(),
  insuranceProvider: z.string().max(100, messages.maxLength(100)).optional(),
  insuranceNumber: z.string().max(50, messages.maxLength(50)).optional(),
  medicalHistory: medicalHistorySchema.optional(),
  notes: z.string().max(1000, messages.maxLength(1000)).optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  riskLevel: z.enum(['low', 'medium', 'high']).default('low'),
});

// Appointment validation schemas
export const appointmentSchema = z.object({
  patientId: z.string().min(1, messages.required),
  dentistId: z.string().min(1, messages.required),
  title: z.string()
    .min(1, messages.required)
    .max(100, messages.maxLength(100)),
  description: z.string().max(500, messages.maxLength(500)).optional(),
  startTime: z.string()
    .min(1, messages.required)
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      return date > now;
    }, messages.future),
  endTime: z.string()
    .min(1, messages.required),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  notes: z.string().max(500, messages.maxLength(500)).optional(),
}).refine((data) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  return end > start;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

// Treatment validation schemas
export const treatmentSchema = z.object({
  name: z.string()
    .min(1, messages.required)
    .max(100, messages.maxLength(100)),
  description: z.string().max(500, messages.maxLength(500)).optional(),
  defaultPrice: z.number()
    .min(0, messages.positive)
    .max(999999.99, 'Price too high'),
  durationMinutes: z.number()
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration cannot exceed 8 hours'),
  isActive: z.boolean().default(true),
});

// Invoice validation schemas
export const invoiceItemSchema = z.object({
  treatmentId: z.string().optional(),
  description: z.string()
    .min(1, messages.required)
    .max(200, messages.maxLength(200)),
  quantity: z.number()
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
  unitPrice: z.number()
    .min(0, messages.positive)
    .max(999999.99, 'Price too high'),
});

export const invoiceSchema = z.object({
  patientId: z.string().min(1, messages.required),
  issueDate: z.string().min(1, messages.required),
  dueDate: z.string()
    .min(1, messages.required)
    .refine((val, ctx) => {
      const issueDate = ctx.parent.issueDate;
      if (!issueDate) return true;
      return new Date(val) >= new Date(issueDate);
    }, 'Due date must be on or after issue date'),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(500, messages.maxLength(500)).optional(),
});

// Payment validation schemas
export const paymentSchema = z.object({
  invoiceId: z.string().min(1, messages.required),
  amount: z.number()
    .min(0.01, 'Amount must be greater than 0')
    .max(999999.99, 'Amount too high'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'check', 'insurance']),
  paymentDate: z.string().optional(),
  notes: z.string().max(500, messages.maxLength(500)).optional(),
});

// Campaign validation schemas
export const campaignSchema = z.object({
  name: z.string()
    .min(1, messages.required)
    .max(100, messages.maxLength(100)),
  description: z.string().max(500, messages.maxLength(500)).optional(),
  messageTemplate: z.string()
    .min(1, messages.required)
    .max(1000, messages.maxLength(1000)),
  targetAudience: z.object({
    ageRange: z.object({
      min: z.number().min(0).max(120).optional(),
      max: z.number().min(0).max(120).optional(),
    }).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    riskLevel: z.enum(['low', 'medium', 'high']).optional(),
    lastVisit: z.object({
      operator: z.enum(['before', 'after']),
      date: z.string(),
    }).optional(),
  }).optional(),
  scheduledAt: z.string().optional(),
});

// Settings validation schemas
export const clinicSettingsSchema = z.object({
  name: z.string()
    .min(1, messages.required)
    .max(100, messages.maxLength(100)),
  address: z.string()
    .min(1, messages.required)
    .max(200, messages.maxLength(200)),
  phone: z.string()
    .min(1, messages.required)
    .refine((val) => phoneRegex.test(val), messages.phone),
  email: z.string()
    .min(1, messages.required)
    .regex(emailRegex, messages.email),
  website: z.string().url('Please enter a valid URL').optional(),
  workingHours: z.object({
    monday: z.object({ start: z.string(), end: z.string(), closed: z.boolean() }),
    tuesday: z.object({ start: z.string(), end: z.string(), closed: z.boolean() }),
    wednesday: z.object({ start: z.string(), end: z.string(), closed: z.boolean() }),
    thursday: z.object({ start: z.string(), end: z.string(), closed: z.boolean() }),
    friday: z.object({ start: z.string(), end: z.string(), closed: z.boolean() }),
    saturday: z.object({ start: z.string(), end: z.string(), closed: z.boolean() }),
    sunday: z.object({ start: z.string(), end: z.string(), closed: z.boolean() }),
  }),
  timezone: z.string().min(1, messages.required),
  currency: z.string().min(1, messages.required),
  taxRate: z.number().min(0).max(1, 'Tax rate must be between 0 and 1'),
});

// Export types
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type PasswordReset = z.infer<typeof passwordResetSchema>;
export type PasswordUpdate = z.infer<typeof passwordUpdateSchema>;
export type Patient = z.infer<typeof patientSchema>;
export type MedicalHistory = z.infer<typeof medicalHistorySchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type Treatment = z.infer<typeof treatmentSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Campaign = z.infer<typeof campaignSchema>;
export type ClinicSettings = z.infer<typeof clinicSettingsSchema>;
