/**
 * Switch Component
 * 
 * A toggle switch component for boolean inputs with accessibility support
 */

import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked,
      defaultChecked,
      onCheckedChange,
      disabled = false,
      required = false,
      name,
      id,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      className,
      size = 'md',
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = React.useState(
      defaultChecked ?? false
    );

    const isControlled = checked !== undefined;
    const isChecked = isControlled ? checked : internalChecked;

    const handleToggle = () => {
      if (disabled) return;

      const newChecked = !isChecked;
      
      if (!isControlled) {
        setInternalChecked(newChecked);
      }
      
      onCheckedChange?.(newChecked);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        handleToggle();
      }
    };

    // Size variants
    const sizeClasses = {
      sm: {
        track: 'h-4 w-7',
        thumb: 'h-3 w-3',
        translate: 'translate-x-3'
      },
      md: {
        track: 'h-5 w-9',
        thumb: 'h-4 w-4',
        translate: 'translate-x-4'
      },
      lg: {
        track: 'h-6 w-11',
        thumb: 'h-5 w-5',
        translate: 'translate-x-5'
      }
    };

    // Color variants
    const variantClasses = {
      default: {
        checked: 'bg-blue-600 dark:bg-blue-500',
        unchecked: 'bg-gray-200 dark:bg-gray-700'
      },
      success: {
        checked: 'bg-green-600 dark:bg-green-500',
        unchecked: 'bg-gray-200 dark:bg-gray-700'
      },
      warning: {
        checked: 'bg-yellow-600 dark:bg-yellow-500',
        unchecked: 'bg-gray-200 dark:bg-gray-700'
      },
      danger: {
        checked: 'bg-red-600 dark:bg-red-500',
        unchecked: 'bg-gray-200 dark:bg-gray-700'
      }
    };

    const sizeConfig = sizeClasses[size];
    const variantConfig = variantClasses[variant];

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-required={required}
        disabled={disabled}
        name={name}
        id={id}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          // Base styles
          'relative inline-flex items-center rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'focus:ring-offset-white dark:focus:ring-offset-gray-900',
          
          // Size
          sizeConfig.track,
          
          // State colors
          isChecked ? variantConfig.checked : variantConfig.unchecked,
          
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer',
          
          className
        )}
        {...props}
      >
        {/* Thumb */}
        <span
          className={cn(
            // Base thumb styles
            'pointer-events-none inline-block rounded-full bg-white shadow-lg',
            'transform ring-0 transition duration-200 ease-in-out',
            
            // Size
            sizeConfig.thumb,
            
            // Position based on state
            isChecked ? sizeConfig.translate : 'translate-x-0'
          )}
        />
        
        {/* Hidden input for form submission */}
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => {}} // Controlled by button click
          name={name}
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };

// Additional compound components for better UX

export interface SwitchLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const SwitchLabel: React.FC<SwitchLabelProps> = ({
  htmlFor,
  children,
  className,
  disabled = false
}) => {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'text-sm font-medium leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        disabled && 'opacity-70 cursor-not-allowed',
        className
      )}
    >
      {children}
    </label>
  );
};

export interface SwitchDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const SwitchDescription: React.FC<SwitchDescriptionProps> = ({
  children,
  className
}) => {
  return (
    <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)}>
      {children}
    </p>
  );
};

// Compound component for complete switch with label and description
export interface SwitchGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const SwitchGroup: React.FC<SwitchGroupProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {children}
    </div>
  );
};

// Example usage component (for documentation)
export const SwitchExample: React.FC = () => {
  const [isEnabled, setIsEnabled] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);

  return (
    <div className="space-y-6 p-6">
      <h3 className="text-lg font-semibold">Switch Examples</h3>
      
      {/* Basic Switch */}
      <SwitchGroup>
        <Switch
          id="basic-switch"
          checked={isEnabled}
          onCheckedChange={setIsEnabled}
        />
        <div className="grid gap-1.5 leading-none">
          <SwitchLabel htmlFor="basic-switch">
            Enable notifications
          </SwitchLabel>
          <SwitchDescription>
            Receive notifications about your account activity.
          </SwitchDescription>
        </div>
      </SwitchGroup>

      {/* Different sizes */}
      <div className="space-y-3">
        <h4 className="font-medium">Sizes</h4>
        <div className="flex items-center space-x-4">
          <Switch size="sm" checked={true} />
          <Switch size="md" checked={true} />
          <Switch size="lg" checked={true} />
        </div>
      </div>

      {/* Different variants */}
      <div className="space-y-3">
        <h4 className="font-medium">Variants</h4>
        <div className="flex items-center space-x-4">
          <Switch variant="default" checked={true} />
          <Switch variant="success" checked={true} />
          <Switch variant="warning" checked={true} />
          <Switch variant="danger" checked={true} />
        </div>
      </div>

      {/* Disabled state */}
      <SwitchGroup>
        <Switch
          id="disabled-switch"
          checked={notifications}
          onCheckedChange={setNotifications}
          disabled
        />
        <div className="grid gap-1.5 leading-none">
          <SwitchLabel htmlFor="disabled-switch" disabled>
            Disabled switch
          </SwitchLabel>
          <SwitchDescription>
            This switch is disabled and cannot be toggled.
          </SwitchDescription>
        </div>
      </SwitchGroup>
    </div>
  );
};

export default Switch;
