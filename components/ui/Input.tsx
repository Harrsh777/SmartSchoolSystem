'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', value, ...props }, ref) => {
    // Ensure value is always defined to prevent controlled/uncontrolled warning
    const controlledValue = value ?? '';
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#2B2B2B] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-lg border bg-[#FFFFFF] text-[#2B2B2B] ${
            error ? 'border-[#E57373]' : 'border-[#E1E1DB]'
          } focus:outline-none focus:ring-2 focus:ring-[#FFD66B] focus:border-transparent transition-all ${className}`}
          value={controlledValue}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-[#E57373]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
