'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';

interface FloatingLabelInputProps {
  id: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number';
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  icon?: React.ReactNode;
  placeholder?: string;
  showPasswordToggle?: boolean;
}

export default function FloatingLabelInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  disabled = false,
  autoFocus = false,
  icon,
  placeholder,
  showPasswordToggle = false,
}: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = isFocused || value.length > 0;
  const inputType = type === 'password' && showPassword ? 'text' : type;

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="relative w-full">
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-gray-400">
            {icon}
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full
            ${icon ? 'pl-12' : 'pl-4'}
            ${showPasswordToggle && type === 'password' ? 'pr-12' : 'pr-4'}
            pt-6 pb-2
            bg-transparent
            border-2 rounded-xl
            transition-all duration-200
            outline-none
            ${error
              ? 'border-red-400 focus:border-red-500'
              : isFocused
              ? 'border-blue-500'
              : 'border-gray-300 dark:border-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            text-gray-900 dark:text-gray-100
            placeholder-transparent
          `}
        />

        {/* Password Toggle */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}

        {/* Floating Label */}
        <motion.label
          htmlFor={id}
          animate={{
            y: isActive ? -12 : 0,
            scale: isActive ? 0.85 : 1,
            x: isActive ? (icon ? -8 : 0) : 0,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`
            absolute left-4 top-1/2 -translate-y-1/2
            pointer-events-none
            transition-colors duration-200
            ${isActive
              ? error
                ? 'text-red-500'
                : 'text-blue-500'
              : 'text-gray-500 dark:text-gray-400'
            }
            ${icon ? 'left-12' : ''}
          `}
        >
          {label}
        </motion.label>
      </div>

      {/* Error Message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-red-500 flex items-center gap-1"
        >
          <span>{error}</span>
        </motion.p>
      )}
    </div>
  );
}
