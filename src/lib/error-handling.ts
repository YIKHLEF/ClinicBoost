import { PostgrestError } from '@supabase/supabase-js';
import { ZodError } from 'zod';

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userMessage: string;
}

export class CustomError extends Error {
  code: string;
  details?: any;
  userMessage: string;

  constructor(code: string, message: string, userMessage: string, details?: any) {
    super(message);
    this.name = 'CustomError';
    this.code = code;
    this.userMessage = userMessage;
    this.details = details;
  }
}

// Error codes
export const ERROR_CODES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_EMAIL_NOT_CONFIRMED: 'AUTH_EMAIL_NOT_CONFIRMED',
  AUTH_PASSWORD_TOO_WEAK: 'AUTH_PASSWORD_TOO_WEAK',
  AUTH_EMAIL_ALREADY_EXISTS: 'AUTH_EMAIL_ALREADY_EXISTS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Database errors
  DB_CONNECTION_ERROR: 'DB_CONNECTION_ERROR',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  DB_RECORD_NOT_FOUND: 'DB_RECORD_NOT_FOUND',
  DB_DUPLICATE_ENTRY: 'DB_DUPLICATE_ENTRY',
  DB_FOREIGN_KEY_VIOLATION: 'DB_FOREIGN_KEY_VIOLATION',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',

  // Business logic errors
  BUSINESS_APPOINTMENT_CONFLICT: 'BUSINESS_APPOINTMENT_CONFLICT',
  BUSINESS_PATIENT_INACTIVE: 'BUSINESS_PATIENT_INACTIVE',
  BUSINESS_INVOICE_ALREADY_PAID: 'BUSINESS_INVOICE_ALREADY_PAID',
  BUSINESS_INSUFFICIENT_BALANCE: 'BUSINESS_INSUFFICIENT_BALANCE',

  // External service errors
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  SMS_SERVICE_ERROR: 'SMS_SERVICE_ERROR',
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',

  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
  [ERROR_CODES.AUTH_USER_NOT_FOUND]: 'No account found with this email address.',
  [ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED]: 'Please check your email and click the confirmation link.',
  [ERROR_CODES.AUTH_PASSWORD_TOO_WEAK]: 'Password is too weak. Please choose a stronger password.',
  [ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS]: 'An account with this email already exists.',
  [ERROR_CODES.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
  [ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to perform this action.',

  [ERROR_CODES.DB_CONNECTION_ERROR]: 'Unable to connect to the database. Please try again later.',
  [ERROR_CODES.DB_CONSTRAINT_VIOLATION]: 'The data violates database constraints.',
  [ERROR_CODES.DB_RECORD_NOT_FOUND]: 'The requested record was not found.',
  [ERROR_CODES.DB_DUPLICATE_ENTRY]: 'A record with this information already exists.',
  [ERROR_CODES.DB_FOREIGN_KEY_VIOLATION]: 'Cannot delete this record as it\'s referenced by other data.',

  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.VALIDATION_REQUIRED_FIELD]: 'This field is required.',
  [ERROR_CODES.VALIDATION_INVALID_FORMAT]: 'Please enter a valid format.',
  [ERROR_CODES.VALIDATION_OUT_OF_RANGE]: 'Value is out of acceptable range.',

  [ERROR_CODES.BUSINESS_APPOINTMENT_CONFLICT]: 'This appointment time conflicts with another appointment.',
  [ERROR_CODES.BUSINESS_PATIENT_INACTIVE]: 'This patient account is inactive.',
  [ERROR_CODES.BUSINESS_INVOICE_ALREADY_PAID]: 'This invoice has already been paid.',
  [ERROR_CODES.BUSINESS_INSUFFICIENT_BALANCE]: 'Insufficient balance for this transaction.',

  [ERROR_CODES.PAYMENT_GATEWAY_ERROR]: 'Payment processing failed. Please try again.',
  [ERROR_CODES.SMS_SERVICE_ERROR]: 'Failed to send SMS. Please try again later.',
  [ERROR_CODES.EMAIL_SERVICE_ERROR]: 'Failed to send email. Please try again later.',

  [ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ERROR_CODES.SERVER_ERROR]: 'Server error. Please try again later.',

  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

// Error parsing functions
export const parseSupabaseError = (error: PostgrestError): AppError => {
  let code = ERROR_CODES.UNKNOWN_ERROR;
  let userMessage = ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];

  // Map Supabase error codes to our error codes
  switch (error.code) {
    case 'PGRST116': // No rows returned
      code = ERROR_CODES.DB_RECORD_NOT_FOUND;
      userMessage = ERROR_MESSAGES[ERROR_CODES.DB_RECORD_NOT_FOUND];
      break;
    case '23505': // Unique violation
      code = ERROR_CODES.DB_DUPLICATE_ENTRY;
      userMessage = ERROR_MESSAGES[ERROR_CODES.DB_DUPLICATE_ENTRY];
      break;
    case '23503': // Foreign key violation
      code = ERROR_CODES.DB_FOREIGN_KEY_VIOLATION;
      userMessage = ERROR_MESSAGES[ERROR_CODES.DB_FOREIGN_KEY_VIOLATION];
      break;
    case '23514': // Check violation
      code = ERROR_CODES.DB_CONSTRAINT_VIOLATION;
      userMessage = ERROR_MESSAGES[ERROR_CODES.DB_CONSTRAINT_VIOLATION];
      break;
    default:
      if (error.message.includes('connection')) {
        code = ERROR_CODES.DB_CONNECTION_ERROR;
        userMessage = ERROR_MESSAGES[ERROR_CODES.DB_CONNECTION_ERROR];
      }
  }

  return {
    code,
    message: error.message,
    details: error,
    timestamp: new Date(),
    userMessage,
  };
};

export const parseAuthError = (error: any): AppError => {
  let code = ERROR_CODES.UNKNOWN_ERROR;
  let userMessage = ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];

  if (error.message) {
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid login credentials')) {
      code = ERROR_CODES.AUTH_INVALID_CREDENTIALS;
      userMessage = ERROR_MESSAGES[ERROR_CODES.AUTH_INVALID_CREDENTIALS];
    } else if (message.includes('email not confirmed')) {
      code = ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED;
      userMessage = ERROR_MESSAGES[ERROR_CODES.AUTH_EMAIL_NOT_CONFIRMED];
    } else if (message.includes('password is too weak')) {
      code = ERROR_CODES.AUTH_PASSWORD_TOO_WEAK;
      userMessage = ERROR_MESSAGES[ERROR_CODES.AUTH_PASSWORD_TOO_WEAK];
    } else if (message.includes('user already registered')) {
      code = ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS;
      userMessage = ERROR_MESSAGES[ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS];
    } else if (message.includes('jwt expired')) {
      code = ERROR_CODES.AUTH_SESSION_EXPIRED;
      userMessage = ERROR_MESSAGES[ERROR_CODES.AUTH_SESSION_EXPIRED];
    }
  }

  return {
    code,
    message: error.message || 'Authentication error',
    details: error,
    timestamp: new Date(),
    userMessage,
  };
};

export const parseValidationError = (error: ZodError): AppError => {
  const firstError = error.errors[0];
  
  return {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: error.message,
    details: error.errors,
    timestamp: new Date(),
    userMessage: firstError?.message || ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR],
  };
};

export const parseNetworkError = (error: any): AppError => {
  let code = ERROR_CODES.NETWORK_ERROR;
  let userMessage = ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR];

  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    code = ERROR_CODES.TIMEOUT_ERROR;
    userMessage = ERROR_MESSAGES[ERROR_CODES.TIMEOUT_ERROR];
  } else if (error.status >= 500) {
    code = ERROR_CODES.SERVER_ERROR;
    userMessage = ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR];
  }

  return {
    code,
    message: error.message || 'Network error',
    details: error,
    timestamp: new Date(),
    userMessage,
  };
};

// Main error handler
export const handleError = (error: any): AppError => {
  console.error('Error occurred:', error);

  // Handle different error types
  if (error instanceof ZodError) {
    return parseValidationError(error);
  }

  if (error instanceof CustomError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date(),
      userMessage: error.userMessage,
    };
  }

  // Supabase errors
  if (error.code && typeof error.code === 'string') {
    return parseSupabaseError(error);
  }

  // Auth errors
  if (error.status === 401 || error.message?.includes('auth')) {
    return parseAuthError(error);
  }

  // Network errors
  if (error.status || error.name === 'NetworkError' || error.name === 'TimeoutError') {
    return parseNetworkError(error);
  }

  // Default error
  return {
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: error.message || 'Unknown error',
    details: error,
    timestamp: new Date(),
    userMessage: ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
  };
};

// Error logging
export const logError = (error: AppError, context?: string) => {
  const logData = {
    ...error,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };

  // In production, send to logging service (Sentry, LogRocket, etc.)
  if (import.meta.env.PROD) {
    // Example: Sentry.captureException(error, { extra: logData });
    console.error('Production error:', logData);
  } else {
    console.error('Development error:', logData);
  }
};

// Enhanced network request with timeout
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

// Enhanced fetch with timeout and retry
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }

    throw error;
  }
};

// Retry mechanism
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i === maxRetries) {
        throw error;
      }

      // Don't retry on certain errors
      const appError = handleError(error);
      if ([
        ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        ERROR_CODES.VALIDATION_ERROR,
        ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
      ].includes(appError.code as any)) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError;
};

// Enhanced error handling with monitoring
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  EXTERNAL_SERVICE = 'external_service',
  PERFORMANCE = 'performance'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  url?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  breadcrumbs?: ErrorBreadcrumb[];
}

export interface ErrorBreadcrumb {
  timestamp: Date;
  category: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface EnhancedAppError extends AppError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  recoverable: boolean;
  retryable: boolean;
  reportable: boolean;
}

class ErrorMonitor {
  private errorQueue: EnhancedAppError[] = [];
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private errorReporters: ((error: EnhancedAppError) => Promise<void>)[] = [];

  constructor() {
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createEnhancedError(
        'UNHANDLED_PROMISE_REJECTION',
        'Unhandled promise rejection',
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        { originalError: event.reason }
      );
      this.handleError(error);
    });

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      const error = this.createEnhancedError(
        'JAVASCRIPT_ERROR',
        event.message,
        ErrorCategory.SYSTEM,
        ErrorSeverity.HIGH,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      );
      this.handleError(error);
    });
  }

  createEnhancedError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    details?: any,
    context?: Partial<ErrorContext>
  ): EnhancedAppError {
    const errorId = this.generateErrorId();
    const timestamp = new Date();

    const fullContext: ErrorContext = {
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      requestId: this.generateRequestId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stackTrace: new Error().stack,
      breadcrumbs: [...this.breadcrumbs],
      ...context
    };

    return {
      id: errorId,
      code,
      message,
      userMessage: this.getUserFriendlyMessage(code),
      details,
      timestamp,
      category,
      severity,
      context: fullContext,
      recoverable: this.isRecoverable(category, severity),
      retryable: this.isRetryable(category),
      reportable: this.isReportable(severity)
    };
  }

  async handleError(error: EnhancedAppError): Promise<void> {
    this.errorQueue.push(error);
    this.logError(error);

    this.addBreadcrumb({
      timestamp: new Date(),
      category: 'error',
      message: `Error occurred: ${error.code}`,
      level: 'error',
      data: { errorId: error.id, code: error.code }
    });

    if (error.reportable) {
      await this.reportError(error);
    }
  }

  addBreadcrumb(breadcrumb: ErrorBreadcrumb): void {
    this.breadcrumbs.push(breadcrumb);

    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  private async reportError(error: EnhancedAppError): Promise<void> {
    for (const reporter of this.errorReporters) {
      try {
        await reporter(error);
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError);
      }
    }
  }

  private logError(error: EnhancedAppError): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = `[${error.code}] ${error.message}`;

    switch (logLevel) {
      case 'error':
        console.error(logMessage, error);
        break;
      case 'warn':
        console.warn(logMessage, error);
        break;
      default:
        console.log(logMessage, error);
    }

    this.storeErrorLocally(error);
  }

  private storeErrorLocally(error: EnhancedAppError): void {
    try {
      const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      storedErrors.push({
        ...error,
        timestamp: error.timestamp.toISOString()
      });

      if (storedErrors.length > 100) {
        storedErrors.splice(0, storedErrors.length - 100);
      }

      localStorage.setItem('app_errors', JSON.stringify(storedErrors));
    } catch (storageError) {
      console.error('Failed to store error locally:', storageError);
    }
  }

  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      default:
        return 'log';
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    return undefined; // Integrate with auth system
  }

  private getSessionId(): string | undefined {
    return undefined; // Integrate with session management
  }

  private getUserFriendlyMessage(code: string): string {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
  }

  private isRecoverable(category: ErrorCategory, severity: ErrorSeverity): boolean {
    if (severity === ErrorSeverity.CRITICAL) return false;

    const recoverableCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.PERFORMANCE
    ];

    return recoverableCategories.includes(category);
  }

  private isRetryable(category: ErrorCategory): boolean {
    const retryableCategories = [
      ErrorCategory.NETWORK,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorCategory.DATABASE
    ];

    return retryableCategories.includes(category);
  }

  private isReportable(severity: ErrorSeverity): boolean {
    return [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(severity);
  }

  addErrorReporter(reporter: (error: EnhancedAppError) => Promise<void>): void {
    this.errorReporters.push(reporter);
  }

  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recentErrors: EnhancedAppError[];
  } {
    const errorsByCategory = {} as Record<ErrorCategory, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    this.errorQueue.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    return {
      totalErrors: this.errorQueue.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: this.errorQueue.slice(-10)
    };
  }

  clearErrors(): void {
    this.errorQueue = [];
    this.breadcrumbs = [];
  }

  getStoredErrors(): EnhancedAppError[] {
    try {
      const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      return storedErrors.map((error: any) => ({
        ...error,
        timestamp: new Date(error.timestamp)
      }));
    } catch (error) {
      console.error('Failed to retrieve stored errors:', error);
      return [];
    }
  }
}

export const errorMonitor = new ErrorMonitor();

// Export enhanced error handling components
export { integrationErrorHandler } from './error-handling/integration-errors';
export { EnhancedNetworkHandler } from './error-handling/enhanced-network-handling';

// Export enhanced service components
export { enhancedSupabase, supabaseQuery, supabaseMutate, supabaseAuth } from './supabase/enhanced-client';
export { EnhancedUploadHandler } from './file-upload/enhanced-upload-handler';
export { enhancedPaymentProcessor, EnhancedPaymentProcessor } from './payment/enhanced-payment-processor';
export { enhancedSyncService, EnhancedSyncService } from './offline/enhanced-sync-service';
export {
  enhancedServiceWrapper,
  executeStripeOperation,
  executeTwilioOperation,
  executeAzureAIOperation,
  executeUploadOperation
} from './integrations/enhanced-service-wrapper';
