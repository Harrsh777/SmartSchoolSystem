'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', value, ...props }, ref) => {
    // Ensure value is always defined to prevent controlled/uncontrolled warning
    const controlledValue = value ?? '';
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#2B2B2B] dark:text-[#C8D9E6] mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-[#1e293b] text-[#2B2B2B] dark:text-white ${
            error ? 'border-[#E57373] dark:border-[#E57373]' : 'border-[#E1E1DB] dark:border-[#2F4156]'
          } focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] focus:border-transparent transition-all resize-vertical min-h-[100px] hover:border-[#5A7A95]/50 dark:hover:border-[#6B9BB8]/50 ${className}`}
          value={controlledValue}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-[#E57373] dark:text-[#E57373]">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;

