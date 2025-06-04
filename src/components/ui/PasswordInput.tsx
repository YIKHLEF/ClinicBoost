import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, Check, X } from 'lucide-react';
import { 
  validatePassword, 
  generateStrongPassword,
  getPasswordStrengthColor,
  getPasswordStrengthBgColor,
  getPasswordStrengthText,
  DEFAULT_PASSWORD_POLICY,
  type PasswordPolicy,
  type PasswordStrength 
} from '../../lib/password-policy';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  showStrengthIndicator?: boolean;
  showGenerateButton?: boolean;
  policy?: PasswordPolicy;
  userInfo?: { firstName?: string; lastName?: string; email?: string };
  className?: string;
  error?: string;
  label?: string;
  id?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter password',
  disabled = false,
  required = false,
  showStrengthIndicator = true,
  showGenerateButton = false,
  policy = DEFAULT_PASSWORD_POLICY,
  userInfo,
  className = '',
  error,
  label,
  id,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (value && showStrengthIndicator) {
      const passwordStrength = validatePassword(value, policy, userInfo);
      setStrength(passwordStrength);
    } else {
      setStrength(null);
    }
  }, [value, policy, userInfo, showStrengthIndicator]);

  const handleGeneratePassword = async () => {
    setIsGenerating(true);
    
    // Add a small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newPassword = generateStrongPassword(Math.max(12, policy.minLength));
    onChange(newPassword);
    setIsGenerating(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getStrengthBarWidth = () => {
    if (!strength) return 0;
    return strength.score;
  };

  const inputClasses = `
    w-full px-3 py-2 pr-12 border rounded-md
    bg-white dark:bg-gray-700 
    text-gray-900 dark:text-white
    placeholder-gray-500 dark:placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
    disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-500 focus:ring-red-500' 
      : 'border-gray-300 dark:border-gray-600'
    }
    ${className}
  `.trim();

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClasses}
          autoComplete="new-password"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
          {showGenerateButton && (
            <button
              type="button"
              onClick={handleGeneratePassword}
              disabled={disabled || isGenerating}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              title="Generate strong password"
            >
              <RefreshCw 
                size={16} 
                className={isGenerating ? 'animate-spin' : ''} 
              />
            </button>
          )}
          
          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <X size={14} className="mr-1" />
          {error}
        </p>
      )}

      {showStrengthIndicator && value && strength && (
        <div className="space-y-2">
          {/* Strength bar */}
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthBgColor(strength.level)}`}
                style={{ width: `${getStrengthBarWidth()}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${getPasswordStrengthColor(strength.level)}`}>
              {getPasswordStrengthText(strength.level)}
            </span>
          </div>

          {/* Requirements checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
            <div className="flex items-center space-x-1">
              {value.length >= policy.minLength ? (
                <Check size={12} className="text-green-500" />
              ) : (
                <X size={12} className="text-red-500" />
              )}
              <span className={value.length >= policy.minLength ? 'text-green-600' : 'text-red-600'}>
                At least {policy.minLength} characters
              </span>
            </div>

            {policy.requireUppercase && (
              <div className="flex items-center space-x-1">
                {/[A-Z]/.test(value) ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <X size={12} className="text-red-500" />
                )}
                <span className={/[A-Z]/.test(value) ? 'text-green-600' : 'text-red-600'}>
                  Uppercase letter
                </span>
              </div>
            )}

            {policy.requireLowercase && (
              <div className="flex items-center space-x-1">
                {/[a-z]/.test(value) ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <X size={12} className="text-red-500" />
                )}
                <span className={/[a-z]/.test(value) ? 'text-green-600' : 'text-red-600'}>
                  Lowercase letter
                </span>
              </div>
            )}

            {policy.requireNumbers && (
              <div className="flex items-center space-x-1">
                {/\d/.test(value) ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <X size={12} className="text-red-500" />
                )}
                <span className={/\d/.test(value) ? 'text-green-600' : 'text-red-600'}>
                  Number
                </span>
              </div>
            )}

            {policy.requireSpecialChars && (
              <div className="flex items-center space-x-1">
                {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value) ? (
                  <Check size={12} className="text-green-500" />
                ) : (
                  <X size={12} className="text-red-500" />
                )}
                <span className={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(value) ? 'text-green-600' : 'text-red-600'}>
                  Special character
                </span>
              </div>
            )}
          </div>

          {/* Feedback messages */}
          {strength.feedback.length > 0 && (
            <div className="space-y-1">
              {strength.feedback.map((feedback, index) => (
                <p key={index} className="text-xs text-amber-600 dark:text-amber-400 flex items-center">
                  <X size={12} className="mr-1 flex-shrink-0" />
                  {feedback}
                </p>
              ))}
            </div>
          )}

          {/* Success message */}
          {strength.isValid && (
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center">
              <Check size={12} className="mr-1" />
              Password meets all requirements
            </p>
          )}
        </div>
      )}
    </div>
  );
};
