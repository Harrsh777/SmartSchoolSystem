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
          <label className="block text-sm font-medium text-[#475569] dark:text-[#94A3B8] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-lg border bg-white dark:bg-[#1A2332]/50 text-[#1F2937] dark:text-[#F8FAFC] ${
            error ? 'border-[#DC2626] dark:border-[#EF4444]' : 'border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.1)]'
          } focus:outline-none focus:ring-2 focus:ring-[#2C3E50]/20 dark:focus:ring-[#5A879A]/30 focus:border-[#2C3E50]/40 dark:focus:border-[#5A879A]/40 transition-all hover:border-[#2C3E50]/20 dark:hover:border-[rgba(255,255,255,0.15)] ${className}`}
          value={controlledValue}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-[#DC2626] dark:text-[#EF4444]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
