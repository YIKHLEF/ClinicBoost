// Password policy configuration and validation

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbidCommonPasswords: boolean;
  forbidPersonalInfo: boolean;
  maxRepeatingChars: number;
  minUniqueChars: number;
  expirationDays?: number;
  historyCount?: number;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbidCommonPasswords: true,
  forbidPersonalInfo: true,
  maxRepeatingChars: 3,
  minUniqueChars: 6,
  expirationDays: 90,
  historyCount: 5,
};

export interface PasswordStrength {
  score: number; // 0-100
  level: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
  feedback: string[];
  isValid: boolean;
}

// Common passwords list (subset for demo)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'qwerty123', 'dragon', 'master', 'hello', 'login', 'welcome123',
  'admin123', 'root', 'toor', 'pass', 'test', 'guest', 'info',
  'administrator', 'user', 'demo', 'sample', 'example', 'default',
]);

// Special characters
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export const validatePassword = (
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
  userInfo?: { firstName?: string; lastName?: string; email?: string }
): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  // Length validation
  if (password.length < policy.minLength) {
    feedback.push(`Password must be at least ${policy.minLength} characters long`);
  } else if (password.length >= policy.minLength) {
    score += 10;
  }

  if (password.length > policy.maxLength) {
    feedback.push(`Password must be no more than ${policy.maxLength} characters long`);
  }

  // Character type requirements
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password);

  if (policy.requireUppercase && !hasUppercase) {
    feedback.push('Password must contain at least one uppercase letter');
  } else if (hasUppercase) {
    score += 15;
  }

  if (policy.requireLowercase && !hasLowercase) {
    feedback.push('Password must contain at least one lowercase letter');
  } else if (hasLowercase) {
    score += 15;
  }

  if (policy.requireNumbers && !hasNumbers) {
    feedback.push('Password must contain at least one number');
  } else if (hasNumbers) {
    score += 15;
  }

  if (policy.requireSpecialChars && !hasSpecialChars) {
    feedback.push(`Password must contain at least one special character (${SPECIAL_CHARS})`);
  } else if (hasSpecialChars) {
    score += 15;
  }

  // Character diversity
  const uniqueChars = new Set(password.toLowerCase()).size;
  if (uniqueChars < policy.minUniqueChars) {
    feedback.push(`Password must contain at least ${policy.minUniqueChars} unique characters`);
  } else {
    score += 10;
  }

  // Repeating characters
  const maxRepeating = getMaxRepeatingChars(password);
  if (maxRepeating > policy.maxRepeatingChars) {
    feedback.push(`Password cannot have more than ${policy.maxRepeatingChars} repeating characters in a row`);
  } else {
    score += 5;
  }

  // Common passwords
  if (policy.forbidCommonPasswords && COMMON_PASSWORDS.has(password.toLowerCase())) {
    feedback.push('Password is too common. Please choose a more unique password');
  } else {
    score += 10;
  }

  // Personal information
  if (policy.forbidPersonalInfo && userInfo) {
    const personalTerms = [
      userInfo.firstName?.toLowerCase(),
      userInfo.lastName?.toLowerCase(),
      userInfo.email?.split('@')[0]?.toLowerCase(),
    ].filter(Boolean);

    const containsPersonalInfo = personalTerms.some(term => 
      term && password.toLowerCase().includes(term)
    );

    if (containsPersonalInfo) {
      feedback.push('Password should not contain personal information');
    } else {
      score += 5;
    }
  }

  // Additional complexity scoring
  if (password.length >= 12) score += 5;
  if (password.length >= 16) score += 5;
  if (/[A-Z].*[A-Z]/.test(password)) score += 5; // Multiple uppercase
  if (/\d.*\d/.test(password)) score += 5; // Multiple numbers
  if (hasSpecialChars && password.match(new RegExp(`[${SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g'))?.length >= 2) {
    score += 5; // Multiple special chars
  }

  // Determine strength level
  let level: PasswordStrength['level'];
  if (score < 30) level = 'very-weak';
  else if (score < 50) level = 'weak';
  else if (score < 70) level = 'fair';
  else if (score < 85) level = 'good';
  else level = 'strong';

  const isValid = feedback.length === 0 && score >= 50;

  return {
    score: Math.min(score, 100),
    level,
    feedback,
    isValid,
  };
};

const getMaxRepeatingChars = (password: string): number => {
  let maxRepeating = 1;
  let currentRepeating = 1;

  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      currentRepeating++;
      maxRepeating = Math.max(maxRepeating, currentRepeating);
    } else {
      currentRepeating = 1;
    }
  }

  return maxRepeating;
};

export const generateStrongPassword = (length: number = 12): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let password = '';
  
  // Ensure at least one character from each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += specialChars[Math.floor(Math.random() * specialChars.length)];

  // Fill the rest randomly
  const allChars = uppercase + lowercase + numbers + specialChars;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

export const getPasswordStrengthColor = (level: PasswordStrength['level']): string => {
  switch (level) {
    case 'very-weak': return 'text-red-600';
    case 'weak': return 'text-orange-600';
    case 'fair': return 'text-yellow-600';
    case 'good': return 'text-blue-600';
    case 'strong': return 'text-green-600';
    default: return 'text-gray-600';
  }
};

export const getPasswordStrengthBgColor = (level: PasswordStrength['level']): string => {
  switch (level) {
    case 'very-weak': return 'bg-red-500';
    case 'weak': return 'bg-orange-500';
    case 'fair': return 'bg-yellow-500';
    case 'good': return 'bg-blue-500';
    case 'strong': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export const getPasswordStrengthText = (level: PasswordStrength['level']): string => {
  switch (level) {
    case 'very-weak': return 'Very Weak';
    case 'weak': return 'Weak';
    case 'fair': return 'Fair';
    case 'good': return 'Good';
    case 'strong': return 'Strong';
    default: return 'Unknown';
  }
};

// Password history management (for future implementation)
export interface PasswordHistory {
  userId: string;
  passwordHash: string;
  createdAt: Date;
}

export const isPasswordInHistory = async (
  userId: string,
  newPasswordHash: string,
  historyCount: number = 5
): Promise<boolean> => {
  // This would check against stored password history
  // Implementation depends on your backend storage
  return false;
};

export const addPasswordToHistory = async (
  userId: string,
  passwordHash: string
): Promise<void> => {
  // This would add the password to history and clean up old entries
  // Implementation depends on your backend storage
};

// Password expiration checking
export const isPasswordExpired = (
  lastChanged: Date,
  expirationDays: number = 90
): boolean => {
  const now = new Date();
  const daysSinceChange = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceChange >= expirationDays;
};

export const getDaysUntilExpiration = (
  lastChanged: Date,
  expirationDays: number = 90
): number => {
  const now = new Date();
  const daysSinceChange = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, expirationDays - daysSinceChange);
};
