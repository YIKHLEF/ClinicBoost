import { secureConfig } from '../config/secure-config';
import CryptoJS from 'crypto-js';

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  preventCommonPasswords: boolean;
  preventPersonalInfo: boolean;
  preventRepeatingChars: boolean;
  maxRepeatingChars: number;
  preventSequentialChars: boolean;
  requirePasswordHistory: boolean;
  passwordHistoryCount: number;
  passwordExpiryDays: number;
  preventDictionaryWords: boolean;
  minUniqueChars: number;
  requireMixedCase: boolean;
  preventKeyboardPatterns: boolean;
  minEntropyBits: number;
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  score: number;
  entropy: number;
  estimatedCrackTime: string;
  suggestions: string[];
  compliance: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    specialChars: boolean;
    uniqueChars: boolean;
    noRepeating: boolean;
    noSequential: boolean;
    noCommon: boolean;
    noPersonal: boolean;
    noDictionary: boolean;
    noKeyboard: boolean;
  };
}

export interface UserInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  dateOfBirth?: string;
  phone?: string;
}

// Comprehensive common passwords list
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'dragon',
  'master', 'hello', 'freedom', 'whatever', 'qazwsx', 'trustno1',
  'jordan', 'harley', 'robert', 'matthew', 'daniel', 'andrew',
  'joshua', 'anthony', 'william', 'david', 'charles', 'thomas',
  'password1', 'qwerty123', 'welcome123', 'admin123', 'root',
  'toor', 'pass', 'test', 'guest', 'info', 'administrator',
  'user', 'demo', 'sample', 'example', 'default', 'login',
  'superman', 'batman', 'football', 'baseball', 'basketball',
  'princess', 'sunshine', 'iloveyou', 'lovely', 'flower',
  'computer', 'internet', 'service', 'server', 'network',
  'system', 'program', 'database', 'security', 'access',
]);

// Dictionary words (common English words)
const DICTIONARY_WORDS = new Set([
  'about', 'above', 'abuse', 'actor', 'acute', 'admit', 'adopt', 'adult',
  'after', 'again', 'agent', 'agree', 'ahead', 'alarm', 'album', 'alert',
  'alien', 'align', 'alike', 'alive', 'allow', 'alone', 'along', 'alter',
  'among', 'anger', 'angle', 'angry', 'apart', 'apple', 'apply', 'arena',
  'argue', 'arise', 'array', 'arrow', 'aside', 'asset', 'avoid', 'awake',
  'award', 'aware', 'badly', 'baker', 'bases', 'basic', 'beach', 'began',
  'begin', 'being', 'below', 'bench', 'billy', 'birth', 'black', 'blame',
  'blind', 'block', 'blood', 'board', 'boost', 'booth', 'bound', 'brain',
  'brand', 'brass', 'brave', 'bread', 'break', 'breed', 'brief', 'bring',
  'broad', 'broke', 'brown', 'build', 'built', 'buyer', 'cable', 'calif',
  'house', 'world', 'school', 'state', 'family', 'student', 'group',
  'country', 'problem', 'service', 'company', 'number', 'people',
]);

// Keyboard patterns
const KEYBOARD_PATTERNS = [
  'qwerty', 'qwertyuiop', 'asdf', 'asdfghjkl', 'zxcv', 'zxcvbnm',
  'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
  'asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl',
  'zxc', 'xcv', 'cvb', 'vbn', 'bnm',
  '1234', '2345', '3456', '4567', '5678', '6789', '7890',
  'abcd', 'bcde', 'cdef', 'defg', 'efgh', 'fghi', 'ghij',
];

export class EnhancedPasswordPolicy {
  private policy: PasswordPolicy;

  constructor(customPolicy?: Partial<PasswordPolicy>) {
    const securityConfig = secureConfig.getSecurityConfig();
    
    this.policy = {
      minLength: securityConfig.passwordMinLength || 12,
      maxLength: 128,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      minSpecialChars: 2,
      preventCommonPasswords: true,
      preventPersonalInfo: true,
      preventRepeatingChars: true,
      maxRepeatingChars: 2,
      preventSequentialChars: true,
      requirePasswordHistory: true,
      passwordHistoryCount: 8,
      passwordExpiryDays: 90,
      preventDictionaryWords: true,
      minUniqueChars: 8,
      requireMixedCase: true,
      preventKeyboardPatterns: true,
      minEntropyBits: 50,
      ...customPolicy,
    };
  }

  /**
   * Comprehensive password validation
   */
  validatePassword(password: string, userInfo?: UserInfo, passwordHistory?: string[]): PasswordValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Initialize compliance tracking
    const compliance = {
      length: false,
      uppercase: false,
      lowercase: false,
      numbers: false,
      specialChars: false,
      uniqueChars: false,
      noRepeating: false,
      noSequential: false,
      noCommon: false,
      noPersonal: false,
      noDictionary: false,
      noKeyboard: false,
    };

    // Length validation
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    } else {
      compliance.length = true;
      score += 15;
      if (password.length >= 16) score += 5;
      if (password.length >= 20) score += 5;
    }

    if (password.length > this.policy.maxLength) {
      errors.push(`Password must not exceed ${this.policy.maxLength} characters`);
    }

    // Character type requirements
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>[\]\\;'`~_+=\-]/.test(password);
    const specialCharCount = (password.match(/[!@#$%^&*(),.?":{}|<>[\]\\;'`~_+=\-]/g) || []).length;

    if (this.policy.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (hasLowercase) {
      compliance.lowercase = true;
      score += 10;
    }

    if (this.policy.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (hasUppercase) {
      compliance.uppercase = true;
      score += 10;
    }

    if (this.policy.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number');
    } else if (hasNumbers) {
      compliance.numbers = true;
      score += 10;
    }

    if (this.policy.requireSpecialChars && !hasSpecialChars) {
      errors.push('Password must contain at least one special character');
    } else if (hasSpecialChars) {
      compliance.specialChars = true;
      score += 10;
    }

    if (this.policy.requireSpecialChars && specialCharCount < this.policy.minSpecialChars) {
      errors.push(`Password must contain at least ${this.policy.minSpecialChars} special characters`);
    } else if (specialCharCount >= this.policy.minSpecialChars) {
      score += 5;
    }

    // Mixed case requirement
    if (this.policy.requireMixedCase && hasUppercase && hasLowercase) {
      const upperCount = (password.match(/[A-Z]/g) || []).length;
      const lowerCount = (password.match(/[a-z]/g) || []).length;
      if (upperCount >= 2 && lowerCount >= 2) {
        score += 5;
      }
    }

    // Unique character validation
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (uniqueChars < this.policy.minUniqueChars) {
      errors.push(`Password must contain at least ${this.policy.minUniqueChars} unique characters`);
    } else {
      compliance.uniqueChars = true;
      score += 10;
    }

    // Repeating characters check
    if (this.policy.preventRepeatingChars) {
      const hasExcessiveRepeating = this.hasExcessiveRepeatingChars(password);
      if (hasExcessiveRepeating) {
        errors.push(`Password must not have more than ${this.policy.maxRepeatingChars} consecutive repeating characters`);
      } else {
        compliance.noRepeating = true;
        score += 5;
      }
    }

    // Sequential characters check
    if (this.policy.preventSequentialChars) {
      const hasSequential = this.hasSequentialChars(password);
      if (hasSequential) {
        warnings.push('Password contains sequential characters which may be easier to guess');
        suggestions.push('Avoid sequential characters like "123" or "abc"');
      } else {
        compliance.noSequential = true;
        score += 5;
      }
    }

    // Common passwords check
    if (this.policy.preventCommonPasswords) {
      const isCommon = this.isCommonPassword(password);
      if (isCommon) {
        errors.push('Password is too common. Please choose a more unique password');
        suggestions.push('Avoid common passwords like "password123" or "qwerty"');
      } else {
        compliance.noCommon = true;
        score += 10;
      }
    }

    // Personal information check
    if (this.policy.preventPersonalInfo && userInfo) {
      const containsPersonal = this.containsPersonalInfo(password, userInfo);
      if (containsPersonal) {
        errors.push('Password must not contain personal information');
        suggestions.push('Avoid using your name, email, or birth date in your password');
      } else {
        compliance.noPersonal = true;
        score += 5;
      }
    }

    // Dictionary words check
    if (this.policy.preventDictionaryWords) {
      const containsDictionary = this.containsDictionaryWords(password);
      if (containsDictionary) {
        warnings.push('Password contains dictionary words');
        suggestions.push('Consider using a passphrase or adding numbers/symbols to dictionary words');
      } else {
        compliance.noDictionary = true;
        score += 5;
      }
    }

    // Keyboard patterns check
    if (this.policy.preventKeyboardPatterns) {
      const hasKeyboardPattern = this.hasKeyboardPatterns(password);
      if (hasKeyboardPattern) {
        warnings.push('Password contains keyboard patterns');
        suggestions.push('Avoid keyboard patterns like "qwerty" or "asdf"');
      } else {
        compliance.noKeyboard = true;
        score += 5;
      }
    }

    // Password history check
    if (this.policy.requirePasswordHistory && passwordHistory) {
      const isInHistory = this.isInPasswordHistory(password, passwordHistory);
      if (isInHistory) {
        errors.push('Password has been used recently. Please choose a different password');
      }
    }

    // Calculate entropy
    const entropy = this.calculateEntropy(password);
    if (entropy < this.policy.minEntropyBits) {
      warnings.push(`Password entropy is low (${entropy.toFixed(1)} bits). Consider making it more complex.`);
    } else {
      score += 10;
    }

    // Estimate crack time
    const estimatedCrackTime = this.estimateCrackTime(entropy);

    // Determine strength
    const strength = this.determineStrength(score, entropy, errors.length);

    // Add general suggestions
    if (strength === 'very-weak' || strength === 'weak') {
      suggestions.push('Consider using a longer password with mixed character types');
      suggestions.push('Try using a passphrase with multiple words separated by symbols');
    }

    if (suggestions.length === 0 && warnings.length === 0 && errors.length === 0) {
      suggestions.push('Your password meets all security requirements!');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      strength,
      score: Math.min(100, score),
      entropy,
      estimatedCrackTime,
      suggestions,
      compliance,
    };
  }

  /**
   * Check for excessive repeating characters
   */
  private hasExcessiveRepeatingChars(password: string): boolean {
    let count = 1;
    let maxCount = 1;
    
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        count++;
        maxCount = Math.max(maxCount, count);
      } else {
        count = 1;
      }
    }
    
    return maxCount > this.policy.maxRepeatingChars;
  }

  /**
   * Check for sequential characters
   */
  private hasSequentialChars(password: string): boolean {
    const sequences = [
      '0123456789',
      'abcdefghijklmnopqrstuvwxyz',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ];
    
    const lowerPassword = password.toLowerCase();
    
    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        const reverseSubseq = subseq.split('').reverse().join('');
        
        if (lowerPassword.includes(subseq) || lowerPassword.includes(reverseSubseq)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check if password is common
   */
  private isCommonPassword(password: string): boolean {
    return COMMON_PASSWORDS.has(password.toLowerCase());
  }

  /**
   * Check if password contains personal information
   */
  private containsPersonalInfo(password: string, userInfo: UserInfo): boolean {
    const lowerPassword = password.toLowerCase();
    
    const personalTerms = [
      userInfo.firstName?.toLowerCase(),
      userInfo.lastName?.toLowerCase(),
      userInfo.email?.split('@')[0]?.toLowerCase(),
      userInfo.username?.toLowerCase(),
      userInfo.phone?.replace(/\D/g, ''),
    ].filter(Boolean);

    if (userInfo.dateOfBirth) {
      const birthDate = new Date(userInfo.dateOfBirth);
      personalTerms.push(
        birthDate.getFullYear().toString(),
        birthDate.getMonth().toString().padStart(2, '0'),
        birthDate.getDate().toString().padStart(2, '0')
      );
    }
    
    return personalTerms.some(term => term && lowerPassword.includes(term));
  }

  /**
   * Check for dictionary words
   */
  private containsDictionaryWords(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    
    for (const word of DICTIONARY_WORDS) {
      if (word.length >= 4 && lowerPassword.includes(word)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check for keyboard patterns
   */
  private hasKeyboardPatterns(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    
    for (const pattern of KEYBOARD_PATTERNS) {
      if (lowerPassword.includes(pattern) || lowerPassword.includes(pattern.split('').reverse().join(''))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if password is in history
   */
  private isInPasswordHistory(password: string, passwordHistory: string[]): boolean {
    const hashedPassword = CryptoJS.SHA256(password).toString();
    return passwordHistory.includes(hashedPassword);
  }

  /**
   * Calculate password entropy
   */
  private calculateEntropy(password: string): number {
    let charsetSize = 0;
    
    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/\d/.test(password)) charsetSize += 10;
    if (/[!@#$%^&*(),.?":{}|<>[\]\\;'`~_+=\-]/.test(password)) charsetSize += 32;
    
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  /**
   * Estimate crack time based on entropy
   */
  private estimateCrackTime(entropy: number): string {
    const guessesPerSecond = 1e12; // 1 trillion guesses per second (modern hardware)
    const secondsToCrack = Math.pow(2, entropy - 1) / guessesPerSecond;
    
    if (secondsToCrack < 1) return 'Instantly';
    if (secondsToCrack < 60) return 'Less than a minute';
    if (secondsToCrack < 3600) return `${Math.round(secondsToCrack / 60)} minutes`;
    if (secondsToCrack < 86400) return `${Math.round(secondsToCrack / 3600)} hours`;
    if (secondsToCrack < 31536000) return `${Math.round(secondsToCrack / 86400)} days`;
    if (secondsToCrack < 31536000000) return `${Math.round(secondsToCrack / 31536000)} years`;
    return 'Centuries';
  }

  /**
   * Determine password strength
   */
  private determineStrength(score: number, entropy: number, errorCount: number): PasswordValidationResult['strength'] {
    if (errorCount > 0) return 'very-weak';
    if (entropy < 25 || score <= 20) return 'weak';
    if (entropy < 40 || score <= 40) return 'fair';
    if (entropy < 60 || score <= 60) return 'good';
    if (entropy < 80 || score <= 80) return 'strong';
    return 'very-strong';
  }

  /**
   * Generate secure password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';
    
    let charset = '';
    let password = '';
    
    // Ensure at least one character from each required type
    if (this.policy.requireLowercase) {
      charset += lowercase;
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    
    if (this.policy.requireUppercase) {
      charset += uppercase;
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    
    if (this.policy.requireNumbers) {
      charset += numbers;
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }
    
    if (this.policy.requireSpecialChars) {
      charset += symbols;
      for (let i = 0; i < this.policy.minSpecialChars; i++) {
        password += symbols[Math.floor(Math.random() * symbols.length)];
      }
    }
    
    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Get password policy
   */
  getPolicy(): PasswordPolicy {
    return { ...this.policy };
  }

  /**
   * Update password policy
   */
  updatePolicy(newPolicy: Partial<PasswordPolicy>): void {
    this.policy = { ...this.policy, ...newPolicy };
  }
}

// Export singleton instance
export const enhancedPasswordPolicy = new EnhancedPasswordPolicy();

// Export convenience function
export function validatePassword(password: string, userInfo?: UserInfo, passwordHistory?: string[]): PasswordValidationResult {
  return enhancedPasswordPolicy.validatePassword(password, userInfo, passwordHistory);
}
